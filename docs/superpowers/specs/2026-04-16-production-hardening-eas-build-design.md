# Production Hardening + EAS Build — Design Spec

**Date:** 2026-04-16  
**Approach:** B — Bug fixes (commit 1) then EAS build config (commit 2)

---

## Overview

Tikli is a paluwagan (rotating savings club) app built on React Native + Expo, Convex, and a Hono/Cloudflare Workers API layer. This spec covers two sequential deliverables:

1. Fix all bugs and edge cases found during a full codebase audit before production launch.
2. Configure EAS Build for both Android (APK) and iOS (IPA) production artifacts.

---

## Commit 1 — Bug Fixes & Edge Case Hardening

### 1.1 Critical: `bulkMarkPayments` double-counts `totalCollected`

**File:** `packages/backend/convex/payments.ts`  
**Problem:** The loop reads `cycle.totalCollected` inside each iteration without waiting for the previous write to land. All iterations read the same stale value, so only the last write survives instead of all amounts accumulating.  
**Fix:** Group payment updates by `cycleId`. For each cycle touched, fetch the cycle once, sum the delta for all payments in that cycle, then patch once.

### 1.2 Critical: `markPayment` double-counts on re-mark

**File:** `packages/backend/convex/payments.ts`  
**Problem:** If an organizer marks a payment `paid`, then marks it `paid` again (e.g. accidental double-tap), `totalCollected` is incremented twice.  
**Fix:** Before incrementing `totalCollected`, check the payment's *previous* status. Only increment if the previous status was **not** `paid` and **not** `late` (i.e., was not already counted toward the total).

### 1.3 Critical: `completeCycle` has no backend payment-completeness guard

**File:** `packages/backend/convex/cycles.ts`  
**Problem:** The UI gates the "Complete Cycle" button on `canCompleteCycle` (all payments non-pending), but the backend mutation has no equivalent check. A direct API call can complete a cycle with pending payments, corrupting the group's state.  
**Fix:** In `completeCycle`, query all payments for the cycle and throw if any have `status === "pending"`.

### 1.4 Minor: `getById` is unauthenticated

**File:** `packages/backend/convex/groups.ts`  
**Problem:** Any authenticated Convex user can read any group by ID without being a member.  
**Fix:** In `getById`, check that the caller is an active member of the group before returning data. Return `null` if not a member.

### 1.5 Minor: `useCurrentUser` fragile upsert loop

**File:** `apps/native/hooks/useCurrentUser.ts`  
**Problem:** The `useEffect` depends on `convexProfile`, which changes after `upsertUser` runs, potentially re-triggering the effect in a tight loop if the phone equality check ever fails to short-circuit.  
**Fix:** Add a `hasSynced` ref. Set it to `true` after the first successful upsert. Only run the effect if `!hasSynced.current`.

### 1.6 Minor: `onboardingStore` stale `startDate` on reset

**File:** `apps/native/store/onboardingStore.ts`  
**Problem:** `DEFAULT_FORM.startDate` is `new Date()` evaluated at module load time. After a long session, `reset()` restores a stale date.  
**Fix:** Change `reset` to set `startDate: new Date()` at call time rather than referencing the module-level constant.

### 1.7 Minor: `verify.tsx` auto-submit has no in-flight guard

**File:** `apps/native/app/(auth)/verify.tsx`  
**Problem:** When all 6 OTP digits are filled, `handleVerify` is called immediately. If `fetchStatus` flips slowly, a second auto-submit can fire.  
**Fix:** Add an `isVerifying` ref. Set on first call, bail early if already set.

### 1.8 Minor: `payments.tsx` cycle-complete response not checked

**File:** `apps/native/app/(app)/groups/[groupId]/payments.tsx`  
**Problem:** `handleCompleteCycle` calls `fetch` but never checks `res.ok`, so silent failures show no error to the user.  
**Fix:** Add `if (!res.ok) throw new Error(...)` matching the pattern used in `handleMark`.

