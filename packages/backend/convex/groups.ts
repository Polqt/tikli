import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { generateUniqueCode } from "./invites";

async function requireAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

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
      .map((m) => m.groupId);

    const groups = await Promise.all(activeIds.map((id) => ctx.db.get(id)));
    return groups.filter(Boolean);
  },
});

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

export const getByInviteCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.code))
      .unique();
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    contributionAmount: v.number(),
    frequency: v.union(v.literal("weekly"), v.literal("biweekly"), v.literal("monthly")),
    startDate: v.number(),
    maxMembers: v.number(),
    description: v.optional(v.string()),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Resolve user by clerkId passed from the Hono layer
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
    if (!user) throw new Error("User not found");

    const code = await generateUniqueCode(ctx);

    const now = Date.now();
    const potAmount = args.contributionAmount * args.maxMembers;

    const groupId = await ctx.db.insert("groups", {
      name: args.name,
      organizerId: user._id,
      contributionAmount: args.contributionAmount,
      frequency: args.frequency,
      startDate: args.startDate,
      maxMembers: args.maxMembers,
      status: "forming",
      inviteCode: code,
      currentCycleIndex: 0,
      totalCycles: args.maxMembers,
      potAmount,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    // Organizer becomes the first member (rotation order 1)
    await ctx.db.insert("groupMembers", {
      groupId,
      userId: user._id,
      rotationOrder: 1,
      status: "active",
      joinedAt: now,
    });

    // Create invite record
    await ctx.db.insert("invites", {
      groupId,
      code,
      createdByUserId: user._id,
      useCount: 0,
      isActive: true,
      createdAt: now,
    });

    await ctx.db.insert("activityLog", {
      groupId,
      actorUserId: user._id,
      eventType: "group_activated",
      metadata: { action: "group_created", groupName: args.name },
      createdAt: now,
    });

    return groupId;
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("groups"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (user._id !== group.organizerId) throw new Error("Not authorized");

    await ctx.db.patch(args.groupId, {
      ...(args.name ? { name: args.name } : {}),
      ...(args.description !== undefined ? { description: args.description } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const activateGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.status !== "forming") throw new Error("Group is not in forming state");
    if (user._id !== group.organizerId) throw new Error("Not authorized");

    const allMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    const activeMembers = allMembers
      .filter((m) => m.status === "active")
      .sort((a, b) => a.rotationOrder - b.rotationOrder);

    if (activeMembers.length < 2) throw new Error("Need at least 2 members to activate");

    const now = Date.now();
    const potAmount = group.contributionAmount * activeMembers.length;

    await ctx.db.patch(args.groupId, {
      status: "active",
      totalCycles: activeMembers.length,
      potAmount,
      updatedAt: now,
    });

    // Pre-generate all cycles and payment records
    for (let i = 0; i < activeMembers.length; i++) {
      const member = activeMembers[i]!;
      const cycleStart = computeCycleDate(group.startDate, group.frequency, i);
      const cycleEnd = computeCycleDate(group.startDate, group.frequency, i + 1) - 1;

      const cycleId = await ctx.db.insert("cycles", {
        groupId: args.groupId,
        cycleIndex: i,
        startDate: cycleStart,
        endDate: cycleEnd,
        payoutDate: cycleEnd,
        recipientMemberId: member._id,
        status: i === 0 ? "active" : "upcoming",
        potAmount,
        totalCollected: 0,
      });

      for (const m of activeMembers) {
        await ctx.db.insert("payments", {
          groupId: args.groupId,
          cycleId,
          memberId: m._id,
          amount: group.contributionAmount,
          status: "pending",
          createdAt: now,
        });
      }
    }

    await ctx.db.insert("activityLog", {
      groupId: args.groupId,
      actorUserId: user._id,
      eventType: "group_activated",
      metadata: { memberCount: activeMembers.length, potAmount },
      createdAt: now,
    });
  },
});

export const pauseGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (user._id !== group.organizerId) throw new Error("Not authorized");

    await ctx.db.patch(args.groupId, { status: "paused", updatedAt: Date.now() });
    await ctx.db.insert("activityLog", {
      groupId: args.groupId,
      actorUserId: user._id,
      eventType: "group_paused",
      metadata: {},
      createdAt: Date.now(),
    });
  },
});

export const resumeGroup = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (user._id !== group.organizerId) throw new Error("Not authorized");

    await ctx.db.patch(args.groupId, { status: "active", updatedAt: Date.now() });
    await ctx.db.insert("activityLog", {
      groupId: args.groupId,
      actorUserId: user._id,
      eventType: "group_resumed",
      metadata: {},
      createdAt: Date.now(),
    });
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeCycleDate(
  startDate: number,
  frequency: "weekly" | "biweekly" | "monthly",
  offset: number,
): number {
  const d = new Date(startDate);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + offset * 7);
  } else if (frequency === "biweekly") {
    d.setDate(d.getDate() + offset * 14);
  } else {
    d.setMonth(d.getMonth() + offset);
  }
  return d.getTime();
}
