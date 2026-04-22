# Pulse Dashboard + Group Detail UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the dashboard (renamed "Pulse"), Groups tab, and Group Detail screen to show trust-at-a-glance fintech UI — personal action hero, flat group health rows, colored group header bar.

**Architecture:** Backend-first — extend `getDashboardData` and `listForUser` Convex queries to return hero state and group health data, then rewrite frontend screens to consume it. No schema changes needed — all new fields derived from existing tables.

**Tech Stack:** React Native, Expo Router, Convex, NativeWind v4, Ionicons, TypeScript

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `packages/backend/convex/dashboard.ts` | Modify | Add `heroState` + `groupHealthRows` to return value |
| `packages/backend/convex/groups.ts` | Modify | Add cycle payment summary to `listForUser` return |
| `apps/native/app/(app)/(tabs)/_layout.tsx` | Modify | Rename "Dashboard" → "Pulse", swap icon |
| `apps/native/app/(app)/(tabs)/index.tsx` | Rewrite | Pulse screen: hero + flat group health rows |
| `apps/native/app/(app)/(tabs)/groups.tsx` | Modify | Add group count to header |
| `apps/native/components/groups/GroupCard.tsx` | Modify | Add status line below pot amount |
| `apps/native/app/(app)/groups/[groupId]/index.tsx` | Rewrite | Color header bar, flat stats row, Row-based manage |

---

## Task 1: Extend `getDashboardData` — heroState + groupHealthRows

**Files:**
- Modify: `packages/backend/convex/dashboard.ts`

- [ ] **Step 1: Replace the full dashboard.ts with the extended version**

```typescript
import { query } from "./_generated/server";

export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeMemberships = memberships.filter((m) => m.status === "active");
    const groupIds = activeMemberships.map((m) => m.groupId);
    const groups = (await Promise.all(groupIds.map((id) => ctx.db.get(id)))).filter(Boolean);
    const nonCompletedGroups = groups.filter((g) => g!.status === "active" || g!.status === "forming" || g!.status === "paused");

    // Pending payments for hero state
    const pendingPayments: Array<{ payment: typeof import("./_generated/dataModel").Doc<"payments">; group: NonNullable<(typeof groups)[number]> }> = [];
    for (const membership of activeMemberships) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_member", (q) => q.eq("memberId", membership._id))
        .collect();
      for (const p of payments) {
        if (p.status === "pending") {
          const g = groups.find((gr) => gr!._id === p.groupId);
          if (g) pendingPayments.push({ payment: p, group: g });
        }
      }
    }

    // Upcoming payouts (cycles where this user is recipient)
    const upcomingPayouts = [];
    for (const membership of activeMemberships) {
      const cycles = await ctx.db
        .query("cycles")
        .withIndex("by_recipient", (q) => q.eq("recipientMemberId", membership._id))
        .collect();
      const upcoming = cycles.filter((c) => c.status === "active" || c.status === "upcoming");
      upcomingPayouts.push(...upcoming.map((c) => ({ ...c, membershipId: membership._id })));
    }

    // Hero state: owe > receive > clear
    let heroState: {
      type: "owe" | "receive" | "clear";
      amount?: number;
      groupName?: string;
      groupId?: string;
      dueDate?: number;
    } = { type: "clear" };

    if (pendingPayments.length > 0) {
      const first = pendingPayments[0]!;
      const cycle = await ctx.db.get(first.payment.cycleId);
      heroState = {
        type: "owe",
        amount: first.payment.amount,
        groupName: first.group.name,
        groupId: first.group._id,
        dueDate: cycle?.endDate,
      };
    } else if (upcomingPayouts.length > 0) {
      const first = upcomingPayouts[0]!;
      const group = groups.find((g) => g!._id === first.groupId);
      heroState = {
        type: "receive",
        amount: first.potAmount,
        groupName: group?.name,
        groupId: first.groupId,
        dueDate: first.payoutDate,
      };
    }

    // Group health rows
    const groupHealthRows = await Promise.all(
      activeMemberships.map(async (membership) => {
        const group = groups.find((g) => g!._id === membership.groupId);
        if (!group) return null;

        // Count joined members
        const allMembers = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        const joinedCount = allMembers.filter((m) => m.status === "active").length;

        let paidCount = 0;
        let totalCount = 0;
        let nextDueDate: number | undefined;
        let isRecipient = false;

        if (group.status === "active") {
          // Get current cycle
          const currentCycle = await ctx.db
            .query("cycles")
            .withIndex("by_group_and_index", (q) =>
              q.eq("groupId", group._id).eq("cycleIndex", group.currentCycleIndex),
            )
            .unique();

          if (currentCycle) {
            nextDueDate = currentCycle.endDate;
            isRecipient = currentCycle.recipientMemberId === membership._id;

            const cyclePayments = await ctx.db
              .query("payments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", currentCycle._id))
              .collect();
            totalCount = cyclePayments.length;
            paidCount = cyclePayments.filter(
              (p) => p.status === "paid" || p.status === "late" || p.status === "excused",
            ).length;
          }
        }

        return {
          groupId: group._id as string,
          name: group.name,
          status: group.status,
          paidCount,
          totalCount,
          contributionAmount: group.contributionAmount,
          nextDueDate,
          isRecipient,
          joinedCount,
          maxMembers: group.maxMembers,
        };
      }),
    );

    return {
      activeGroupCount: nonCompletedGroups.length,
      totalGroupCount: groups.length,
      upcomingPayouts,
      pendingPaymentCount: pendingPayments.length,
      heroState,
      groupHealthRows: groupHealthRows.filter(Boolean),
    };
  },
});
```

