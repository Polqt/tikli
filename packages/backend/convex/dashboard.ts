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

    // Get all user memberships
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeMemberships = memberships.filter((m) => m.status === "active");
    const groupIds = activeMemberships.map((m) => m.groupId);
    const groups = (await Promise.all(groupIds.map((id) => ctx.db.get(id)))).filter(Boolean);
    const activeGroups = groups.filter((g) => g!.status === "active");

    // Find upcoming payouts (cycles where this user is the recipient)
    const upcomingPayouts = [];
    for (const membership of activeMemberships) {
      const cycles = await ctx.db
        .query("cycles")
        .withIndex("by_recipient", (q) => q.eq("recipientMemberId", membership._id))
        .collect();
      const upcoming = cycles.filter((c) => c.status === "active" || c.status === "upcoming");
      upcomingPayouts.push(...upcoming.map((c) => ({ ...c, membershipId: membership._id })));
    }

    // Find pending payments for the current user
    const pendingPayments = [];
    for (const membership of activeMemberships) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_member", (q) => q.eq("memberId", membership._id))
        .collect();
      const pending = payments.filter((p) => p.status === "pending");
      pendingPayments.push(...pending);
    }

    return {
      activeGroupCount: activeGroups.length,
      totalGroupCount: groups.length,
      upcomingPayouts,
      pendingPaymentCount: pendingPayments.length,
    };
  },
});
