# Production Hardening + EAS Build Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all data-integrity bugs and edge cases found in the codebase audit, then configure EAS Build to produce production APK and IPA artifacts.

**Architecture:** Two sequential commits — Commit 1 patches backend Convex mutations and frontend screens; Commit 2 updates `eas.json` and `app.json` for production builds. All Convex backend fixes are in `packages/backend/convex/`. All frontend fixes are in `apps/native/`.

**Tech Stack:** Convex (TypeScript mutations/queries), React Native + Expo, Hono/Cloudflare Workers (API layer), Clerk (auth), EAS Build (Expo Application Services)

---

## File Map

| File | Change |
|------|--------|
| `packages/backend/convex/payments.ts` | Fix `bulkMarkPayments` stale-read bug; fix `markPayment` re-mark double-count |
| `packages/backend/convex/cycles.ts` | Add payment-completeness guard to `completeCycle` |
| `packages/backend/convex/groups.ts` | Add member-auth check to `getById` |
| `packages/backend/convex/members.ts` | Add `listAllForGroup` query (includes removed members) |
| `apps/native/hooks/useCurrentUser.ts` | Add `hasSynced` ref to prevent upsert loop |
| `apps/native/store/onboardingStore.ts` | Fix stale `startDate` on reset |
| `apps/native/app/(auth)/verify.tsx` | Add `isVerifying` ref guard on auto-submit |
| `apps/native/app/(app)/groups/[groupId]/payments.tsx` | Check `res.ok` in `handleCompleteCycle` |
| `apps/native/app/(app)/groups/[groupId]/history.tsx` | Use `listAllForGroup` so removed recipients render |
| `packages/api/src/index.ts` | Replace CORS wildcard with env-driven origin |
| `apps/native/eas.json` | Add `runtimeVersion`, fill placeholder structure |
| `apps/native/app.json` | Add `googleServicesFile` under `android` |

---

## Task 1: Fix `bulkMarkPayments` stale-read bug

**Files:**
- Modify: `packages/backend/convex/payments.ts`

The current loop calls `ctx.db.patch` on each cycle inside a per-payment loop. Each iteration reads `cycle.totalCollected` before the previous patch is reflected, so all reads see the same old value. The fix groups payments by `cycleId`, computes the total delta per cycle, and patches each cycle exactly once.

- [ ] **Step 1: Open `packages/backend/convex/payments.ts` and replace `bulkMarkPayments`**

Replace the entire `bulkMarkPayments` mutation handler with:

```typescript
export const bulkMarkPayments = mutation({
  args: {
    paymentIds: v.array(v.id("payments")),
    status: v.union(v.literal("paid"), v.literal("late"), v.literal("excused")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const now = Date.now();
    // Track delta per cycle: cycleId -> additional amount to add
    const cycleDeltas = new Map<string, number>();

    for (const paymentId of args.paymentIds) {
      const payment = await ctx.db.get(paymentId);
      if (!payment) continue;

      const group = await ctx.db.get(payment.groupId);
      if (!group || user._id !== group.organizerId) continue;

      // Only count toward totalCollected if not already counted
      const wasAlreadyCounted =
        payment.status === "paid" || payment.status === "late";
      const willBeCounted = args.status === "paid" || args.status === "late";

      await ctx.db.patch(paymentId, {
        status: args.status,
        markedByUserId: user._id,
        markedAt: now,
      });

      if (!wasAlreadyCounted && willBeCounted) {
        const existing = cycleDeltas.get(payment.cycleId) ?? 0;
        cycleDeltas.set(payment.cycleId, existing + payment.amount);
      }
    }

    // Apply all cycle deltas in a single patch per cycle
    for (const [cycleId, delta] of cycleDeltas) {
      const cycle = await ctx.db.get(cycleId as never);
      if (cycle) {
        await ctx.db.patch(cycleId as never, {
          totalCollected: cycle.totalCollected + delta,
        });
      }
    }
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

---

## Task 2: Fix `markPayment` re-mark double-count

**Files:**
- Modify: `packages/backend/convex/payments.ts`

Currently `markPayment` always adds `payment.amount` to `totalCollected` if the new status is `paid` or `late`, even if the payment was already `paid`. The fix reads the old status before patching.

- [ ] **Step 1: Update the `totalCollected` increment block in `markPayment`**

Find this block in the `markPayment` handler (around line 43):

```typescript
    // Update cycle totalCollected
    if (args.status === "paid" || args.status === "late") {
      const cycle = await ctx.db.get(payment.cycleId);
      if (cycle) {
        await ctx.db.patch(payment.cycleId, {
          totalCollected: cycle.totalCollected + payment.amount,
        });
      }
    }
