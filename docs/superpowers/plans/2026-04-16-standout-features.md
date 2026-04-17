# Standout Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Trust Score, Payment Proof Uploads, and Rotation Preference Bidding to tikli to address trust, inconvenience, and fairness pain points in paluwagan.

**Architecture:** Three independent, additive features — no existing tables are dropped or restructured. Trust Score is a pure derived Convex query. Payment Proof adds two optional fields to `payments` and uses Convex file storage. Rotation Preference Bidding adds a new `rotationPreferences` table with a greedy slot-assignment algorithm run at query time.

**Tech Stack:** Convex (backend queries/mutations), Hono (Cloudflare Workers API), React Native + Expo (mobile), `expo-image-picker` (photo selection), `react-native-draggable-flatlist` (already installed, used in members screen)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| CREATE | `packages/backend/convex/trustScore.ts` | Trust score queries |
| MODIFY | `packages/backend/convex/schema.ts` | Add proof fields + rotationPreferences table |
| MODIFY | `packages/backend/convex/payments.ts` | Add proof upload URL + save proof mutations, update listForCycle to return proof URLs |
| CREATE | `packages/backend/convex/rotationPreferences.ts` | Submit/list preferences + suggest rotation query |
| MODIFY | `packages/api/src/routes/payments.ts` | Add proof-save route |
| CREATE | `packages/api/src/routes/rotationPreferences.ts` | Submit preferences + apply rotation routes |
| MODIFY | `packages/api/src/index.ts` | Register rotationPreferences router |
| MODIFY | `apps/native/app/(app)/(tabs)/profile.tsx` | Show trust score badge |
| MODIFY | `apps/native/app/(app)/groups/[groupId]/members.tsx` | Show tier badges + preference progress + suggest rotation |
| MODIFY | `apps/native/app/(app)/groups/[groupId]/payments.tsx` | Proof upload button + proof viewer modal |
| CREATE | `apps/native/app/(app)/groups/[groupId]/rotation-preferences.tsx` | Member preference picker screen |

---

## Phase 1: Trust Score

### Task 1: Convex trust score query

**Files:**
- Create: `packages/backend/convex/trustScore.ts`

- [ ] **Step 1: Create the trust score query file**

```ts
// packages/backend/convex/trustScore.ts
import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function computeTrustScore(
  ctx: { db: { query: Function; get: Function } },
  userId: Id<"users">,
) {
  const user = await ctx.db.get(userId);
  if (!user) return null;

  const memberRecords = await ctx.db
    .query("groupMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  let totalPayments = 0;
  let paidPayments = 0;
  for (const member of memberRecords) {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_member", (q: any) => q.eq("memberId", member._id))
      .collect();
    totalPayments += payments.length;
    paidPayments += payments.filter((p: any) => p.status === "paid").length;
  }

  const paymentRate = totalPayments > 0 ? paidPayments / totalPayments : 0;

  const groupIds = [...new Set(memberRecords.map((m: any) => m.groupId as Id<"groups">))];
  let completedCycles = 0;
  for (const groupId of groupIds) {
    const group = await ctx.db.get(groupId);
    if (group?.status === "completed") completedCycles++;
  }

  const accountAgeDays = (Date.now() - user.createdAt) / 86_400_000;

  const score = Math.min(
    100,
    Math.round(
      paymentRate * 60 +
        Math.min(completedCycles * 5, 30) +
        Math.min(accountAgeDays / 30, 10),
    ),
  );

  const tier =
    score >= 80
      ? "Elite"
      : score >= 50
        ? "Trusted"
        : score >= 20
          ? "Reliable"
          : "New";

  return { score, tier };
}

export const getForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => computeTrustScore(ctx as any, args.userId),
});

export const getMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    return computeTrustScore(ctx as any, user._id);
  },
});
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

Expected: no errors in `trustScore.ts`

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/trustScore.ts
git commit -m "feat: add trust score convex queries"
```

---

### Task 2: Trust badge on profile screen

**Files:**
- Modify: `apps/native/app/(app)/(tabs)/profile.tsx`

- [ ] **Step 1: Add trust score query and badge to profile**

In `apps/native/app/(app)/(tabs)/profile.tsx`, add the import and query at the top of the component, then insert the badge block after the avatar section:

