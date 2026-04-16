import { Avatar } from "@/components/ui/Avatar";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { useRouter } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";

interface GroupCardProps {
  group: {
    _id: string;
    name: string;
    status: string;
    potAmount: number;
    currentCycleIndex: number;
    totalCycles: number;
    frequency: string;
  };
}

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

export function GroupCard({ group }: GroupCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
      onPress={() => router.push(`/(app)/groups/${group._id}`)}
      activeOpacity={0.7}
      accessibilityLabel={`Open ${group.name} group`}
    >
      <Avatar name={group.name} size="lg" />

      <View style={{ flex: 1, marginLeft: 14 }}>
        <Text
          style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 4 }}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Badge label={group.status.charAt(0).toUpperCase() + group.status.slice(1)} variant={statusBadgeVariant(group.status)} />
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
            {FREQUENCY_LABEL[group.frequency] ?? group.frequency}
          </Text>
        </View>
        <CurrencyText
          centavos={group.potAmount}
          style={{ fontSize: 15, fontWeight: "700", color: "#1D9E75" }}
        />
      </View>

      {group.status === "active" && (
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Cycle</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#374151" }}>
            {group.currentCycleIndex + 1}/{group.totalCycles}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
