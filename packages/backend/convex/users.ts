import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Deterministic avatar color from a string
function avatarColorFromString(str: string): string {
  const palette = [
    "#1D9E75", "#0EA5E9", "#8B5CF6", "#F59E0B",
    "#EF4444", "#EC4899", "#14B8A6", "#F97316",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length] ?? "#1D9E75";
}

function avatarInitials(phoneNumber: string, displayName?: string): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return displayName.trim().slice(0, 2).toUpperCase();
  }
  // Use last 2 digits of phone number
  return phoneNumber.slice(-2);
}

export const upsertUser = mutation({
  args: {
    clerkId: v.string(),
    phoneNumber: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    const now = Date.now();
    const initials = avatarInitials(args.phoneNumber, args.displayName);
    const color = avatarColorFromString(args.clerkId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        phoneNumber: args.phoneNumber,
        updatedAt: now,
        ...(args.displayName ? { displayName: args.displayName } : {}),
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      phoneNumber: args.phoneNumber,
      displayName: args.displayName,
      avatarInitials: initials,
      avatarColor: color,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const updateProfile = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    const initials = avatarInitials(user.phoneNumber, args.displayName);
    await ctx.db.patch(user._id, {
      displayName: args.displayName,
      avatarInitials: initials,
      updatedAt: Date.now(),
    });
  },
});

export const updatePushToken = mutation({
  args: { expoPushToken: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.tokenIdentifier))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      expoPushToken: args.expoPushToken,
      updatedAt: Date.now(),
    });
  },
});
