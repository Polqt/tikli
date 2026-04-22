/**
 * Format a due date as a human-friendly string (e.g. "today", "tomorrow", weekday, or date).
 */
export function formatDueDate(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  const diff = Math.round((d.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 6) return d.toLocaleDateString("en-PH", { weekday: "long" });
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
