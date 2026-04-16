import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getCurrentCycle = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    return await ctx.db
      .query("cycles")
      .withIndex("by_group_and_index", (q) =>
        q.eq("groupId", args.groupId).eq("cycleIndex", group.currentCycleIndex),
      )
      .unique();
  },
});

export const listForGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cycles")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect()
      .then((cycles) => cycles.sort((a, b) => a.cycleIndex - b.cycleIndex));
  },
});

export const getCompletedCycles = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const cycles = await ctx.db
      .query("cycles")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    return cycles
      .filter((c) => c.status === "completed")
      .sort((a, b) => a.cycleIndex - b.cycleIndex);
  },
});

export const completeCycle = mutation({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const cycle = await ctx.db.get(args.cycleId);
    if (!cycle) throw new Error("Cycle not found");
    if (cycle.status !== "active") throw new Error("Cycle is not active");

    const group = await ctx.db.get(cycle.groupId);
    if (!group) throw new Error("Group not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== group.organizerId) throw new Error("Not authorized");

    // Guard: cannot complete a cycle with pending payments
    const cyclePayments = await ctx.db
      .query("payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();
    const hasPending = cyclePayments.some((p) => p.status === "pending");
    if (hasPending) throw new Error("All payments must be resolved before completing the cycle");

    const now = Date.now();

    // Mark cycle completed
    await ctx.db.patch(args.cycleId, {
      status: "completed",
      completedAt: now,
    });

    // Mark recipient as having received their payout
    await ctx.db.patch(cycle.recipientMemberId, {
      cycleReceivedIndex: cycle.cycleIndex,
    });

    const nextCycleIndex = cycle.cycleIndex + 1;

    if (nextCycleIndex >= group.totalCycles) {
      // All cycles complete
      await ctx.db.patch(cycle.groupId, {
        status: "completed",
        updatedAt: now,
      });
    } else {
      // Activate the next cycle
      const nextCycle = await ctx.db
        .query("cycles")
        .withIndex("by_group_and_index", (q) =>
          q.eq("groupId", cycle.groupId).eq("cycleIndex", nextCycleIndex),
        )
        .unique();

      if (nextCycle) {
        await ctx.db.patch(nextCycle._id, { status: "active" });
      }

      await ctx.db.patch(cycle.groupId, {
        currentCycleIndex: nextCycleIndex,
        updatedAt: now,
      });
    }

    await ctx.db.insert("activityLog", {
      groupId: cycle.groupId,
      actorUserId: user._id,
      eventType: "cycle_completed",
      metadata: {
        cycleIndex: cycle.cycleIndex,
        recipientMemberId: cycle.recipientMemberId,
        totalCollected: cycle.totalCollected,
      },
      createdAt: now,
    });
  },
});
