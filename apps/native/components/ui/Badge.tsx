import { Text, View } from "react-native";

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "info";

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: "#D1FAE5", text: "#065F46" },
  warning: { bg: "#FEF3C7", text: "#92400E" },
  error: { bg: "#FEE2E2", text: "#991B1B" },
  neutral: { bg: "#F3F4F6", text: "#374151" },
  info: { bg: "#DBEAFE", text: "#1E40AF" },
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "neutral" }: BadgeProps) {
  const { bg, text } = VARIANT_STYLES[variant];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: text, fontSize: 11, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/** Map group status to a badge variant */
export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "active": return "success";
    case "forming": return "info";
    case "completed": return "neutral";
    case "paused": return "warning";
    default: return "neutral";
  }
}