```

Replace with:

```typescript
    // Update cycle totalCollected — only if not already counted
    const wasAlreadyCounted =
      payment.status === "paid" || payment.status === "late";
    const willBeCounted = args.status === "paid" || args.status === "late";

    if (!wasAlreadyCounted && willBeCounted) {
      const cycle = await ctx.db.get(payment.cycleId);
      if (cycle) {
        await ctx.db.patch(payment.cycleId, {
          totalCollected: cycle.totalCollected + payment.amount,
        });
      }
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit both payment fixes**

```bash
cd packages/backend
git add convex/payments.ts
git commit -m "fix: prevent double-counting totalCollected in markPayment and bulkMarkPayments"
```

---

## Task 3: Add backend payment-completeness guard to `completeCycle`

**Files:**
- Modify: `packages/backend/convex/cycles.ts`

The backend currently allows completing a cycle even if payments are still `pending`. Add an explicit check.

- [ ] **Step 1: Add the pending-payment check inside `completeCycle`**

After the `if (!user || user._id !== group.organizerId) throw new Error("Not authorized");` line (around line 26 of `cycles.ts`), add:

```typescript
    // Guard: cannot complete a cycle with pending payments
    const cyclePayments = await ctx.db
      .query("payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
    const hasPending = cyclePayments.some((p) => p.status === "pending");
    if (hasPending) throw new Error("All payments must be resolved before completing the cycle");
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/cycles.ts
git commit -m "fix: block completeCycle when payments are still pending"
```

---

## Task 4: Add member-auth check to `getById`

**Files:**
- Modify: `packages/backend/convex/groups.ts`

`getById` currently returns the full group document to any authenticated user. Add a membership check.

- [ ] **Step 1: Replace `getById` in `groups.ts`**

Replace the current `getById`:

```typescript
export const getById = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.groupId);
  },
});
```

With:

```typescript
export const getById = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();
    if (!membership || membership.status !== "active") return null;

    return await ctx.db.get(args.groupId);
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/groups.ts
git commit -m "fix: restrict getById to active group members only"
```

---

## Task 5: Add `listAllForGroup` query to members (includes removed)

**Files:**
- Modify: `packages/backend/convex/members.ts`

The history screen needs to show recipient names even for members who were later removed. Add a new query that returns all members regardless of status.

- [ ] **Step 1: Add `listAllForGroup` to `members.ts`**

Append after the existing `listForGroup` export:

```typescript
export const listAllForGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const withUsers = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      }),
    );

    return withUsers.sort((a, b) => a.rotationOrder - b.rotationOrder);
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/members.ts
git commit -m "feat: add listAllForGroup query including removed members"
```

---

## Task 6: Use `listAllForGroup` in history screen

**Files:**
- Modify: `apps/native/app/(app)/groups/[groupId]/history.tsx`

- [ ] **Step 1: Update the `useQuery` call in history.tsx**

Find line 18:

```typescript
  const members = useQuery(api.members.listForGroup, { groupId: groupId as never });
```

Replace with:

```typescript
  const members = useQuery(api.members.listAllForGroup, { groupId: groupId as never });
```

- [ ] **Step 2: Verify TypeScript compiles in the native app**

```bash
cd apps/native && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd apps/native
git add "app/(app)/groups/[groupId]/history.tsx"
git commit -m "fix: show recipient name in history even after member removal"
```

---

## Task 7: Fix `useCurrentUser` upsert loop

**Files:**
- Modify: `apps/native/hooks/useCurrentUser.ts`

- [ ] **Step 1: Replace the hook implementation**

Replace the entire file content with:

```typescript
import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@tikli/backend/convex/_generated/api";

/**
 * Ensures the signed-in Clerk user has a corresponding Convex user record.
 * Should be called once in a top-level protected layout.
 */
export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const convexProfile = useQuery(api.users.getProfile);
  const upsertUser = useMutation(api.users.upsertUser);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSynced.current) return;

    const phoneNumber = user.phoneNumbers[0]?.phoneNumber ?? "";
    const clerkId = user.id;

    if (!convexProfile || convexProfile.phoneNumber !== phoneNumber) {
      hasSynced.current = true;
      void upsertUser({
        clerkId,
        phoneNumber,
        displayName: user.fullName ?? undefined,
      });
    } else {
      // Profile already matches — no upsert needed
      hasSynced.current = true;
    }
  }, [isLoaded, user, convexProfile, upsertUser]);

  return {
    clerkUser: user,
    convexProfile,
    isLoaded: isLoaded && convexProfile !== undefined,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/native && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useCurrentUser.ts
git commit -m "fix: prevent useCurrentUser from triggering repeated upserts"
```

---

## Task 8: Fix stale `startDate` in onboardingStore reset

**Files:**
- Modify: `apps/native/store/onboardingStore.ts`

- [ ] **Step 1: Update the `reset` action in `onboardingStore.ts`**

Find the `reset` action:

```typescript
  reset: () => set({ step: 0, form: { ...DEFAULT_FORM } }),
```

Replace with:

```typescript
  reset: () => set({ step: 0, form: { ...DEFAULT_FORM, startDate: new Date() } }),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/native && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add store/onboardingStore.ts
git commit -m "fix: reset startDate to current date instead of module-load time"
```

---

## Task 9: Add in-flight guard to OTP auto-submit in `verify.tsx`

**Files:**
- Modify: `apps/native/app/(auth)/verify.tsx`

- [ ] **Step 1: Add `isVerifying` ref and guard to `verify.tsx`**

After `const inputRefs = useRef<(TextInput | null)[]>([]);` (line 24), add:

```typescript
  const isVerifying = useRef(false);
```

At the top of `handleVerify`, add the guard before `setError(null)`:

```typescript
  const handleVerify = async (finalCode?: string) => {
    const otp = finalCode ?? code.join("");
    if (otp.length < OTP_LENGTH) return;
    if (isVerifying.current) return;
    isVerifying.current = true;

    setError(null);
    // ... rest of function unchanged ...
```

At the end of `handleVerify` (in both the error branch and after `finalize`), reset the ref:

Inside the `if (verifyError)` block, after `inputRefs.current[0]?.focus();`, add:

```typescript
      isVerifying.current = false;
      return;
```

After `signIn.finalize(...)`, the navigation takes over so no reset is needed there.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/native && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/verify.tsx"
git commit -m "fix: prevent double-submit on OTP auto-verify"
```

---

## Task 10: Check `res.ok` in `handleCompleteCycle`

**Files:**
- Modify: `apps/native/app/(app)/groups/[groupId]/payments.tsx`

- [ ] **Step 1: Update `handleCompleteCycle` to check the response**

Find the `onPress` handler inside `handleCompleteCycle` (around line 90):

```typescript
          onPress: async () => {
            try {
              const token = await getToken({ template: "convex" });
              await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/cycle-complete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ cycleId: selectedCycle._id }),
              });
            } catch {
              Alert.alert("Error", "Could not complete cycle.");
            }
          },