Add to imports:
```ts
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
```

Add inside `ProfileScreen()` after existing hook calls:
```ts
const trustScore = useQuery(api.trustScore.getMine);
```

Insert this block **after** the `</View>` that closes the avatar section (after the phone number text, before the display name edit card), at line ~51:
```tsx
{/* Trust Score Badge */}
{trustScore && (
  <View
    style={{
      backgroundColor: "#ffffff",
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
  >
    <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "600" }}>
      TRUST SCORE
    </Text>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827" }}>
        {trustScore.score}
      </Text>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 4,
          borderRadius: 20,
          backgroundColor:
            trustScore.tier === "Elite"
              ? "#FEF3C7"
              : trustScore.tier === "Trusted"
                ? "#D1FAE5"
                : trustScore.tier === "Reliable"
                  ? "#DBEAFE"
                  : "#F3F4F6",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color:
              trustScore.tier === "Elite"
                ? "#92400E"
                : trustScore.tier === "Trusted"
                  ? "#065F46"
                  : trustScore.tier === "Reliable"
                    ? "#1E40AF"
                    : "#6B7280",
          }}
        >
          {trustScore.tier}
        </Text>
      </View>
    </View>
  </View>
)}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add apps/native/app/\(app\)/\(tabs\)/profile.tsx
git commit -m "feat: show trust score badge on profile screen"
```

---

### Task 3: Tier badge on group members list

**Files:**
- Modify: `apps/native/app/(app)/groups/[groupId]/members.tsx`

- [ ] **Step 1: Add trust score query per member and tier badge in member rows**

In `apps/native/app/(app)/groups/[groupId]/members.tsx`:

The member list renders via `renderMember`. We need per-member trust scores. The best approach is to fetch all members' trust scores in a batch, but Convex doesn't support batch queries. Instead, create a helper component that fetches a single member's score:

Add this helper component **above** `export default function MembersScreen()`:

```tsx
function TierBadge({ userId }: { userId: string }) {
  const score = useQuery(api.trustScore.getForUser, { userId: userId as never });
  if (!score) return null;
  const colors: Record<string, { bg: string; text: string }> = {
    Elite:    { bg: "#FEF3C7", text: "#92400E" },
    Trusted:  { bg: "#D1FAE5", text: "#065F46" },
    Reliable: { bg: "#DBEAFE", text: "#1E40AF" },
    New:      { bg: "#F3F4F6", text: "#6B7280" },
  };
  const c = colors[score.tier] ?? colors.New!;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        backgroundColor: c.bg,
        marginLeft: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "700", color: c.text }}>
        {score.tier}
      </Text>
    </View>
  );
}
```

