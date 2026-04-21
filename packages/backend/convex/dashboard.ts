import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

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
    const groups = (await Promise.all(groupIds.map((id) => ctx.db.get(id)))).filter(Boolean) as Doc<"groups">[];
    const nonCompletedGroups = groups.filter((g) => g.status === "active" || g.status === "forming" || g.status === "paused");

    // Pending payments for hero state
    const pendingPayments: Array<{ payment: Doc<"payments">; group: Doc<"groups"> }> = [];
    for (const membership of activeMemberships) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_member", (q) => q.eq("memberId", membership._id))
        .collect();
      for (const p of payments) {
        if (p.status === "pending") {
          const g = groups.find((gr) => gr._id === p.groupId);
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
      const group = groups.find((g) => g._id === first.groupId);
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
        const group = groups.find((g) => g._id === membership.groupId);
        if (!group) return null;

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