```

Replace with:

```typescript
          onPress: async () => {
            try {
              const token = await getToken({ template: "convex" });
              const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/cycle-complete`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ cycleId: selectedCycle._id }),
              });
              if (!res.ok) throw new Error("Server returned an error");
            } catch {
              Alert.alert("Error", "Could not complete cycle.");
            }
          },
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/native && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/payments.tsx"
git commit -m "fix: surface API error when completing a cycle fails"
```

---

## Task 11: Restrict CORS origin in Hono API

**Files:**
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Replace the CORS wildcard**

Find:

```typescript
    cors({
      origin: ["*"], // Restrict in production
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
```

Replace with:

```typescript
    cors({
      // Set CORS_ORIGIN env var in Cloudflare Workers dashboard / wrangler secret
      // e.g. "https://tikli-api.<your-subdomain>.workers.dev"
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
```

> Note: For a mobile-only API, CORS is less critical (native apps don't send an `Origin` header). The wildcard is safe for this use case but this change documents intent and leaves a clear hook for web clients.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd packages/api && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit all remaining backend fixes as a bundle**

```bash
cd c:/Users/poyhi/tikli
git add packages/api/src/index.ts
git commit -m "fix: document CORS origin intent in Hono API"
```

---

## Task 12: Configure `eas.json` for production

**Files:**
- Modify: `apps/native/eas.json`

- [ ] **Step 1: Update `eas.json` with `runtimeVersion` and correct structure**

Replace the entire file with:

```json
{
  "cli": {
    "version": ">= 16.0.0",
    "promptToConfigurePushNotifications": false
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_API_URL": "http://localhost:8787"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://tikli-api.<your-subdomain>.workers.dev"
      }
    },
    "production": {
      "autoIncrement": true,
      "runtimeVersion": {
        "policy": "appVersion"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://tikli-api.<your-subdomain>.workers.dev"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "<your-apple-id>",
        "ascAppId": "<your-asc-app-id>",
        "appleTeamId": "<your-team-id>"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      }
    }
  }
}
```

- [ ] **Step 2: Fill in the real values** (manual step — requires your credentials)

Replace every `<placeholder>` with real values:

| Placeholder | Where to find it |
|---|---|
| `<your-subdomain>` | Cloudflare Workers dashboard → your worker URL |
| `<your-apple-id>` | Your Apple ID email (used for App Store Connect login) |
| `<your-asc-app-id>` | App Store Connect → App → General → Apple ID (numeric) |
| `<your-team-id>` | developer.apple.com → Account → Membership → Team ID |
| `google-service-account.json` | Google Cloud Console → IAM → Service Accounts |

- [ ] **Step 3: Commit `eas.json`** (after credentials are filled)

```bash
cd apps/native
git add eas.json
git commit -m "chore: configure EAS Build profiles with runtimeVersion for production"
```

---

## Task 13: Add `googleServicesFile` to `app.json`

**Files:**
- Modify: `apps/native/app.json`

- [ ] **Step 1: Add `googleServicesFile` under the `android` key**

Find the `android` object:

```json
    "android": {
      "package": "com.tikli.app",
      "adaptiveIcon": {
```

Replace with:

```json
    "android": {
      "package": "com.tikli.app",
      "googleServicesFile": "./google-services.json",
      "adaptiveIcon": {
```

- [ ] **Step 2: Add `google-services.json` to `.gitignore`** (if not already present)

```bash
grep -q "google-services.json" apps/native/.gitignore || echo "google-services.json" >> apps/native/.gitignore
```

- [ ] **Step 3: Commit**

```bash
git add apps/native/app.json apps/native/.gitignore
git commit -m "chore: add googleServicesFile config for Android push notifications"
```

---

## Task 14: Verify EAS build readiness

This is a verification-only task. No code changes.

- [ ] **Step 1: Confirm EAS CLI is installed**

```bash
eas --version
```

Expected: prints a version like `eas-cli/16.x.x`.

If not installed:

```bash
npm install -g eas-cli
```

- [ ] **Step 2: Log in to EAS**

```bash
eas login
```

Expected: prompts for Expo account credentials or shows already logged in.

- [ ] **Step 3: Confirm project is linked**

```bash
cd apps/native && eas project:info
```

Expected: shows project name `tikli` and owner. If not linked: `eas init`.

- [ ] **Step 4: Run a preview build to validate config (Android)**

```bash
cd apps/native && eas build --platform android --profile preview
```

Expected: build queues on EAS and completes with a downloadable `.apk`. This validates the full build pipeline without touching App Store / Play Store.

- [ ] **Step 5: Run a preview build to validate config (iOS)**

```bash
cd apps/native && eas build --platform ios --profile preview
```

Expected: build queues and completes. If this is the first iOS build, EAS will prompt to configure signing credentials automatically.

- [ ] **Step 6: Run production builds**

```bash
cd apps/native && eas build --platform all --profile production
```

Expected: both Android (AAB) and iOS (IPA) builds queue and complete. Artifacts are available in the EAS dashboard.

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|---|---|
| 1.1 `bulkMarkPayments` stale-read | Task 1 |
| 1.2 `markPayment` re-mark double-count | Task 2 |
| 1.3 `completeCycle` backend guard | Task 3 |
| 1.4 `getById` unauthenticated | Task 4 |
| 1.5 `useCurrentUser` loop | Task 7 |
| 1.6 `onboardingStore` stale date | Task 8 |
| 1.7 `verify.tsx` double-submit | Task 9 |
| 1.8 `payments.tsx` res.ok | Task 10 |
| 1.9 History removed recipients | Tasks 5 + 6 |
| 1.10 CORS wildcard | Task 11 |
| 2.1 `eas.json` runtimeVersion | Task 12 |
| 2.2 `app.json` googleServicesFile | Task 13 |
| 2.3 EAS build commands | Task 14 |

All spec items covered. No gaps.
