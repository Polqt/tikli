# Tikli Standout Features — Design Spec

**Date:** 2026-04-16
**Status:** Approved

## Overview

Three features targeting the core pain points of paluwagan users — trust, inconvenience, and fairness. Both organizers and members benefit from each feature.

---

## Feature 1: Trust Score

### Problem
New groups form between strangers or semi-strangers. There is no signal to distinguish a reliable payer from someone who might ghost mid-cycle.

### Design

**Computation:**
Trust Score is a 0–100 value computed on-demand via a Convex query. It is never stored — always derived from live data to avoid staleness.

```
score = (paymentRate × 60) + min(completedCycles × 5, 30) + min(accountAgeDays / 30, 10)
```

- `paymentRate` = `paid` payments / total payments across all groups the user has been in
- `completedCycles` = number of cycles where the user's group reached `completed` status
- `accountAgeDays` = (now − user.createdAt) / 86400000

**Tiers:**

| Score | Tier    |
|-------|---------|
| 0–19  | New     |
| 20–49 | Reliable|
| 50–79 | Trusted |
| 80–100| Elite   |

**Score behavior:**
- Score only trends upward over time through consistent behavior
- A poor payment history lowers `paymentRate` but completing future cycles recovers it
- No punitive resets or permanent penalties

**UI touchpoints:**
- Profile screen: score number + tier badge (color-coded)
- Join request review screen: applicant's score and tier shown prominently
- Group member list: small tier badge next to each member's avatar

**No new schema fields required.** Score is derived entirely from existing `payments`, `cycles`, `groupMembers`, and `users` tables.

---

## Feature 2: Payment Proof Uploads

### Problem
Organizers manually chase payment confirmations via group chats. The "mark as paid" action is arbitrary with no evidence trail, causing disputes.

### Design

**Flow:**
1. Member taps "Mark as Paid" on their payment row
2. Prompted to attach a screenshot (GCash/Maya/bank) — optional but surfaced prominently
3. Image uploads to Convex file storage; `proofImageId` is saved on the payment record
4. Organizer sees a camera/proof icon on the payment row
5. Organizer taps to view the screenshot in a full-screen modal
6. Organizer confirms with one tap → `status` changes to `paid`, `markedByUserId` and `markedAt` set

**Schema additions to `payments` table:**
```ts
proofImageId: v.optional(v.id("_storage")),
proofUploadedAt: v.optional(v.number()),
```

**Permissions:**
- Member: can upload proof only for their own payments
- Organizer: can confirm/reject and mark as paid
- All group members: can view uploaded proof (transparency)

**UI touchpoints:**
- Payment row: camera icon (no proof) → green attachment icon (proof uploaded) → checkmark (confirmed)
- Organizer's payment list: badge count of unreviewed proofs
- Proof viewer: full-screen image modal with Confirm / Reject actions

**Out of scope (v1):**
- OCR parsing of screenshot amounts (phase 2)
- Automated payment matching via GCash/Maya API

---

## Feature 3: Rotation Preference Bidding

### Problem
Rotation order is decided unilaterally by the organizer, causing resentment from members who feel the order is unfair or arbitrary.

### Design

**Flow:**
1. Group is in `forming` status — organizer has not yet activated it
2. Members see a "Submit Rotation Preferences" card on the group screen
3. Member drag-ranks up to 3 preferred cycle slots (e.g., slot 3, then slot 1, then slot 5)
4. Organizer sees a live counter: "7/10 members submitted preferences"
5. Organizer triggers "Suggest Rotation" — the algorithm runs:
   - Sort members by `joinedAt` (earlier = higher tiebreak priority)
   - Greedily assign each member their highest-ranked available slot
   - Flag any slots with no preference data (unsubmitted members get remaining slots)
6. Result shown as a drag-reorderable list with a satisfaction summary (e.g., "8 of 10 got a top-2 choice")
7. Organizer adjusts if needed, confirms → `rotationOrder` updated on all `groupMembers` records

**New table: `rotationPreferences`**
```ts
rotationPreferences: defineTable({
  groupId: v.id("groups"),
  userId: v.id("users"),
  rankedSlots: v.array(v.number()), // preferred slot numbers in priority order
  submittedAt: v.number(),
})
  .index("by_group", ["groupId"])
  .index("by_group_and_user", ["groupId", "userId"])
```

**Constraints:**
- Preferences can only be submitted while group is in `forming` status
- Members can update their preferences any time before organizer confirms rotation
- Organizer always has final authority over rotation order

**UI touchpoints:**
- Member view: slot preference picker with drag-to-rank interaction, active only during `forming`
- Organizer view: preference submission progress bar, "Suggest Rotation" button, editable rotation list, satisfaction score

---

## Architecture Notes

All three features are additive — no existing tables are dropped or structurally changed. Additions:

| Change | Scope |
|--------|-------|
| `payments.proofImageId` + `proofUploadedAt` | New optional fields |
| `rotationPreferences` table | New table |
| `getTrustScore` Convex query | New derived query, no schema change |

Features are independent and can be implemented in parallel or sequentially.

## Implementation Order (Recommended)

1. **Trust Score** — pure query logic, no schema migration, lowest risk
2. **Payment Proof Uploads** — schema addition + file storage, medium complexity
3. **Rotation Preference Bidding** — new table + algorithm + most complex UI