- [ ] **Step 2: Verify Convex auto-deploys without errors**

Watch `bun dev` output in `packages/backend`. Should see:
```
✔ Convex functions ready!
```
No TypeScript errors. If errors appear, fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/dashboard.ts
git commit -m "feat(backend): add heroState and groupHealthRows to getDashboardData"
```

---

## Task 2: Extend `listForUser` — add cycle payment summary

**Files:**
- Modify: `packages/backend/convex/groups.ts` (lines 17–41)

- [ ] **Step 1: Replace `listForUser` with enriched version**

Replace the existing `listForUser` export (lines 17–41) with:

```typescript
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeIds = memberships
      .filter((m) => m.status === "active")
      .map((m) => ({ groupId: m.groupId, membershipId: m._id }));

    return await Promise.all(
      activeIds.map(async ({ groupId, membershipId }) => {
        const group = await ctx.db.get(groupId);
        if (!group) return null;

        // Count joined members
        const allMembers = await ctx.db
          .query("groupMembers")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        const joinedMemberCount = allMembers.filter((m) => m.status === "active").length;

        let currentCyclePaidCount: number | undefined;
        let currentCycleTotalCount: number | undefined;
        let isRecipientThisCycle: boolean | undefined;

        if (group.status === "active") {
          const currentCycle = await ctx.db
            .query("cycles")
            .withIndex("by_group_and_index", (q) =>
              q.eq("groupId", group._id).eq("cycleIndex", group.currentCycleIndex),
            )
            .unique();

          if (currentCycle) {
            isRecipientThisCycle = currentCycle.recipientMemberId === membershipId;
            const cyclePayments = await ctx.db
              .query("payments")
              .withIndex("by_cycle", (q) => q.eq("cycleId", currentCycle._id))
              .collect();
            currentCycleTotalCount = cyclePayments.length;
            currentCyclePaidCount = cyclePayments.filter(
              (p) => p.status === "paid" || p.status === "late" || p.status === "excused",
            ).length;
          }
        }

        return {
          ...group,
          joinedMemberCount,
          currentCyclePaidCount,
          currentCycleTotalCount,
          isRecipientThisCycle,
        };
      }),
    ).then((results) => results.filter(Boolean));
  },
});
```

- [ ] **Step 2: Verify Convex deploys cleanly**

Watch `bun dev` in `packages/backend`. Expect `✔ Convex functions ready!` with no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/groups.ts
git commit -m "feat(backend): add cycle payment summary fields to listForUser"
```

