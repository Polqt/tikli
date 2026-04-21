# Tikli UI Redesign — Pulse Dashboard + Group Detail
**Date:** 2026-04-21
**Status:** Approved

---

## Goal

Make Tikli feel like a trusted fintech tool, not a generic app. The product hook: open the app and know everything in 3 seconds — what you owe, what you're owed, who's on track. Both organizers and members get equal value.

---

## 1. Tab Bar Rename

| Before | After |
|--------|-------|
| Home / index | **Pulse** |
| Groups | Groups |
| Profile | Profile |

Tab label `Pulse` replaces `Home`. Route stays `(tabs)/index.tsx`. Only the display label and screen title change.

---

## 2. Pulse Screen (Dashboard)

**File:** `apps/native/app/(app)/(tabs)/index.tsx`

### 2a. Personal Action Hero

Full-width section at the top. Always shows exactly one state:

| State | Display |
|-------|---------|
| You owe this cycle | `₱500 due Friday` · group name · due date |
| You receive the pot | `You get ₱5,000 on Apr 28` · trophy icon |
| All clear | `You're all clear` · next event date |

- Background: `#242424` (dark) for "owe" state, `#1D9E75` (green) for "receive" state, `rgba(36,36,36,0.05)` for "clear" state
- Bold number (36px, 800 weight), muted label below (13px)
- No button — this is read-only status. Organizer marks payments in group detail.

### 2b. Group Health Rows

Flat list below the hero. One row per group. No cards, no borders — just rows with dividers.

```
● Barkada 2026       3/5 paid  ·  ₱500 due Apr 25   ›
● Opisina Pot        5/5 paid  ·  You receive May 1  ›  🏆
○ Familia Circle     forming   ·  2/6 joined          ›
```

**Row anatomy:**
- Left: color dot (8px, filled = active, hollow outline = forming) — color from same `colorForName()` hash used in GroupCard
- Group name (15px, 700 weight)
- Right of name: inline status string (13px, muted)
- Far right: chevron + trophy icon if user is recipient this cycle
- Tap navigates to `/(app)/groups/[groupId]`

**Status string logic:**
- `active` + payments exist: `{paid}/{total} paid · ₱{amount} due {date}`
- `active` + user is recipient: `You receive {date}`
- `forming`: `{joined}/{max} joined`
- `paused`: `Paused`

### 2c. Removed

- Stat tiles (active group count, pending count) — replaced by group health rows
- "Actions" section (New Group / Join Group buttons) — moved to Groups tab header
- Empty state CTA buttons — keep empty state illustration but single CTA only

---

## 3. Groups Tab

**File:** `apps/native/app/(app)/(tabs)/groups.tsx` + `components/groups/GroupCard.tsx`

### 3a. Header

Add muted group count next to title:
```
My Groups  4
```
Count = total groups. Small, right-aligned, `rgba(36,36,36,0.35)`.

### 3b. GroupCard — one new status line

Below the pot amount row, add a single status line (12px, subColor):

| Group state | Status line |
|-------------|-------------|
| `active`, normal | `{paid}/{total} paid this cycle` |
| `active`, user is recipient | `You receive next · ₱{amount}` |
| `forming` | `{joined}/{max} members joined` |
| `paused` | `Paused` |

No other changes to GroupCard. Colored tiles stay as-is.

---

## 4. Group Detail Screen

**File:** `apps/native/app/(app)/groups/[groupId]/index.tsx`

### 4a. Header bar

Full-bleed colored bar using same `colorForName()` hash. White text on color. Contains:
- Back button (white, no border)
- Group name (22px, 800 weight, white)
- Settings gear (organizer only, white)
- Status dot + frequency label below name (13px, white/60% opacity)

Height: ~100px + safe area top.

### 4b. Key stats row

Flat 3-column row immediately below header:
```
₱5,000        5 members      Monthly
Pot Size      Members        Frequency
```
Labels 10px uppercase muted, values 18px 700 weight. Separated by thin vertical dividers.

### 4c. Cycle strip (active groups only)

Single compact row:
```
Cycle 3/6  [████████░░░░]  3/5 paid  ·  Due Apr 25
```
- Progress bar fills proportional to `paid/total`
- Color: `#1D9E75`
- Tap → navigates to payments screen

### 4d. Forming state (replaces cycle strip)

```
[Invite Code Card]
2 of 6 members joined
[Manage Members & Start]  (organizer only)
```

### 4e. MANAGE section

Replace emoji + text list with `Row` component (same as profile screen — Ionicons + label + chevron):

| Icon | Label |
|------|-------|
| `people-outline` | Members & Rotation |
| `card-outline` | Payments (hidden if forming) |
| `time-outline` | Activity |

Section label: `MANAGE` at 32% opacity, 11px, 800 weight, uppercase, letterSpacing 2.

### 4f. Recent Activity

Keep as-is. Max 5 items. Already implemented.

---

## 5. Data Requirements

### Pulse screen needs from backend

`getDashboardData` needs to return additional fields:

```ts
{
  // existing
  activeGroupCount: number,
  totalGroupCount: number,
  pendingPaymentCount: number,
  upcomingPayouts: [...],

  // new
  heroState: {
    type: "owe" | "receive" | "clear",
    amount?: number,          // centavos
    groupName?: string,
    groupId?: string,
    dueDate?: number,         // timestamp
  },
  groupHealthRows: Array<{
    groupId: string,
    name: string,
    status: string,
    paidCount: number,
    totalCount: number,
    contributionAmount: number,
    nextDueDate?: number,
    isRecipient: boolean,
    joinedCount: number,
    maxMembers: number,
  }>
}
```

### GroupCard needs from backend

`listForUser` query needs to include per-group payment summary for the current cycle:
```ts
{
  // existing fields...
  currentCyclePaidCount?: number,
  currentCycleTotalCount?: number,
  isRecipientThisCycle?: boolean,
  joinedMemberCount?: number,
}
```

---

## 6. Out of Scope (deferred)

- Push notifications
- In-app group chat
- Payment proof upload (GCash receipt photo)
- Notification when someone pays
- Any new backend features beyond dashboard query additions

---

## 7. Files to Change

| File | Change |
|------|--------|
| `apps/native/app/(app)/(tabs)/index.tsx` | Full rewrite — Pulse screen |
| `apps/native/app/(app)/(tabs)/groups.tsx` | Add group count to header |
| `apps/native/app/(app)/(tabs)/_layout.tsx` | Rename tab label to "Pulse" |
| `components/groups/GroupCard.tsx` | Add status line |
| `apps/native/app/(app)/groups/[groupId]/index.tsx` | Color header, flat stats, Row-based manage |
| `packages/backend/convex/dashboard.ts` | Add heroState + groupHealthRows |
| `packages/backend/convex/groups.ts` | Add cycle payment summary to listForUser |