### 1.9 Minor: History screen misses removed members as recipients

**File:** `apps/native/app/(app)/groups/[groupId]/history.tsx`  
**Problem:** `listForGroup` in `members.ts` only returns `active` members. The history screen looks up recipient by `recipientMemberId` from this list. If the recipient was removed after receiving their payout, they won't be found and the card shows no name.  
**Fix:** Add a `listAllForGroup` query (or modify `listForGroup` with an `includeRemoved` flag) that returns all members regardless of status. History screen uses this variant.

### 1.10 Note: CORS wildcard

**File:** `packages/api/src/index.ts`  
**Problem:** `origin: ["*"]` is too permissive for production.  
**Fix:** Replace with the production Cloudflare Worker URL. Leave a comment noting the value should come from env.

---

## Commit 2 — EAS Build Configuration

### 2.1 `eas.json` — Fill placeholders and add `runtimeVersion`

**File:** `apps/native/eas.json`

The following values must be filled with real credentials:
- `preview.env.EXPO_PUBLIC_API_URL` → production/staging Cloudflare Worker URL
- `production.env.EXPO_PUBLIC_API_URL` → production Cloudflare Worker URL
- `submit.production.ios.appleId` → Apple ID email
- `submit.production.ios.ascAppId` → App Store Connect app ID
- `submit.production.ios.appleTeamId` → Apple Developer team ID
- `submit.production.android.serviceAccountKeyPath` → path to `google-service-account.json`

Add `runtimeVersion: { policy: "appVersion" }` to the `production` build profile so OTA updates are gated to matching app versions.

### 2.2 `app.json` — Android push notification config

**File:** `apps/native/app.json`

Add `"googleServicesFile": "./google-services.json"` under the `android` key. This file is needed for FCM push notifications in production Android builds. The file itself is gitignored and provided at build time via EAS secrets or local placement.

### 2.3 EAS Build commands

Production build commands (to be run by the user after credentials are filled):

```bash
# Android AAB (for Play Store) or APK (for direct install)
eas build --platform android --profile production

# iOS IPA (for App Store / TestFlight)
eas build --platform ios --profile production

# Both simultaneously
eas build --platform all --profile production
```

For the APK (direct install, not Play Store), use:

```bash
eas build --platform android --profile preview
```

### 2.4 EAS Submit (after build)

```bash
eas submit --platform android --latest
eas submit --platform ios --latest
```

---

## Architecture Notes

- All mutation side-effects go through the Hono API layer (auth-verified). Direct Convex client mutations from the frontend are used only for reads (`useQuery`) and the `upsertUser` call from `useCurrentUser`.
- The `bulkMarkPayments` fix must maintain Convex's OCC (optimistic concurrency control) guarantees — grouping by cycleId and doing a single patch per cycle is the correct pattern.
- `getById` auth fix: because Convex queries run in a read-only context, the auth check is additive and does not affect existing callers who are valid members.

---

## Success Criteria

**Bug fixes:**
- [ ] `bulkMarkPayments` accumulates correctly for all payments in one call
- [ ] Marking a payment `paid` twice does not double-count `totalCollected`
- [ ] `completeCycle` rejects if any payment is still `pending`
- [ ] `getById` returns `null` for non-members
- [ ] `useCurrentUser` does not loop after initial sync
- [ ] Resetting the group creation form always gives today's date
- [ ] OTP verify cannot fire twice for the same code entry
- [ ] Completing a cycle shows an error alert if the API call fails
- [ ] History screen shows recipient name even if they were later removed

**EAS Build:**
- [ ] `eas.json` has no placeholder strings
- [ ] `runtimeVersion` policy is set
- [ ] `app.json` has `googleServicesFile` for Android
- [ ] `eas build --platform all --profile production` completes without error
- [ ] APK and IPA artifacts are downloadable from the EAS dashboard
