import { Avatar } from "@/components/ui/Avatar";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HistoryScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();

  const completedCycles = useQuery(api.cycles.getCompletedCycles, {
    groupId: groupId as never,
  });
  const members = useQuery(api.members.listAllForGroup, { groupId: groupId as never });

  const isLoading = completedCycles === undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginLeft: 16 }}>
            Cycle History
          </Text>
        </View>

        <Skeleton
          isLoading={isLoading}
          skeleton={
            <View style={{ gap: 12 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16 }}>
                  <SkeletonBlock width="40%" height={12} style={{ marginBottom: 10 }} />
                  <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                    <SkeletonBlock width={40} height={40} borderRadius={12} />
                    <SkeletonBlock width="50%" height={16} />
                    <SkeletonBlock width="25%" height={20} style={{ marginLeft: "auto" }} />
                  </View>
                </View>
              ))}
            </View>
          }
        >
          {completedCycles?.length === 0 ? (
            <EmptyState
              icon="📋"
              title="No completed cycles"
              description="Cycle history will appear here once cycles are completed."
            />
          ) : (
            <FlatList
              data={completedCycles ?? []}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const recipient = members?.find((m) => m._id === item.recipientMemberId);
                return (
                  <View
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: "#9CA3AF", fontWeight: "600", marginBottom: 10 }}>
                      CYCLE {item.cycleIndex + 1} •{" "}
                      {item.completedAt
                        ? new Date(item.completedAt).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : ""}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      {recipient && (
                        <Avatar
                          name={recipient.user?.displayName}
                          phone={recipient.user?.phoneNumber}
                          color={recipient.user?.avatarColor}
                          size="md"
                        />
                      )}
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
                          {recipient?.user?.displayName ?? recipient?.user?.phoneNumber ?? "Member"}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#6B7280" }}>Received payout</Text>
                      </View>
                      <CurrencyText
                        centavos={item.potAmount}
                        style={{ fontSize: 17, fontWeight: "800", color: "#1D9E75" }}
                      />
                    </View>

                    {/* Collection rate */}
                    <View
                      style={{
                        marginTop: 12,
                        backgroundColor: "#F9FAFB",
                        borderRadius: 8,
                        padding: 10,
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#6B7280" }}>Collected</Text>
                      <CurrencyText
                        centavos={item.totalCollected}
                        style={{ fontSize: 12, fontWeight: "700", color: "#374151" }}
                      />
                    </View>
                  </View>
                );
              }}
            />
          )}
        </Skeleton>
      </View>
    </SafeAreaView>
  );
}
