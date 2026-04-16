import { Avatar } from "@/components/ui/Avatar";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  const { convexProfile } = useCurrentUser();
  const router = useRouter();
  const dashboardData = useQuery(api.dashboard.getDashboardData);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          {/* Greeting */}
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 24, gap: 12 }}>
            <Avatar
              name={convexProfile?.displayName}
              phone={convexProfile?.phoneNumber}
              color={convexProfile?.avatarColor}
              size="lg"
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, color: "#6B7280" }}>Good day,</Text>
              <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827" }} numberOfLines={1}>
                {convexProfile?.displayName ?? convexProfile?.phoneNumber ?? "Welcome!"}
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <Skeleton
            isLoading={dashboardData === undefined}
            skeleton={
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                {Array.from({ length: 2 }).map((_, i) => (
                  <View key={i} style={{ flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16 }}>
                    <SkeletonBlock width="60%" height={12} style={{ marginBottom: 8 }} />
                    <SkeletonBlock width="40%" height={24} />
                  </View>
                ))}
              </View>
            }
          >
            {dashboardData && (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#1D9E75",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#A7F3D0", marginBottom: 4 }}>Active Groups</Text>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: "#ffffff" }}>
                    {dashboardData.activeGroupCount}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: "#ffffff",
                    borderRadius: 16,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 4 }}>Pending Payments</Text>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: dashboardData.pendingPaymentCount > 0 ? "#EF4444" : "#111827" }}>
                    {dashboardData.pendingPaymentCount}
                  </Text>
                </View>
              </View>
            )}
          </Skeleton>

          {/* Upcoming Payouts */}
          {dashboardData?.upcomingPayouts && dashboardData.upcomingPayouts.length > 0 && (
            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 }}>
                Your Upcoming Payouts
              </Text>
              {dashboardData.upcomingPayouts.map((payout) => (
                <TouchableOpacity
                  key={payout._id}
                  style={{
                    backgroundColor: "#F0FDF8",
                    borderRadius: 14,
                    padding: 16,
                    marginBottom: 8,
                    borderWidth: 1.5,
                    borderColor: "#1D9E75",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onPress={() => router.push(`/(app)/groups/${payout.groupId}`)}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text style={{ fontSize: 13, color: "#1D9E75", fontWeight: "700", marginBottom: 2 }}>
                      🎉 You receive the pot!
                    </Text>
                    <Text style={{ fontSize: 12, color: "#6B7280" }}>
                      Due{" "}
                      {new Date(payout.payoutDate).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <CurrencyText
                    centavos={payout.potAmount}
                    style={{ fontSize: 18, fontWeight: "800", color: "#1D9E75" }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Empty state */}
          {dashboardData?.totalGroupCount === 0 && (
            <EmptyState
              icon="🤝"
              title="No groups yet"
              description="Create or join a paluwagan group to get started."
              action={
                <View style={{ gap: 12, width: "100%" }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#1D9E75",
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: "center",
                    }}
                    onPress={() => router.push("/(app)/groups/new")}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>
                      Create a Group
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      borderWidth: 2,
                      borderColor: "#1D9E75",
                      paddingVertical: 14,
                      borderRadius: 14,
                      alignItems: "center",
                    }}
                    onPress={() => router.push("/(app)/groups/join")}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#1D9E75", fontWeight: "700", fontSize: 15 }}>
                      Join with Code
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
