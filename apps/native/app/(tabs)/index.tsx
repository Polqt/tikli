import { Ionicons } from "@expo/vector-icons";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { colorForString } from "@/utils/avatarColors";
import { formatDueDate } from "@/utils/date";

type DashboardData = NonNullable<ReturnType<typeof useQuery<typeof api.dashboard.getDashboardData>>>;
type GroupHealthRow = NonNullable<DashboardData["groupHealthRows"]>[number];

function groupStatusString(row: NonNullable<GroupHealthRow>): string {
  if (row.status === "forming") return `${row.joinedCount}/${row.maxMembers} joined`;
  if (row.status === "paused") return "Paused";
  if (row.status === "active") {
    if (row.isRecipient) return row.nextDueDate ? `You receive ${formatDueDate(row.nextDueDate)}` : "You receive next";
    const paid = `${row.paidCount}/${row.totalCount} paid`;
    const due = row.nextDueDate ? ` · due ${formatDueDate(row.nextDueDate)}` : "";
    return paid + due;
  }
  return "";
}

function HeroSection({ data }: { data: DashboardData }) {
  const router = useRouter();
  const hero = data.heroState;
  const bg =
    hero.type === "owe" ? "#242424" : hero.type === "receive" ? "#1D9E75" : "rgba(36,36,36,0.05)";

  return (
    <TouchableOpacity
      className="mx-5 mb-7 rounded-2xl" style={{ backgroundColor: bg, padding: 22 }}
      onPress={() => { if (hero.groupId) router.push(`/(app)/groups/${hero.groupId}`); }}
      activeOpacity={hero.groupId ? 0.8 : 1}
    >
      {hero.type === "owe" && (
        <>
          <Text className="text-xs font-bold uppercase tracking-wider mb-1 text-white/55">
            You owe this cycle
          </Text>
          <CurrencyText centavos={hero.amount ?? 0} style={{ fontSize: 36, fontWeight: "800", color: "#ffffff", letterSpacing: -1, lineHeight: 42 }} />
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" }}>
            {hero.groupName}{hero.dueDate ? ` · due ${formatDueDate(hero.dueDate)}` : ""}
          </Text>
        </>
      )}
      {hero.type === "receive" && (
        <>
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons name="trophy" size={14} color="rgba(255,255,255,0.7)" />
            <Text className="text-xs font-bold uppercase tracking-wider text-white/70">
              You receive the pot
            </Text>
          </View>
          <CurrencyText centavos={hero.amount ?? 0} style={{ fontSize: 36, fontWeight: "800", color: "#ffffff", letterSpacing: -1, lineHeight: 42 }} />
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: "500" }}>
            {hero.groupName}{hero.dueDate ? ` · ${formatDueDate(hero.dueDate)}` : ""}
          </Text>
        </>
      )}
      {hero.type === "clear" && (
        <>
          <View className="flex-row items-center gap-2 mb-1">
            <Ionicons name="checkmark-circle" size={18} color="#1D9E75" />
            <Text className="text-base font-extrabold text-black">You're all clear</Text>
          </View>
          <Text className="text-xs text-black/45 font-medium">
            No payments due. Nice work.
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function GroupHealthRowItem({ row }: { row: NonNullable<GroupHealthRow> }) {
  const router = useRouter();
  const color = colorForString(row.name);
  const isForming = row.status === "forming";

  return (
    <TouchableOpacity
      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 20 }}
      onPress={() => router.push(`/(app)/groups/${row.groupId}`)}
      activeOpacity={0.6}
    >
      <View style={{
        width: 8, height: 8, borderRadius: 4, marginRight: 12,
        backgroundColor: isForming ? "transparent" : color,
        borderWidth: isForming ? 2 : 0,
        borderColor: isForming ? color : undefined,
      }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: "#242424", marginBottom: 1 }} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={{ fontSize: 12, color: "rgba(36,36,36,0.45)", fontWeight: "500" }}>
          {groupStatusString(row)}
        </Text>
      </View>
      <View className="flex-row items-center gap-1">
        {row.isRecipient && <Ionicons name="trophy" size={13} color="#1D9E75" />}
        <Ionicons name="chevron-forward" size={14} color="#242424" style={{ opacity: 0.2 }} />
      </View>
    </TouchableOpacity>
  );
}

export default function PulseScreen() {
  const { convexProfile } = useCurrentUser();
  const router = useRouter();
  const dashboardData = useQuery(api.dashboard.getDashboardData);
  const isLoading = dashboardData === undefined;
  const insets = useSafeAreaInsets();
  const firstName = convexProfile?.displayName?.split(" ")[0] ?? convexProfile?.email?.split("@")[0] ?? "there";

  return (
    <View className="flex-1 bg-[#F5F3EF]">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}>

        {/* Hero */}
        <Skeleton isLoading={isLoading} skeleton={<View style={{ marginHorizontal: 20, marginBottom: 28 }}><SkeletonBlock style={{ height: 100, borderRadius: 20 }} /></View>}>
          {dashboardData && <HeroSection data={dashboardData} />}
        </Skeleton>

        {/* Group health rows */}
        <Skeleton
          isLoading={isLoading}
          skeleton={
            <View style={{ paddingHorizontal: 20, gap: 16 }}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <SkeletonBlock style={{ width: 8, height: 8, borderRadius: 4 }} />
                  <SkeletonBlock style={{ flex: 1, height: 14, borderRadius: 6 }} />
                </View>
              ))}
            </View>
          }
        >
          {dashboardData && dashboardData.groupHealthRows && dashboardData.groupHealthRows.length > 0 ? (
            <View>
              <Text className="text-xs font-extrabold text-black/30 tracking-widest uppercase mb-1 px-5">
                Your Groups
              </Text>
              <View className="border-t border-black/5">
                <FlatList
                  data={dashboardData.groupHealthRows.filter(Boolean)}
                  keyExtractor={(row) => row!.groupId}
                  renderItem={({ item }) => <GroupHealthRowItem row={item!} />}
                  ItemSeparatorComponent={() => (
                    <View className="h-[1px] bg-black/5 ml-10" />
                  )}
                  scrollEnabled={false}
                />
              </View>
            </View>
          ) : dashboardData?.totalGroupCount === 0 ? (
            <View className="mx-5 items-center py-6">
              <View className="w-16 h-16 rounded-2xl bg-black items-center justify-center mb-4">
                <Ionicons name="people-outline" size={28} color="#ffffff" />
              </View>
              <Text className="text-lg font-extrabold text-black mb-2 tracking-tight">
                Start your circle
              </Text>
              <Text className="text-sm text-black/45 text-center leading-[21px] mb-7">
                Create or join a paluwagan group to track contributions and payouts.
              </Text>
              <TouchableOpacity
                className="bg-black py-[15px] rounded-full w-full items-center"
                onPress={() => router.push("/(app)/groups/new")}
                activeOpacity={0.8}
              >
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Create a Group</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Skeleton>
      </ScrollView>
    </View>
  );
}
