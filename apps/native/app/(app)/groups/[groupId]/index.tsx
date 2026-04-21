import { Ionicons } from "@expo/vector-icons";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { FREQUENCY_LABEL } from "@/types";
import type { Frequency } from "@/types";

const GROUP_COLORS = ["#E0533D", "#E78C9D", "#EED868", "#377CC8", "#469B88", "#9DA7D0"];

function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length]!;
}

function isLightColor(hex: string): boolean {
  return hex === "#EED868";
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 15, gap: 14 }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(36,36,36,0.07)", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={17} color="#242424" />
      </View>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: "#242424" }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={14} color="#242424" style={{ opacity: 0.2 }} />
    </TouchableOpacity>
  );
}

const DIV = <View style={{ height: 1, backgroundColor: "rgba(36,36,36,0.07)", marginLeft: 50 }} />;

export default function GroupOverviewScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, { groupId: groupId as never });
  const cyclePaymentSummary = useQuery(
    api.payments.getCyclePaymentSummary,
    currentCycle ? { cycleId: currentCycle._id } : "skip",
  );
  const activityLogs = useQuery(api.activityLog.listForGroup, { groupId: groupId as never, limit: 5 });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const isLoading = group === undefined;

  if (!isLoading && !group) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
        <EmptyState icon="🔍" title="Group not found" description="This group may have been deleted." />
      </View>
    );
  }

  const isOrganizer = group && memberForUser && group.organizerId === memberForUser.userId;
  const groupColor = group ? colorForName(group.name) : "#242424";
  const lightHeader = isLightColor(groupColor);
  const headerTextColor = lightHeader ? "#242424" : "#ffffff";
  const headerSubColor = lightHeader ? "rgba(36,36,36,0.55)" : "rgba(255,255,255,0.65)";

  const paidProgress =
    cyclePaymentSummary && cyclePaymentSummary.total > 0
      ? cyclePaymentSummary.paid / cyclePaymentSummary.total
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        {/* Color header bar */}
        <View style={{ backgroundColor: isLoading ? "#242424" : groupColor, paddingTop: insets.top + 12, paddingBottom: 24, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" }}
            >
              <Ionicons name="chevron-back" size={20} color={headerTextColor} />
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                onPress={() => router.push(`/(app)/groups/${groupId}/settings`)}
                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(0,0,0,0.15)", alignItems: "center", justifyContent: "center" }}
              >
                <Ionicons name="settings-outline" size={18} color={headerTextColor} />
              </TouchableOpacity>
            )}
          </View>

          <Skeleton
            isLoading={isLoading}
            skeleton={
              <View style={{ gap: 8 }}>
                <SkeletonBlock style={{ width: "60%", height: 26 }} />
                <SkeletonBlock style={{ width: "35%", height: 14 }} />
              </View>
            }
          >
            {group && (
              <>
                <Text style={{ fontSize: 22, fontWeight: "800", color: headerTextColor, letterSpacing: -0.4, marginBottom: 4 }}>
                  {group.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: headerSubColor }} />
                  <Text style={{ fontSize: 13, color: headerSubColor, fontWeight: "500", textTransform: "capitalize" }}>
                    {group.status} · {FREQUENCY_LABEL[group.frequency as Frequency] ?? group.frequency}
                  </Text>
                </View>
              </>
            )}
          </Skeleton>
        </View>

        {/* Key stats row */}
        {group && (
          <View style={{ flexDirection: "row", backgroundColor: "#ffffff", borderBottomWidth: 1, borderBottomColor: "rgba(36,36,36,0.06)" }}>
            {[
              { label: "Pot Size", value: <CurrencyText centavos={group.potAmount} style={{ fontSize: 18, fontWeight: "700", color: "#242424" }} /> },
              { label: "Members", value: <Text style={{ fontSize: 18, fontWeight: "700", color: "#242424" }}>{group.maxMembers}</Text> },
              { label: "Frequency", value: <Text style={{ fontSize: 15, fontWeight: "700", color: "#242424" }}>{FREQUENCY_LABEL[group.frequency as Frequency] ?? group.frequency}</Text> },
            ].map((stat, i) => (
              <View key={stat.label} style={{ flex: 1, alignItems: "center", paddingVertical: 16, borderLeftWidth: i > 0 ? 1 : 0, borderLeftColor: "rgba(36,36,36,0.07)" }}>
                <Text style={{ fontSize: 10, fontWeight: "800", color: "rgba(36,36,36,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                  {stat.label}
                </Text>
                {stat.value}
              </View>
            ))}
          </View>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          {/* Active: cycle strip */}
          {group?.status === "active" && currentCycle && (
            <TouchableOpacity
              style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16, marginBottom: 24 }}
              onPress={() => router.push(`/(app)/groups/${groupId}/payments`)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#242424" }}>
                  Cycle {group.currentCycleIndex + 1}/{group.totalCycles}
                </Text>
                <Text style={{ fontSize: 12, color: "rgba(36,36,36,0.4)", fontWeight: "500" }}>
                  {cyclePaymentSummary ? `${cyclePaymentSummary.paid}/${cyclePaymentSummary.total} paid` : ""}
                  {currentCycle.endDate ? ` · Due ${new Date(currentCycle.endDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}` : ""}
                </Text>
              </View>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: "rgba(36,36,36,0.07)", overflow: "hidden" }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: "#1D9E75", width: `${Math.round(paidProgress * 100)}%` }} />
              </View>
            </TouchableOpacity>
          )}

          {/* Forming: invite */}
          {group?.status === "forming" && (
            <View style={{ marginBottom: 24 }}>
              <InviteCodeCard code={group.inviteCode} />
              {isOrganizer && (
                <TouchableOpacity
                  style={{ backgroundColor: "#242424", paddingVertical: 15, borderRadius: 999, alignItems: "center", marginTop: 14 }}
                  onPress={() => router.push(`/(app)/groups/${groupId}/members`)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Manage Members & Start</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* MANAGE section */}
          <Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.32, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
            Manage
          </Text>
          <Row icon="people-outline" label="Members & Rotation" onPress={() => router.push(`/(app)/groups/${groupId}/members`)} />
          {DIV}
          {group?.status !== "forming" && (
            <>
              <Row icon="card-outline" label="Payments" onPress={() => router.push(`/(app)/groups/${groupId}/payments`)} />
              {DIV}
            </>
          )}
          <Row icon="time-outline" label="Activity" onPress={() => router.push(`/(app)/groups/${groupId}/history`)} />

          {/* Recent activity */}
          {activityLogs && activityLogs.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.32, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>
                Recent
              </Text>
              {activityLogs.map((log, i) => (
                <View
                  key={log._id}
                  style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: "rgba(36,36,36,0.06)" }}
                >
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#1D9E75", marginRight: 14 }} />
                  <Text style={{ flex: 1, fontSize: 13, color: "#242424", fontWeight: "500" }}>
                    {log.eventType.replace(/_/g, " ")}
                  </Text>
                  <Text style={{ fontSize: 11, color: "rgba(36,36,36,0.35)", fontWeight: "500" }}>
                    {(() => {
                      const diff = Date.now() - log.createdAt;
                      const mins = Math.floor(diff / 60000);
                      if (mins < 1) return "just now";
                      if (mins < 60) return `${mins}m ago`;
                      const h = Math.floor(mins / 60);
                      if (h < 24) return `${h}h ago`;
                      return `${Math.floor(h / 24)}d ago`;
                    })()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
