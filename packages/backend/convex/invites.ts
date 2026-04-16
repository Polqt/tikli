import { v } from "convex/values";
import { mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Generate a collision-free 6-char invite code inside a mutation. */
export async function generateUniqueCode(ctx: MutationCtx): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = randomCode();
    const existing = await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .unique();
    if (!existing) return code;
  }
  throw new Error("Failed to generate a unique invite code after 20 attempts");
}

export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const group = await ctx.db
      .query("groups")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.code))
      .unique();
    if (!group) throw new Error("Invalid invite code");
    if (group.status !== "forming") throw new Error("This group is no longer accepting members");

    // Check if already a member
    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("by_group_and_user", (q) =>
        q.eq("groupId", group._id).eq("userId", user._id),
      )
      .unique();
    if (existing) throw new Error("Already a member of this group");

    // Count active members
    const allMembers = await ctx.db
      .query("groupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", group._id))
      .collect();
    const activeMembers = allMembers.filter((m) => m.status === "active");

    if (activeMembers.length >= group.maxMembers) {
      throw new Error("This group is full");
    }

    const now = Date.now();
    const rotationOrder = activeMembers.length + 1;

    const memberId = await ctx.db.insert("groupMembers", {
      groupId: group._id,
      userId: user._id,
      rotationOrder,
      status: "active",
      joinedAt: now,
    });

    // Update invite useCount
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (invite) {
      await ctx.db.patch(invite._id, { useCount: invite.useCount + 1 });
    }

    await ctx.db.insert("activityLog", {
      groupId: group._id,
      actorUserId: user._id,
      eventType: "member_joined",
      metadata: { memberId, rotationOrder },
      createdAt: now,
    });

    return { groupId: group._id, memberId };
  },
});

export const regenerateInviteCode = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Group not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user || user._id !== group.organizerId) throw new Error("Not authorized");

    const newCode = await generateUniqueCode(ctx);

    // Deactivate old invite
    const oldInvite = await ctx.db
      .query("invites")
      .withIndex("by_code", (q) => q.eq("code", group.inviteCode))
      .unique();
    if (oldInvite) {
      await ctx.db.patch(oldInvite._id, { isActive: false });
    }

    await ctx.db.insert("invites", {
      groupId: args.groupId,
      code: newCode,
      createdByUserId: user._id,
      useCount: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.groupId, {
      inviteCode: newCode,
      updatedAt: Date.now(),
    });

    return newCode;
  },
});
