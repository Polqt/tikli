import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function avatarColorFromString(str: string): string {
	const palette = [
		"#1D9E75",
		"#0EA5E9",
		"#8B5CF6",
		"#F59E0B",
		"#EF4444",
		"#EC4899",
		"#14B8A6",
		"#F97316",
	];
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return palette[Math.abs(hash) % palette.length] ?? "#1D9E75";
}

function avatarInitials(email: string, displayName?: string): string {
	if (displayName?.trim()) {
		const parts = displayName.trim().split(" ");
		if (parts.length >= 2) {
			return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
		}
		return displayName.trim().slice(0, 2).toUpperCase();
	}
	return email.split("@")[0]?.slice(0, 2).toUpperCase() ?? "??";
}

export const upsertUser = mutation({
	args: {
		email: v.string(),
		displayName: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Unauthenticated");

		const clerkId = identity.tokenIdentifier;
		const existing = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
			.unique();

		const now = Date.now();
		const initials = avatarInitials(args.email, args.displayName);
		const color = avatarColorFromString(clerkId);

		if (existing) {
			await ctx.db.patch(existing._id, {
				email: args.email,
				updatedAt: now,
				...(args.displayName ? { displayName: args.displayName } : {}),
			});
			return existing._id;
		}

		return await ctx.db.insert("users", {
			clerkId,
			email: args.email,
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

		const initials = avatarInitials(user.email, args.displayName);
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
