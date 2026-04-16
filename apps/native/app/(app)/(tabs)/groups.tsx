import { GroupCard } from "@/components/groups/GroupCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type GroupCardProps = Parameters<typeof GroupCard>[0]["group"];

function GroupsSkeletonList() {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          <SkeletonBlock width={56} height={56} borderRadius={16} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBlock width="70%" height={16} />
            <SkeletonBlock width="40%" height={12} />
            <SkeletonBlock width="30%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function GroupsScreen() {
  const router = useRouter();
  const groups = useQuery(api.groups.listForUser);
  const isLoading = groups === undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 20,
            paddingBottom: 16,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827" }}>My Groups</Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#1D9E75",
              width: 36,
              height: 36,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => router.push("/(app)/groups/join")}
            accessibilityLabel="Join a group"
          >
            <Text style={{ color: "#ffffff", fontSize: 20, lineHeight: 22 }}>+</Text>
          </TouchableOpacity>
        </View>

        <Skeleton
          isLoading={isLoading}
          skeleton={<GroupsSkeletonList />}
        >
          {groups && groups.length === 0 ? (
            <EmptyState
              icon="🤝"
              title="No groups yet"
              description="Start or join a paluwagan group to begin tracking contributions."
              action={
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#1D9E75",
                      paddingVertical: 14,
                      paddingHorizontal: 32,
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
                      paddingHorizontal: 32,
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
          ) : (
            <FlatList
              data={groups ?? []}
              keyExtractor={(item) => item!._id}
              renderItem={({ item }) => item ? <GroupCard group={item as GroupCardProps} /> : null}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 120 }}
              ListFooterComponent={
                <View style={{ gap: 12, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#ffffff",
                      borderWidth: 2,
                      borderColor: "#1D9E75",
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: "center",
                    }}
                    onPress={() => router.push("/(app)/groups/new")}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#1D9E75", fontWeight: "700" }}>+ Create New Group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      backgroundColor: "#F0FDF8",
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: "center",
                    }}
                    onPress={() => router.push("/(app)/groups/join")}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: "#1D9E75", fontWeight: "600" }}>Join with Code</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </Skeleton>
      </View>
    </SafeAreaView>
  );
}