---

## Task 3: Tab bar — rename Dashboard to Pulse

**Files:**
- Modify: `apps/native/app/(app)/(tabs)/_layout.tsx`

- [ ] **Step 1: Update the index screen tab options**

Change the `index` screen entry from:
```typescript
<Tabs.Screen
  name="index"
  options={{
    title: "Dashboard",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  }}
/>
```

To:
```typescript
<Tabs.Screen
  name="index"
  options={{
    title: "Pulse",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="pulse" size={size} color={color} />
    ),
  }}
/>
```

- [ ] **Step 2: Commit**

```bash
git add apps/native/app/(app)/(tabs)/_layout.tsx
git commit -m "feat(ui): rename Dashboard tab to Pulse"
```

---

## Task 4: Rewrite Pulse screen (index.tsx)

**Files:**
- Rewrite: `apps/native/app/(app)/(tabs)/index.tsx`

- [ ] **Step 1: Write the full Pulse screen**

Replace the entire file content with:

```typescript
import { Ionicons } from "@expo/vector-icons";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const GROUP_COLORS = ["#E0533D", "#E78C9D", "#EED868", "#377CC8", "#469B88", "#9DA7D0"];

function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length]!;
}

function formatDueDate(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const diff = Math.round((d.getTime() - today.setHours(0,0,0,0)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 6) return d.toLocaleDateString("en-PH", { weekday: "long" });
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

type DashboardData = NonNullable<ReturnType<typeof useQuery<typeof api.dashboard.getDashboardData>>>;
type GroupHealthRow = NonNullable<DashboardData["groupHealthRows"]>[number];

function groupStatusString(row: NonNullable<GroupHealthRow>): string {
  if (row.status === "forming") return `${row.joinedCount}/${row.maxMembers} joined`;
  if (row.status === "paused") return "Paused";
  if (row.status === "active") {
    if (row.isRecipient) {
      return `You receive ${formatDueDate(row.nextDueDate)}`;
    }
    const paid = `${row.paidCount}/${row.totalCount} paid`;
    const due = row.nextDueDate ? ` · due ${formatDueDate(row.nextDueDate)}` : "";
    return paid + due;
  }
  return "";
}

function HeroSection({ data }: { data: DashboardData }) {
  const router = useRouter();
  const hero = data.heroState;

  const bg =
    hero.type === "owe"
      ? "#242424"
      : hero.type === "receive"
        ? "#1D9E75"
        : "rgba(36,36,36,0.05)";

  const isDark = hero.type === "owe" || hero.type === "receive";

  return (
    <TouchableOpacity
      style={{ marginHorizontal: 20, marginBottom: 28, borderRadius: 20, backgroundColor: bg, padding: 22 }}
      onPress={() => hero.groupId ? router.push(`/(app)/groups/${hero.groupId}`) : undefined}
      activeOpacity={hero.groupId ? 0.8 : 1}
    >
      {hero.type === "owe" && (
        <>
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>
            You owe this cycle
          </Text>
          <CurrencyText
            centavos={hero.amount ?? 0}
            style={{ fontSize: 36, fontWeight: "800", color: "#ffffff", letterSpacing: -1, lineHeight: 42 }}
          />
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" }}>
            {hero.groupName}{hero.dueDate ? ` · due ${formatDueDate(hero.dueDate)}` : ""}
          </Text>
        </>
      )}
      {hero.type === "receive" && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Ionicons name="trophy" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 1.5 }}>
              You receive the pot
            </Text>
          </View>
          <CurrencyText
            centavos={hero.amount ?? 0}
            style={{ fontSize: 36, fontWeight: "800", color: "#ffffff", letterSpacing: -1, lineHeight: 42 }}
          />
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" }}>
            {hero.groupName}{hero.dueDate ? ` · ${formatDueDate(hero.dueDate)}` : ""}
          </Text>
        </>
      )}
      {hero.type === "clear" && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Ionicons name="checkmark-circle" size={18} color="#1D9E75" />
            <Text style={{ fontSize: 15, fontWeight: "800", color: "#242424" }}>You're all clear</Text>
          </View>
          <Text style={{ fontSize: 13, color: "rgba(36,36,36,0.45)", fontWeight: "500" }}>
            No payments due. Nice work.
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function GroupHealthRow({ row }: { row: NonNullable<GroupHealthRow> }) {
  const router = useRouter();
  const color = colorForName(row.name);
  const isForming = row.status === "forming";

  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 }}
      onPress={() => router.push(`/(app)/groups/${row.groupId}`)}
      activeOpacity={0.6}
    >
      {/* Color dot */}
      <View style={{
        width: 8, height: 8, borderRadius: 4, marginRight: 12,
        backgroundColor: isForming ? "transparent" : color,
        borderWidth: isForming ? 2 : 0,
        borderColor: isForming ? color : undefined,
      }} />

      {/* Name + status */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#242424", marginBottom: 1 }} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={{ fontSize: 12, color: "rgba(36,36,36,0.45)", fontWeight: "500" }}>
          {groupStatusString(row)}
        </Text>
      </View>

      {/* Trophy + chevron */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {row.isRecipient && (
          <Ionicons name="trophy" size={13} color="#1D9E75" />
        )}
        <Ionicons name="chevron-forward" size={14} color="#242424" style={{ opacity: 0.2 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function PulseScreen() {
  const { convexProfile } = useCurrentUser();
  const router = useRouter();
  const dashboardData = useQuery(api.dashboard.getDashboardData);
  const isLoading = dashboardData === undefined;
  const insets = useSafeAreaInsets();
  const firstName = convexProfile?.displayName?.split(" ")[0] ?? convexProfile?.email?.split("@")[0] ?? "there";

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={{ fontSize: 13, color: "#242424", opacity: 0.4, fontWeight: "600", marginBottom: 2 }}>Pulse</Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: "#242424", letterSpacing: -0.5 }} numberOfLines={1}>
              {firstName}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(app)/(tabs)/profile")} activeOpacity={0.8}>
            <Avatar name={convexProfile?.displayName ?? convexProfile?.email} color={convexProfile?.avatarColor} size="lg" />
          </TouchableOpacity>
        </View>

        {/* Hero skeleton */}
        <Skeleton
          isLoading={isLoading}
          skeleton={
            <View style={{ marginHorizontal: 20, marginBottom: 28 }}>
              <SkeletonBlock style={{ height: 100, borderRadius: 20 }} />
            </View>
          }
        >
          {dashboardData && <HeroSection data={dashboardData} />}
        </Skeleton>

        {/* Group health rows */}
        <Skeleton
          isLoading={isLoading}
          skeleton={
            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <SkeletonBlock style={{ width: 8, height: 8, borderRadius: 4 }} />
                  <SkeletonBlock style={{ flex: 1, height: 14, borderRadius: 6 }} />
                </View>
              ))}
            </View>
          }
        >
          {dashboardData && dashboardData.groupHealthRows && dashboardData.groupHealthRows.length > 0 ? (
            <View>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.32, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, paddingHorizontal: 20 }}>
                Your Groups
              </Text>
              <View style={{ borderTopWidth: 1, borderTopColor: "rgba(36,36,36,0.06)" }}>
                {dashboardData.groupHealthRows.map((row, i) => row && (
                  <View key={row.groupId}>
                    <GroupHealthRow row={row} />
                    {i < dashboardData.groupHealthRows.length - 1 && (
                      <View style={{ height: 1, backgroundColor: "rgba(36,36,36,0.06)", marginLeft: 40 }} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          ) : dashboardData?.totalGroupCount === 0 ? (
            <View style={{ marginHorizontal: 20, alignItems: "center", paddingVertical: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#242424", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                <Ionicons name="people-outline" size={28} color="#ffffff" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#242424", marginBottom: 8, letterSpacing: -0.3 }}>
                Start your circle
              </Text>
              <Text style={{ fontSize: 14, color: "#242424", opacity: 0.45, textAlign: "center", lineHeight: 21, marginBottom: 28 }}>
                Create or join a paluwagan group to track contributions and payouts.
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: "#242424", paddingVertical: 15, borderRadius: 999, width: "100%", alignItems: "center" }}
                onPress={() => router.push("/(app)/groups/new")}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Create a Group</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Skeleton>

      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/native/app/(app)/(tabs)/index.tsx
git commit -m "feat(ui): rewrite dashboard as Pulse screen with hero + group health rows"
```

