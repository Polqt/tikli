import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const listForCycle = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    // Join member + user data
    return await Promise.all(
      payments.map(async (p) => {
        const member = await ctx.db.get(p.memberId);
        const user = member ? await ctx.db.get(member.userId) : null;
        return { ...p, member, user };
      }),
    );
  },
});

export const listForMember = query({
  args: { memberId: v.id("groupMembers") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("payments")
      .withIndex("by_member", (q) => q.eq("memberId", args.memberId))
      .collect();
  },
});

export const getCyclePaymentSummary = query({
  args: { cycleId: v.id("cycles") },
  handler: async (ctx, args) => {
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_cycle", (q) => q.eq("cycleId", args.cycleId))
      .collect();

    const total = payments.length;
    const paid = payments.filter(
      (p) => p.status === "paid" || p.status === "late" || p.status === "excused",
    ).length;

    return {
      paid,
      total,
      percentage: total > 0 ? Math.round((paid / total) * 100) : 0,
    };
  },
});

export const markPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    status: v.union(v.literal("paid"), v.literal("late"), v.literal("excused")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const group = await ctx.db.get(payment.groupId);
    if (!group) throw new Error("Group not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== group.organizerId) throw new Error("Not authorized");

    const now = Date.now();
    await ctx.db.patch(args.paymentId, {
      status: args.status,
      markedByUserId: user._id,
      markedAt: now,
      notes: args.notes,
    });

    // Update cycle totalCollected based on status transition
    const wasAlreadyCounted =
      payment.status === "paid" || payment.status === "late";
    const willBeCounted = args.status === "paid" || args.status === "late";

    if (!wasAlreadyCounted && willBeCounted) {
      // Transitioning into a counted state — increment
      const cycle = await ctx.db.get(payment.cycleId);
      if (cycle) {
        await ctx.db.patch(payment.cycleId, {
          totalCollected: cycle.totalCollected + payment.amount,
        });
      }
    } else if (wasAlreadyCounted && !willBeCounted) {
      // Transitioning out of a counted state — decrement
      const cycle = await ctx.db.get(payment.cycleId);
      if (cycle) {
        await ctx.db.patch(payment.cycleId, {
          totalCollected: Math.max(0, cycle.totalCollected - payment.amount),
        });
      }
    }

    await ctx.db.insert("activityLog", {
      groupId: payment.groupId,
      actorUserId: user._id,
      eventType: "payment_marked",
      metadata: {
        paymentId: args.paymentId,
        memberId: payment.memberId,
        status: args.status,
      },
      createdAt: now,
    });
  },
});

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
    const cycleDeltas = new Map<Id<"cycles">, number>();

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
        // Transitioning into counted state — add to delta
        cycleDeltas.set(payment.cycleId, (cycleDeltas.get(payment.cycleId) ?? 0) + payment.amount);
      } else if (wasAlreadyCounted && !willBeCounted) {
        // Transitioning out of counted state — subtract from delta
        cycleDeltas.set(payment.cycleId, (cycleDeltas.get(payment.cycleId) ?? 0) - payment.amount);
      }
    }

    // Apply all cycle deltas in a single patch per cycle (delta may be negative for downgrades)
    for (const [cycleId, delta] of cycleDeltas) {
      const cycle = await ctx.db.get(cycleId);
      if (cycle) {
        await ctx.db.patch(cycleId, {
          totalCollected: Math.max(0, cycle.totalCollected + delta),
        });
      }
    }
  },
});
