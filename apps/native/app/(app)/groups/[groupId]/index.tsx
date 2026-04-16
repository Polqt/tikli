import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, statusBadgeVariant } from "@/components/ui/Badge";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FREQUENCY_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
};

export default function GroupOverviewScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const currentCycle = useQuery(api.cycles.getCurrentCycle, { groupId: groupId as never });
  const cyclePaymentSummary = useQuery(
    api.payments.getCyclePaymentSummary,
    currentCycle ? { cycleId: currentCycle._id } : "skip",
  );
  const activityLogs = useQuery(api.activityLog.listForGroup, {
    groupId: groupId as never,
    limit: 5,
  });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const isLoading = group === undefined;

  if (!isLoading && !group) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <EmptyState icon="🔍" title="Group not found" description="This group may have been deleted." />
      </SafeAreaView>
    );
  }

  const isOrganizer = group && memberForUser && (group.organizerId === memberForUser.userId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#ffffff",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 20,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={{ fontSize: 22 }}>←</Text>
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                style={{ marginLeft: "auto" }}
                onPress={() => router.push(`/(app)/groups/${groupId}/settings`)}
              >
                <Text style={{ fontSize: 20 }}>⚙️</Text>
              </TouchableOpacity>
            )}
          </View>

          <Skeleton
            isLoading={isLoading}
            skeleton={
              <View style={{ gap: 10 }}>
                <SkeletonBlock width={56} height={56} borderRadius={16} />
                <SkeletonBlock width="60%" height={24} />
                <SkeletonBlock width="40%" height={16} />
              </View>
            }
          >
            {group && (
              <>
                <Avatar name={group.name} size="lg" />
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "800",
                    color: "#111827",
                    marginTop: 12,
                    marginBottom: 4,
                  }}
                >
                  {group.name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Badge
                    label={group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                    variant={statusBadgeVariant(group.status)}
                  />
                  <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
                    {FREQUENCY_LABEL[group.frequency] ?? group.frequency}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 24 }}>
                  <View>
                    <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Pot Size</Text>
                    <CurrencyText
                      centavos={group.potAmount}
                      style={{ fontSize: 18, fontWeight: "800", color: "#1D9E75" }}
                    />
                  </View>
                  {group.status === "active" && (
                    <View>
                      <Text style={{ fontSize: 11, color: "#9CA3AF" }}>Cycle</Text>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: "#374151" }}>
                        {group.currentCycleIndex + 1}/{group.totalCycles}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </Skeleton>
        </View>

        <View style={{ padding: 20, gap: 16 }}>
          {/* Current Cycle Card */}
          {group?.status === "active" && currentCycle && (
            <View
              style={{
                backgroundColor: "#ffffff",
                borderRadius: 16,
                padding: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 12 }}>
                CURRENT CYCLE
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, color: "#374151", marginBottom: 2 }}>
                    Due{" "}
                    {new Date(currentCycle.endDate).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                  <CurrencyText
                    centavos={currentCycle.potAmount}
                    style={{ fontSize: 20, fontWeight: "800", color: "#111827" }}
                  />
                </View>
              </View>
              {/* Progress bar */}
              {cyclePaymentSummary && (
                <View>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: "#F3F4F6",
                      borderRadius: 4,
                      overflow: "hidden",
                      marginBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#1D9E75",
                        width: `${cyclePaymentSummary.percentage}%`,
                      }}
                    />
                  </View>
                  <Text style={{ fontSize: 12, color: "#6B7280" }}>
                    {cyclePaymentSummary.paid}/{cyclePaymentSummary.total} members paid
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={{ marginTop: 12 }}
                onPress={() => router.push(`/(app)/groups/${groupId}/payments`)}
              >
                <Text style={{ color: "#1D9E75", fontWeight: "700", fontSize: 14 }}>
                  View Payments →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Invite Code Card (forming only) */}
          {group?.status === "forming" && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
                Invite Members
              </Text>
              <InviteCodeCard code={group.inviteCode} />
              {isOrganizer && (
                <TouchableOpacity
                  style={{
                    backgroundColor: "#1D9E75",
                    paddingVertical: 14,
                    borderRadius: 14,
                    alignItems: "center",
                    marginTop: 16,
                  }}
                  onPress={() => router.push(`/(app)/groups/${groupId}/members`)}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
                    Manage Members & Start
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Navigation Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { label: "Members", icon: "👥", route: "members" },
              { label: "Payments", icon: "💳", route: "payments" },
              { label: "History", icon: "📋", route: "history" },
            ].map((item) => (
              <TouchableOpacity
                key={item.route}
                style={{
                  flex: 1,
                  minWidth: "30%",
                  backgroundColor: "#ffffff",
                  borderRadius: 14,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 3,
                  elevation: 1,
                }}
                onPress={() => router.push(`/(app)/groups/${groupId}/${item.route}`)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Activity Feed */}
          {activityLogs && activityLogs.length > 0 && (
            <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#6B7280", marginBottom: 12 }}>
                RECENT ACTIVITY
              </Text>
              {activityLogs.map((log) => (
                <View
                  key={log._id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderBottomColor: "#F9FAFB",
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#1D9E75",
                      marginRight: 10,
                    }}
                  />
                  <Text style={{ flex: 1, fontSize: 13, color: "#374151" }}>
                    {formatEventType(log.eventType)}
                  </Text>
                  <Text style={{ fontSize: 11, color: "#9CA3AF" }}>
                    {formatTimeAgo(log.createdAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatEventType(eventType: string): string {
  switch (eventType) {
    case "payment_marked": return "Payment marked";
    case "member_joined": return "New member joined";
    case "member_removed": return "Member removed";
    case "cycle_started": return "Cycle started";
    case "cycle_completed": return "Cycle completed";
    case "rotation_reordered": return "Rotation reordered";
    case "group_paused": return "Group paused";
    case "group_resumed": return "Group resumed";
    case "group_activated": return "Group activated";
    default: return eventType;
  }
}

function formatTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