Add `useQuery` and `api` to the existing imports at the top of the file (they're already there — `useQuery` is in `convex/react` and `api` is imported from `@tikli/backend/convex/_generated/api`).

In `renderMember`, find the `<View style={{ flex: 1, marginLeft: 12 }}>` block and add `<TierBadge>` after the member name `<Text>`:

```tsx
<View style={{ flex: 1, marginLeft: 12 }}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
      {item.user?.displayName ?? item.user?.phoneNumber ?? "Member"}
    </Text>
    {item.user && <TierBadge userId={item.user._id} />}
  </View>
  {item.cycleReceivedIndex !== undefined && (
    <Text style={{ fontSize: 12, color: "#1D9E75", fontWeight: "600" }}>
      Received cycle {item.cycleReceivedIndex + 1}
    </Text>
  )}
</View>
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add apps/native/app/\(app\)/groups/\[groupId\]/members.tsx
git commit -m "feat: show trust tier badges in members list"
```

---

## Phase 2: Payment Proof Uploads

### Task 4: Schema additions for proof fields

**Files:**
- Modify: `packages/backend/convex/schema.ts`

- [ ] **Step 1: Add proof fields to payments table**

In `packages/backend/convex/schema.ts`, find the `payments` table definition. After the `notes` field, add:

```ts
    proofImageId: v.optional(v.id("_storage")),
    proofUploadedAt: v.optional(v.number()),
```

The payments table should now look like:
```ts
  payments: defineTable({
    groupId: v.id("groups"),
    cycleId: v.id("cycles"),
    memberId: v.id("groupMembers"),
    amount: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("late"),
      v.literal("excused"),
    ),
    markedByUserId: v.optional(v.id("users")),
    markedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    proofImageId: v.optional(v.id("_storage")),
    proofUploadedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat: add proof image fields to payments schema"
```

---

### Task 5: Convex proof mutations and updated listForCycle

**Files:**
- Modify: `packages/backend/convex/payments.ts`

- [ ] **Step 1: Add generateProofUploadUrl mutation**

At the bottom of `packages/backend/convex/payments.ts`, add:

```ts
export const generateProofUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const savePaymentProof = mutation({
  args: {
    paymentId: v.id("payments"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const member = await ctx.db.get(payment.memberId);
    if (!member || member.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.paymentId, {
      proofImageId: args.storageId,
      proofUploadedAt: Date.now(),
    });
  },
});
```

- [ ] **Step 2: Update listForCycle to return proof URLs**

In the same file, update the `listForCycle` query handler. Replace the return inside `payments.map` to also resolve the proof URL:

```ts
export const listForCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    return await Promise.all(
      payments.map(async (p) => {
        const member = await ctx.db.get(p.memberId);
        const user = member ? await ctx.db.get(member.userId) : null;
        const proofUrl = p.proofImageId
          ? await ctx.storage.getUrl(p.proofImageId)
          : null;
        return { ...p, member, user, proofUrl };
      }),
    );
  },
});
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/backend/convex/payments.ts
git commit -m "feat: add proof upload mutations and proof URL in listForCycle"
```

---

### Task 6: Payments screen proof UI and modal

**Files:**
- Modify: `apps/native/app/(app)/groups/[groupId]/payments.tsx`

- [ ] **Step 1: Install expo-image-picker if not present**

```bash
cd C:/Users/poyhi/tikli/apps/native && bunx expo install expo-image-picker
```

- [ ] **Step 2: Add proof upload flow to payments screen**

In `apps/native/app/(app)/groups/[groupId]/payments.tsx`:

Add new imports at the top:
```ts
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@tikli/backend/convex/_generated/api";
```

Add new state and mutations inside `PaymentsScreen()`:
```ts
const generateUploadUrl = useMutation(api.payments.generateProofUploadUrl);
const saveProof = useMutation(api.payments.savePaymentProof);
const [viewingProof, setViewingProof] = useState<{ url: string; paymentId: string; memberName: string } | null>(null);
const [uploadingProof, setUploadingProof] = useState<string | null>(null); // paymentId being uploaded
```

Add the `handleUploadProof` function inside the component (after existing handlers):
```ts
const handleUploadProof = async (paymentId: string) => {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert("Permission required", "Allow photo access to upload payment proof.");
    return;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.7,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return;

  setUploadingProof(paymentId);
  try {
    const uploadUrl = await generateUploadUrl();
    const asset = result.assets[0];
    const fileResponse = await fetch(asset.uri);
    const blob = await fileResponse.blob();
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
      body: blob,
    });
    if (!uploadResponse.ok) throw new Error("Upload failed");
    const { storageId } = await uploadResponse.json();
    await saveProof({ paymentId: paymentId as never, storageId });
    Alert.alert("Proof uploaded", "Your payment proof has been submitted.");
  } catch {
    Alert.alert("Error", "Could not upload proof. Please try again.");
  } finally {
    setUploadingProof(null);
  }
};
```

- [ ] **Step 3: Update payment row to show proof icons**

In the payment row rendering (inside `members?.map((member) => {...})`), after the existing status button, find the `<TouchableOpacity>` for the status badge and update the member name section to also show a proof camera icon.

Replace the existing member info `<View>` block with:
```tsx
<View style={{ flex: 1, marginLeft: 12 }}>
  <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
    {member.user?.displayName ?? member.user?.phoneNumber ?? "Member"}
  </Text>
  {payment?.markedAt && (
    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
      {new Date(payment.markedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
    </Text>
  )}
</View>

{/* Proof upload/view button */}
{payment && (
  payment.proofUrl ? (
    <TouchableOpacity
      onPress={() =>
        setViewingProof({
          url: payment.proofUrl!,
          paymentId: payment._id,
          memberName: member.user?.displayName ?? member.user?.phoneNumber ?? "Member",
        })
      }
      style={{ marginRight: 8 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={{ fontSize: 18 }}>🖼️</Text>
    </TouchableOpacity>
  ) : (
    payment.status === "pending" && member.userId === memberForUser?.userId && (
      <TouchableOpacity
        onPress={() => handleUploadProof(payment._id)}
        disabled={uploadingProof === payment._id}
        style={{ marginRight: 8 }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {uploadingProof === payment._id ? (
          <ActivityIndicator size="small" color="#9CA3AF" />
        ) : (
          <Text style={{ fontSize: 18 }}>📷</Text>
        )}
      </TouchableOpacity>
    )
  )
)}
```

- [ ] **Step 4: Add proof viewer modal**

Before the closing `</SafeAreaView>`, add the proof viewer modal:
```tsx
{/* Proof Viewer Modal */}
<Modal visible={!!viewingProof} transparent animationType="fade">
  <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center" }}>
    <TouchableOpacity
      style={{ position: "absolute", top: 60, right: 20, zIndex: 10 }}
      onPress={() => setViewingProof(null)}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Text style={{ color: "#ffffff", fontSize: 28, fontWeight: "300" }}>✕</Text>
    </TouchableOpacity>

    <View style={{ paddingHorizontal: 16 }}>
      <Text style={{ color: "#9CA3AF", fontSize: 13, textAlign: "center", marginBottom: 12 }}>
        {viewingProof?.memberName} — payment proof
      </Text>
      {viewingProof?.url && (
        <Image
          source={{ uri: viewingProof.url }}
          style={{ width: "100%", height: 400, borderRadius: 12 }}
          resizeMode="contain"
        />
      )}

      {/* Organizer confirm button when proof is present and payment is pending */}
      {isOrganizer && viewingProof && (() => {
        const payment = cyclePayments?.find((p) => p._id === viewingProof.paymentId);
        return payment?.status === "pending" ? (
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: "#1D9E75",
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
            }}
            onPress={() => {
              setViewingProof(null);
              setMarkingPayment({
                paymentId: viewingProof.paymentId,
                memberName: viewingProof.memberName,
              });
              setMarkStatus("paid");
            }}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
              Confirm Payment
            </Text>
          </TouchableOpacity>
        ) : null;
      })()}
    </View>
  </View>
</Modal>
```

- [ ] **Step 5: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 6: Commit**

```bash
git add apps/native/app/\(app\)/groups/\[groupId\]/payments.tsx
git commit -m "feat: add payment proof upload and viewer to payments screen"
```

---

## Phase 3: Rotation Preference Bidding

### Task 7: Schema addition for rotationPreferences

**Files:**
- Modify: `packages/backend/convex/schema.ts`

- [ ] **Step 1: Add rotationPreferences table**

In `packages/backend/convex/schema.ts`, at the end of the `defineSchema({...})` object (before the final `})`), add:

```ts
  rotationPreferences: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    rankedSlots: v.array(v.number()),
    submittedAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_and_user", ["groupId", "userId"]),
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/schema.ts
git commit -m "feat: add rotationPreferences table to schema"
```

---

### Task 8: Convex rotation preferences queries and mutations

**Files:**
- Create: `packages/backend/convex/rotationPreferences.ts`

- [ ] **Step 1: Create rotationPreferences.ts**

```ts
// packages/backend/convex/rotationPreferences.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const submitPreferences = mutation({
  args: {
    groupId: v.id("groups"),
    rankedSlots: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.status !== "forming") throw new Error("Group is no longer in forming stage");

    // Validate slots are within range
    const memberCount = group.maxMembers;
    for (const slot of args.rankedSlots) {
      if (slot < 1 || slot > memberCount) {
        throw new Error(`Slot ${slot} is out of range (1–${memberCount})`);
      }
    }
    if (args.rankedSlots.length > 3) throw new Error("Maximum 3 preferences allowed");

    const existing = await ctx.db
      .query("rotationPreferences")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rankedSlots: args.rankedSlots,
        submittedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("rotationPreferences", {
        groupId: args.groupId,
        userId: user._id,
        rankedSlots: args.rankedSlots,
        submittedAt: Date.now(),
      });
    }
  },
});

export const listForGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("rotationPreferences")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
  },
});

export const getMyPreferences = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("rotationPreferences")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();
  },
});

export const suggestRotation = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const allPrefs = await ctx.db
      .query("rotationPreferences")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const activeMembers = members
      .filter((m) => m.status === "active")
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const totalSlots = activeMembers.length;
    const assignedSlots = new Set<number>();

    const result: Array<{
      memberId: Id<"groupMembers">;
      userId: Id<"users">;
      slot: number;
      satisfiedRank: number | null; // 1 = top choice, 2 = second, etc. null = no preference or fallback
    }> = [];

    for (const member of activeMembers) {
      const pref = allPrefs.find((p) => p.userId === member.userId);

      let assigned = false;
      if (pref) {
        for (let i = 0; i < pref.rankedSlots.length; i++) {
          const slot = pref.rankedSlots[i]!;
          if (slot >= 1 && slot <= totalSlots && !assignedSlots.has(slot)) {
            assignedSlots.add(slot);
            result.push({ memberId: member._id, userId: member.userId, slot, satisfiedRank: i + 1 });
            assigned = true;
            break;
          }
        }
      }

      if (!assigned) {
        for (let s = 1; s <= totalSlots; s++) {
          if (!assignedSlots.has(s)) {
            assignedSlots.add(s);
            result.push({ memberId: member._id, userId: member.userId, slot: s, satisfiedRank: null });
            break;
          }
        }
      }
    }

    result.sort((a, b) => a.slot - b.slot);

    const gotTop2 = result.filter((r) => r.satisfiedRank !== null && r.satisfiedRank <= 2).length;
    const submittedCount = allPrefs.length;

    return {
      suggestion: result,
      gotTop2Count: gotTop2,
      totalMembers: activeMembers.length,
      submittedCount,
    };
  },
});
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add packages/backend/convex/rotationPreferences.ts
git commit -m "feat: add rotation preferences convex queries and mutations"
```

---

### Task 9: Hono API route for preferences and applying rotation

**Files:**
- Create: `packages/api/src/routes/rotationPreferences.ts`
- Modify: `packages/api/src/index.ts`

- [ ] **Step 1: Create the rotationPreferences Hono router**

```ts
// packages/api/src/routes/rotationPreferences.ts
import { zValidator } from "@hono/zod-validator";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import type { Env, Variables } from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fn = (name: string) => makeFunctionReference<"mutation", any, any>(name);

function convexClient(url: string, token: string): ConvexHttpClient {
  const c = new ConvexHttpClient(url);
  c.setAuth(token);
  return c;
}

const submitPrefsSchema = z.object({
  rankedSlots: z.array(z.number().int().min(1)).max(3),
});

const applyRotationSchema = z.object({
  orderedMemberIds: z.array(z.string()).min(1),
});

export const rotationPreferencesRouter = new Hono<{
  Bindings: Env;
  Variables: Variables;
}>()
  .use(authMiddleware)
  .post(
    "/:groupId/preferences",
    zValidator("json", submitPrefsSchema),
    async (c) => {
      const { groupId } = c.req.param();
      const body = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("rotationPreferences:submitPreferences"), {
        groupId,
        rankedSlots: body.rankedSlots,
      });
      return c.json({ ok: true });
    },
  )
  .post(
    "/:groupId/apply-rotation",
    zValidator("json", applyRotationSchema),
    async (c) => {
      const { groupId } = c.req.param();
      const body = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("members:reorderRotation"), {
        groupId,
        orderedMemberIds: body.orderedMemberIds,
      });
      return c.json({ ok: true });
    },
  );
```

- [ ] **Step 2: Register router in index.ts**

In `packages/api/src/index.ts`, add:

```ts
import { rotationPreferencesRouter } from "./routes/rotationPreferences.js";
```

And add to the app chain:
```ts
  .route("/api/rotation", rotationPreferencesRouter)
```

- [ ] **Step 3: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/routes/rotationPreferences.ts packages/api/src/index.ts
git commit -m "feat: add rotation preferences hono API routes"
```

---

### Task 10: Member preference picker screen

**Files:**
- Create: `apps/native/app/(app)/groups/[groupId]/rotation-preferences.tsx`

- [ ] **Step 1: Create the rotation preferences screen**

```tsx
// apps/native/app/(app)/groups/[groupId]/rotation-preferences.tsx
import { api } from "@tikli/backend/convex/_generated/api";
import { env } from "@tikli/env/native";
import { useAuth } from "@clerk/expo";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RotationPreferencesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const myPrefs = useQuery(api.rotationPreferences.getMyPreferences, {
    groupId: groupId as never,
  });

  const [selectedSlots, setSelectedSlots] = useState<number[]>(
    myPrefs?.rankedSlots ?? [],
  );
  const [saving, setSaving] = useState(false);

  const totalSlots = group?.maxMembers ?? 0;

  const toggleSlot = (slot: number) => {
    setSelectedSlots((prev) => {
      if (prev.includes(slot)) {
        return prev.filter((s) => s !== slot);
      }
      if (prev.length >= 3) {
        Alert.alert("Max 3 preferences", "Remove one before adding another.");
        return prev;
      }
      return [...prev, slot];
    });
  };

  const handleSave = async () => {
    if (selectedSlots.length === 0) {
      Alert.alert("No preferences selected", "Select at least one preferred slot.");
      return;
    }
    setSaving(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(
        `${env.EXPO_PUBLIC_API_URL}/api/rotation/${groupId}/preferences`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rankedSlots: selectedSlots }),
        },
      );
      if (!res.ok) throw new Error("Failed to save");
      Alert.alert("Saved", "Your preferences have been submitted.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: "#111827",
              marginLeft: 16,
            }}
          >
            Rotation Preferences
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 20, lineHeight: 20 }}>
          Tap up to 3 slots in order of preference. Slot 1 means you want to
          receive the payout first.
        </Text>

        {/* Slot grid */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 32 }}>
          {Array.from({ length: totalSlots }, (_, i) => i + 1).map((slot) => {
            const rank = selectedSlots.indexOf(slot);
            const isSelected = rank !== -1;
            return (
              <TouchableOpacity
                key={slot}
                onPress={() => toggleSlot(slot)}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 16,
                  backgroundColor: isSelected ? "#1D9E75" : "#ffffff",
                  borderWidth: 2,
                  borderColor: isSelected ? "#1D9E75" : "#E5E7EB",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "800",
                    color: isSelected ? "#ffffff" : "#374151",
                  }}
                >
                  {slot}
                </Text>
                {isSelected && (
                  <Text
                    style={{ fontSize: 10, fontWeight: "700", color: "#A7F3D0" }}
                  >
                    #{rank + 1} pick
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedSlots.length > 0 && (
          <View
            style={{
              backgroundColor: "#F0FDF8",
              borderRadius: 12,
              padding: 14,
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: "#065F46", marginBottom: 4 }}>
              Your preference order:
            </Text>
            <Text style={{ fontSize: 13, color: "#374151" }}>
              {selectedSlots.map((s, i) => `${i + 1}. Slot ${s}`).join("  •  ")}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={{
            backgroundColor: "#1D9E75",
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: "center",
          }}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              Submit Preferences
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add "apps/native/app/(app)/groups/[groupId]/rotation-preferences.tsx"
git commit -m "feat: add rotation preferences picker screen for members"
```

---

### Task 11: Organizer preference progress and suggest rotation in members screen

**Files:**
- Modify: `apps/native/app/(app)/groups/[groupId]/members.tsx`

- [ ] **Step 1: Add preference queries and suggest rotation UI**

In `apps/native/app/(app)/groups/[groupId]/members.tsx`:

Add new imports:
```ts
import { useRouter } from "expo-router"; // already imported
```

Add new queries inside `MembersScreen()` after existing queries:
```ts
const prefsSuggestion = useQuery(
  api.rotationPreferences.suggestRotation,
  isForming ? { groupId: groupId as never } : "skip",
);
const allPrefs = useQuery(
  api.rotationPreferences.listForGroup,
  isForming ? { groupId: groupId as never } : "skip",
);
```

Add new state:
```ts
const [applyingSuggestion, setApplyingSuggestion] = useState(false);
```

Add `handleApplySuggestion` function:
```ts
const handleApplySuggestion = async () => {
  if (!prefsSuggestion) return;
  setApplyingSuggestion(true);
  try {
    const token = await getToken({ template: "convex" });
    const orderedMemberIds = prefsSuggestion.suggestion.map((s) => s.memberId);
    const res = await fetch(
      `${env.EXPO_PUBLIC_API_URL}/api/rotation/${groupId}/apply-rotation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedMemberIds }),
      },
    );
    if (!res.ok) throw new Error("Failed to apply rotation");
    Alert.alert(
      "Rotation applied",
      `${prefsSuggestion.gotTop2Count} of ${prefsSuggestion.totalMembers} members got a top-2 choice.`,
    );
  } catch {
    Alert.alert("Error", "Could not apply suggested rotation.");
  } finally {
    setApplyingSuggestion(false);
  }
};
```

Add the preferences progress block and suggest rotation button. Insert this block **after** the existing `canReorder` info banner (after the `{canReorder && (<View...>...)}` block) and **before** the `<Skeleton>` wrapper:

```tsx
{/* Member: Submit preferences card */}
{isForming && !isOrganizer && (
  <TouchableOpacity
    style={{
      backgroundColor: "#EFF6FF",
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    }}
    onPress={() => router.push(`/(app)/groups/${groupId}/rotation-preferences`)}
    activeOpacity={0.8}
  >
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#1E40AF" }}>
        Submit Rotation Preferences
      </Text>
      <Text style={{ fontSize: 12, color: "#3B82F6", marginTop: 2 }}>
        Tell the organizer which slot you prefer
      </Text>
    </View>
    <Text style={{ fontSize: 18 }}>→</Text>
  </TouchableOpacity>
)}

{/* Organizer: Preferences progress + suggest rotation */}
{canReorder && prefsSuggestion && (
  <View
    style={{
      backgroundColor: "#F0FDF8",
      borderRadius: 12,
      padding: 14,
      marginBottom: 12,
    }}
  >
    <Text style={{ fontSize: 13, fontWeight: "700", color: "#065F46", marginBottom: 6 }}>
      Rotation Preferences
    </Text>
    <Text style={{ fontSize: 12, color: "#374151", marginBottom: 10 }}>
      {prefsSuggestion.submittedCount} of {prefsSuggestion.totalMembers} members submitted
    </Text>
    {/* Progress bar */}
    <View
      style={{
        height: 6,
        backgroundColor: "#D1FAE5",
        borderRadius: 3,
        marginBottom: 12,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          height: "100%",
          backgroundColor: "#1D9E75",
          borderRadius: 3,
          width: `${prefsSuggestion.totalMembers > 0 ? (prefsSuggestion.submittedCount / prefsSuggestion.totalMembers) * 100 : 0}%`,
        }}
      />
    </View>
    <TouchableOpacity
      style={{
        backgroundColor: "#1D9E75",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
      }}
      onPress={handleApplySuggestion}
      disabled={applyingSuggestion}
    >
      {applyingSuggestion ? (
        <ActivityIndicator color="#ffffff" size="small" />
      ) : (
        <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>
          Apply Suggested Rotation ({prefsSuggestion.gotTop2Count}/{prefsSuggestion.totalMembers} satisfied)
        </Text>
      )}
    </TouchableOpacity>
  </View>
)}
```

- [ ] **Step 2: Type-check**

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

- [ ] **Step 3: Commit**

```bash
git add apps/native/app/\(app\)/groups/\[groupId\]/members.tsx
git commit -m "feat: add rotation preference progress and suggest rotation for organizer"
```

---

## Final Verification

- [ ] Run full type-check across all packages

```bash
cd C:/Users/poyhi/tikli && bun run check-types
```

Expected: no TypeScript errors

- [ ] Run linter

```bash
cd C:/Users/poyhi/tikli && bun run check
```

Expected: no lint errors (auto-fixed)

- [ ] Manual smoke test checklist
  - [ ] Profile screen shows Trust Score badge with tier label
  - [ ] Members list shows tier badge next to each member name
  - [ ] Payment row shows camera icon for own pending payment
  - [ ] Tapping camera icon → image picker → uploads proof → shows image icon
  - [ ] Organizer taps image icon → proof viewer opens → Confirm Payment taps through to mark modal
  - [ ] During forming group, non-organizer sees "Submit Rotation Preferences" card → taps → preference screen opens
  - [ ] Slot grid allows selecting up to 3 slots in order → submit saves
  - [ ] Organizer sees preference progress bar and "Apply Suggested Rotation" button
  - [ ] Applying suggestion reorders members and shows satisfaction count alert
