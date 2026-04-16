import { v } from "convex/values";
import { query } from "./_generated/server";

export const listForGroup = query({
  args: {
    groupId: v.id("groups"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const logs = await ctx.db
      .query("activityLog")
      .withIndex("by_group_and_time", (q) => q.eq("groupId", args.groupId))
      .order("desc")
      .take(limit);

    // Join actor user data
    return await Promise.all(
      logs.map(async (log) => {
        const actor = await ctx.db.get(log.actorUserId);
        return { ...log, actor };
      }),
    );
  },
});
