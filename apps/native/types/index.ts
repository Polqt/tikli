export type GroupStatus = "forming" | "active" | "completed" | "paused";
export type Frequency = "weekly" | "biweekly" | "monthly";
export type PaymentStatus = "pending" | "paid" | "late" | "excused";
export type CycleStatus = "upcoming" | "active" | "completed" | "skipped";

export type EventType =
	| "payment_marked"
	| "member_joined"
	| "member_removed"
	| "cycle_started"
	| "cycle_completed"
	| "rotation_reordered"
	| "group_paused"
	| "group_resumed"
	| "group_activated";

export const FREQUENCY_LABEL: Record<Frequency, string> = {
	weekly: "Weekly",
	biweekly: "Bi-weekly",
	monthly: "Monthly",
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
	payment_marked: "Payment marked",
	member_joined: "New member joined",
	member_removed: "Member removed",
	cycle_started: "Cycle started",
	cycle_completed: "Cycle completed",
	rotation_reordered: "Rotation reordered",
	group_paused: "Group paused",
	group_resumed: "Group resumed",
	group_activated: "Group activated",
};
