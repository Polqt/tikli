import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    phoneNumber: v.optional(v.string()),
    displayName: v.optional(v.string()),
    avatarInitials: v.string(),
    avatarColor: v.string(),
    expoPushToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  groups: defineTable({
    name: v.string(),
    organizerId: v.id("users"),
    contributionAmount: v.number(), // centavos (₱1,000 = 100000)
    frequency: v.union(
      v.literal("weekly"),
      v.literal("biweekly"),
      v.literal("monthly"),
    ),
    startDate: v.number(), // Unix ms timestamp
    maxMembers: v.number(),
    status: v.union(
      v.literal("forming"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused"),
    ),
    inviteCode: v.string(), // 6-char alphanumeric
    currentCycleIndex: v.number(), // 0-based
    totalCycles: v.number(), // equals maxMembers
    potAmount: v.number(), // contributionAmount × memberCount (centavos)
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organizer", ["organizerId"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_status", ["status"]),

  groupMembers: defineTable({
    groupId: v.id("groups"),
    userId: v.id("users"),
    rotationOrder: v.number(), // 1-based position in rotation queue
    status: v.union(v.literal("active"), v.literal("removed")),
    joinedAt: v.number(),
    cycleReceivedIndex: v.optional(v.number()), // which cycle they received payout
    nickname: v.optional(v.string()),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_group_and_user", ["groupId", "userId"])
    .index("by_group_and_rotation", ["groupId", "rotationOrder"]),

  cycles: defineTable({
    groupId: v.id("groups"),
    cycleIndex: v.number(), // 0-based
    startDate: v.number(),
    endDate: v.number(), // contribution due date
    payoutDate: v.number(),
    recipientMemberId: v.id("groupMembers"),
    status: v.union(
      v.literal("upcoming"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("skipped"),
    ),
    potAmount: v.number(), // snapshot at cycle creation (centavos)
    totalCollected: v.number(), // running sum of marked payments
    completedAt: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_group_and_index", ["groupId", "cycleIndex"])
    .index("by_recipient", ["recipientMemberId"]),

  payments: defineTable({
    groupId: v.id("groups"),
    cycleId: v.id("cycles"),
    memberId: v.id("groupMembers"),
    amount: v.number(), // centavos
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("late"),
      v.literal("excused"),
    ),
    markedByUserId: v.optional(v.id("users")),
    markedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_cycle", ["cycleId"])
    .index("by_group", ["groupId"])
    .index("by_member", ["memberId"])
    .index("by_cycle_and_member", ["cycleId", "memberId"]),

  invites: defineTable({
    groupId: v.id("groups"),
    code: v.string(), // 6-char (mirrors groups.inviteCode)
    createdByUserId: v.id("users"),
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    useCount: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_group", ["groupId"]),

  notificationPreferences: defineTable({
    userId: v.id("users"),
    groupId: v.id("groups"),
    paymentDueReminder: v.boolean(),
    payoutDayReminder: v.boolean(),
    newMemberJoined: v.boolean(),
    paymentMarked: v.boolean(),
    reminderDaysBefore: v.number(),
  })
    .index("by_user_and_group", ["userId", "groupId"])
    .index("by_user", ["userId"]),

  activityLog: defineTable({
    groupId: v.id("groups"),
    actorUserId: v.id("users"),
    eventType: v.union(
      v.literal("payment_marked"),
      v.literal("member_joined"),
      v.literal("member_removed"),
      v.literal("cycle_started"),
      v.literal("cycle_completed"),
      v.literal("rotation_reordered"),
      v.literal("group_paused"),
      v.literal("group_resumed"),
      v.literal("group_activated"),
    ),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_and_time", ["groupId", "createdAt"]),
});