---

## Task 5: Groups tab — add group count to header

**Files:**
- Modify: `apps/native/app/(app)/(tabs)/groups.tsx`

- [ ] **Step 1: Add count to the header**

In `groups.tsx`, find the header `Text` with "My Groups". Add a count next to it by replacing:

```typescript
<Text style={{ fontSize: 28, fontWeight: "800", color: "#242424", letterSpacing: -0.5 }}>
  My Groups
</Text>
```

With:

```typescript
<View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
  <Text style={{ fontSize: 28, fontWeight: "800", color: "#242424", letterSpacing: -0.5 }}>
    My Groups
  </Text>
  {groups && groups.length > 0 && (
    <Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(36,36,36,0.35)" }}>
      {groups.length}
    </Text>
  )}
</View>
```

- [ ] **Step 2: Commit**

```bash
git add apps/native/app/(app)/(tabs)/groups.tsx
git commit -m "feat(ui): add group count to Groups tab header"
```

---

## Task 6: GroupCard — add status line

**Files:**
- Modify: `apps/native/components/groups/GroupCard.tsx`

- [ ] **Step 1: Update GroupCardProps interface to include new fields**

Replace the existing `GroupCardProps` interface:

```typescript
interface GroupCardProps {
  group: {
    _id: string;
    name: string;
    status: string;
    potAmount: number;
    currentCycleIndex: number;
    totalCycles: number;
    frequency: string;
    currentCyclePaidCount?: number;
    currentCycleTotalCount?: number;
    isRecipientThisCycle?: boolean;
    joinedMemberCount?: number;
    maxMembers: number;
  };
}
```

