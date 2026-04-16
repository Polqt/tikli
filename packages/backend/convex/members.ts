import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForGroup = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active");

    // Join user data
    const withUsers = await Promise.all(
      activeMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return { ...m, user };
      }),
    );

    return withUsers.sort((a, b) => a.rotationOrder - b.rotationOrder);
  },
});

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

export const getMemberForUser = query({
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
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", args.groupId).eq("userId", user._id),
      )
      .unique();
  },
});

export const reorderRotation = mutation({
  args: {
    groupId: v.id("groups"),
    orderedMemberIds: v.array(v.id("groupMembers")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");
    if (group.status !== "forming") throw new Error("Can only reorder during forming stage");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== group.organizerId) throw new Error("Not authorized");

    // Update rotation order for each member
    await Promise.all(
      args.orderedMemberIds.map(async (memberId, index) => {
        await ctx.db.patch(memberId, { rotationOrder: index + 1 });
      }),
    );

    await ctx.db.insert("activityLog", {
      groupId: args.groupId,
      actorUserId: user._id,
      eventType: "rotation_reordered",
      metadata: { orderCount: args.orderedMemberIds.length },
      createdAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: { memberId: v.id("groupMembers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const member = await ctx.db.get(args.memberId);
    if (!member) throw new Error("Member not found");

    const group = await ctx.db.get(member.groupId);
    if (!group) throw new Error("Group not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== group.organizerId) throw new Error("Not authorized");

    await ctx.db.patch(args.memberId, { status: "removed" });

    await ctx.db.insert("activityLog", {
      groupId: member.groupId,
      actorUserId: user._id,
      eventType: "member_removed",
      metadata: { removedMemberId: args.memberId },
      createdAt: Date.now(),
    });
  },
});