- [ ] **Step 2: Add status line below the pot/frequency row**

Inside the `GroupCard` component, find the bottom `<View>` with `flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between"`. After that closing `</View>`, add:

```typescript
{/* Status line */}
{(() => {
  if (group.status === "forming") {
    return (
      <Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
        {group.joinedMemberCount ?? 1}/{group.maxMembers} members joined
      </Text>
    );
  }
  if (group.status === "paused") {
    return (
      <Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
        Paused
      </Text>
    );
  }
  if (group.status === "active") {
    if (group.isRecipientThisCycle) {
      return (
        <Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "600" }}>
          🏆 You receive next
        </Text>
      );
    }
    if (group.currentCyclePaidCount !== undefined && group.currentCycleTotalCount !== undefined) {
      return (
        <Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
          {group.currentCyclePaidCount}/{group.currentCycleTotalCount} paid this cycle
        </Text>
      );
    }
  }
  return null;
})()}
```

- [ ] **Step 3: Commit**

```bash
git add apps/native/components/groups/GroupCard.tsx
git commit -m "feat(ui): add payment status line to GroupCard"
```

---

## Task 7: Rewrite Group Detail screen

**Files:**
- Rewrite: `apps/native/app/(app)/groups/[groupId]/index.tsx`

- [ ] **Step 1: Write the full group detail screen**

Replace entire file content with:

```typescript
import { Ionicons } from "@expo/vector-icons";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { FREQUENCY_LABEL } from "@/types";
import type { Frequency } from "@/types";

const GROUP_COLORS = ["#E0533D", "#E78C9D", "#EED868", "#377CC8", "#469B88", "#9DA7D0"];

function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length]!;
}

function isLightColor(hex: string): boolean {
  return hex === "#EED868";
}

function Row({
  icon,
  label,
  onPress,
  textColor = "#242424",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  textColor?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 15, gap: 14 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(36,36,36,0.07)", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color={textColor} />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: textColor }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#242424" style={{ opacity: 0.2 }} />
    </TouchableOpacity>
  );
}

const DIV = <View style={{ height: 1, backgroundColor: "rgba(36,36,36,0.07)", marginLeft: 50 }} />;

export default function GroupOverviewScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, { groupId: groupId as never });
  const cyclePaymentSummary = useQuery(
    api.payments.getCyclePaymentSummary,
    currentCycle ? { cycleId: currentCycle._id } : "skip",
  );
  const activityLogs = useQuery(api.activityLog.listForGroup, { groupId: groupId as never, limit: 5 });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const isLoading = group === undefined;

  if (!isLoading && !group) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
        <EmptyState icon="🔍" title="Group not found" description="This group may have been deleted." />
      </View>
    );
  }

  const isOrganizer = group && memberForUser && group.organizerId === memberForUser.userId;
  const groupColor = group ? colorForName(group.name) : "#242424";
  const lightHeader = isLightColor(groupColor);
  const headerTextColor = lightHeader ? "#242424" : "#ffffff";
  const headerSubColor = lightHeader ? "rgba(36,36,36,0.55)" : "rgba(255,255,255,0.65)";

  const paidProgress = cyclePaymentSummary && cyclePaymentSummary.total > 0
    ? cyclePaymentSummary.paid / cyclePaymentSummary.total
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* Color header bar */}
        <View style={{ backgroundColor: isLoading ? "#242424" : groupColor, paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}>
          {/* Nav row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-back" size={20} color={headerTextColor} />
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                onPress={() => router.push(`/(app)/groups/${groupId}/settings`)}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="settings-outline" size={18} color={headerTextColor} />
              </TouchableOpacity>
            )}
          </View>

          <Skeleton
            isLoading={isLoading}
            skeleton={
              <View style={{ gap: 8 }}>
                <SkeletonBlock style={{ width: "60%", height: 26 }} />
                <SkeletonBlock style={{ width: "35%", height: 14 }} />
              </View>
            }
          >
            {group && (
              <>
                <Text style={{ fontSize: 22, fontWeight: "800", color: headerTextColor, letterSpacing: -0.4, marginBottom: 4 }}>
                  {group.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: headerSubColor }} />
                  <Text style={{ fontSize: 13, color: headerSubColor, fontWeight: "500", textTransform: "capitalize" }}>
                    {group.status} · {FREQUENCY_LABEL[group.frequency as Frequency] ?? group.frequency}
                  </Text>
                </View>
              </>
            )}
          </Skeleton>
        </View>

        {/* Key stats row */}
        {group && (
          <View style={{ flexDirection: "row", backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "rgba(36,36,36,0.06)" }}>
            {[
              { label: "Pot Size", value: <CurrencyText centavos={group.potAmount} style={{ fontSize: 18, fontWeight: "700", color: "#242424" }} /> },
              { label: "Members", value: <Text style={{ fontSize: 18, fontWeight: "700", color: "#242424" }}>{group.maxMembers}</Text> },
              { label: "Frequency", value: <Text style={{ fontSize: 15, fontWeight: "700", color: "#242424" }}>{FREQUENCY_LABEL[group.frequency as Frequency] ?? group.frequency}</Text> },
            ].map((stat, i) => (
              <View key={stat.label} style={{ flex: 1, alignItems: "center", paddingVertical: 16, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: "rgba(36,36,36,0.07)" }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: "rgba(36,36,36,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  {stat.label}
                </Text>
                {stat.value}
              </View>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>

          {/* Active: cycle strip */}
          {group?.status === "active" && currentCycle && (
            <TouchableOpacity
              style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 24 }}
              onPress={() => router.push(`/(app)/groups/${groupId}/payments`)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#242424" }}>
                  Cycle {group.currentCycleIndex + 1}/{group.totalCycles}
                </Text>
                <Text style={{ fontSize: 12, color: "rgba(36,36,36,0.4)", fontWeight: "500" }}>
                  {cyclePaymentSummary ? `${cyclePaymentSummary.paid}/${cyclePaymentSummary.total} paid` : ""}
                  {currentCycle.endDate ? ` · Due ${new Date(currentCycle.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}
                </Text>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(36,36,36,0.07)", overflow: "hidden" }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: "#1D9E75", width: `${Math.round(paidProgress * 100)}%` }} />
              </View>
            </TouchableOpacity>
          )}

          {/* Forming: invite + members count */}
          {group?.status === "forming" && (
            <View style={{ marginBottom: 24 }}>
              <InviteCodeCard code={group.inviteCode} />
              {isOrganizer && (
                <TouchableOpacity
                  style={{ backgroundColor: "#242424", paddingVertical: 15, borderRadius: 999, alignItems: "center", marginTop: 14 }}
                  onPress={() => router.push(`/(app)/groups/${groupId}/members`)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Manage Members & Start</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* MANAGE section */}
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.32, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            Manage
          </Text>
          <Row icon="people-outline" label="Members & Rotation" onPress={() => router.push(`/(app)/groups/${groupId}/members`)} />
          {DIV}
          {group?.status !== "forming" && (
            <>
              <Row icon="card-outline" label="Payments" onPress={() => router.push(`/(app)/groups/${groupId}/payments`)} />
              {DIV}
            </>
          )}
          <Row icon="time-outline" label="Activity" onPress={() => router.push(`/(app)/groups/${groupId}/history`)} />

          {/* Recent activity */}
          {activityLogs && activityLogs.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.32, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                Recent
              </Text>
              {activityLogs.map((log, i) => (
                <View
                  key={log._id}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(36,36,36,0.06)" }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#1D9E75", marginRight: 14 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: "#242424", fontWeight: "500" }}>
                    {log.eventType.replace(/_/g, " ")}
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(36,36,36,0.35)", fontWeight: "500" }}>
                    {(() => {
                      const diff = Date.now() - log.createdAt;
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return "just now";
                      if (mins < 60) return `${mins}m ago`;
                      const h = Math.floor(mins / 60);
                      if (h < 24) return `${h}h ago`;
                      return `${Math.floor(h / 24)}d ago`;
                    })()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/native/app/(app)/groups/[groupId]/index.tsx
git commit -m "feat(ui): rewrite group detail with color header bar and flat manage rows"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Tab renamed to "Pulse" with pulse icon — Task 3
- ✅ Hero state: owe/receive/clear — Task 4
- ✅ Group health flat rows — Task 4
- ✅ Removed stat tiles, single CTA empty state — Task 4
- ✅ Group count in Groups header — Task 5
- ✅ GroupCard status line — Task 6
- ✅ Color header bar in group detail — Task 7
- ✅ Flat stats row (pot/members/frequency) — Task 7
- ✅ Cycle strip with progress bar — Task 7
- ✅ Forming state with invite + manage button — Task 7
- ✅ Row-based MANAGE section with Ionicons — Task 7
- ✅ `heroState` + `groupHealthRows` in getDashboardData — Task 1
- ✅ Cycle payment summary in listForUser — Task 2

**Type consistency:**
- `groupHealthRows` returned from Task 1 matches the type consumed in Task 4 ✅
- `joinedMemberCount`, `currentCyclePaidCount`, `currentCycleTotalCount`, `isRecipientThisCycle` defined in Task 2, consumed in Task 6 ✅
- `colorForName()` defined locally in both Task 4 (Pulse) and Task 7 (Group detail) — same implementation ✅
