import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";
import { api } from "@tikli/backend/convex/_generated/api";
import { useAuth } from "@clerk/expo";
import { env } from "@tikli/env/native";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";
import type { RenderItemParams } from "react-native-draggable-flatlist";

type Member = NonNullable<ReturnType<typeof useQuery<typeof api.members.listForGroup>>>[number];

export default function MembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const members = useQuery(api.members.listForGroup, { groupId: groupId as never });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const [localMembers, setLocalMembers] = useState<Member[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const isOrganizer = group && memberForUser && group.organizerId === memberForUser.userId;
  const isForming = group?.status === "forming";
  const canReorder = isOrganizer && isForming;
  const displayMembers = localMembers ?? members ?? [];

  const handleSaveOrder = async () => {
    if (!localMembers) return;
    setSavingOrder(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/members/${groupId}/reorder`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderedMemberIds: localMembers.map((m) => m._id),
        }),
      });
      if (!res.ok) throw new Error("Failed to save order");
      setLocalMembers(null); // reset to server state
    } catch {
      Alert.alert("Error", "Failed to save rotation order. Please try again.");
    } finally {
      setSavingOrder(false);
    }
  };

  const handleActivate = async () => {
    Alert.alert(
      "Start Paluwagan?",
      `This will activate the group with ${members?.length ?? 0} members and generate all cycles. You cannot add more members after this.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start",
          style: "default",
          onPress: async () => {
            try {
              const token = await getToken({ template: "convex" });
              const res = await fetch(
                `${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/activate`,
                {
                  method: "POST",
                  headers: { Authorization: `Bearer ${token}` },
                },
              );
              if (!res.ok) throw new Error("Failed to activate group");
              router.replace(`/(app)/groups/${groupId}`);
            } catch {
              Alert.alert("Error", "Could not activate group. Make sure you have at least 2 members.");
            }
          },
        },
      ],
    );
  };

  const renderMember = ({ item, drag, isActive }: RenderItemParams<Member>) => {
    const rotationPos = displayMembers.indexOf(item) + 1;
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={canReorder ? drag : undefined}
          disabled={isActive}
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: isActive ? "#F0FDF8" : "#ffffff",
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: isActive ? 4 : 1 },
            shadowOpacity: isActive ? 0.15 : 0.05,
            shadowRadius: isActive ? 8 : 3,
            elevation: isActive ? 6 : 1,
          }}
          activeOpacity={0.7}
        >
          {/* Rotation order */}
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: rotationPos === 1 ? "#1D9E75" : "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: rotationPos === 1 ? "#ffffff" : "#6B7280",
              }}
            >
              {rotationPos}
            </Text>
          </View>

          <Avatar
            name={item.user?.displayName}
            phone={item.user?.phoneNumber}
            color={item.user?.avatarColor}
            size="md"
          />

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#111827" }} numberOfLines={1}>
              {item.user?.displayName ?? item.user?.phoneNumber ?? "Member"}
            </Text>
            {item.cycleReceivedIndex !== undefined && (
              <Text style={{ fontSize: 12, color: "#1D9E75", fontWeight: "600" }}>
                Received cycle {item.cycleReceivedIndex + 1}
              </Text>
            )}
          </View>

          {rotationPos === 1 && group?.status === "forming" && (
            <Badge label="First" variant="success" />
          )}
          {group?.status === "active" && group.currentCycleIndex + 1 === rotationPos && (
            <Badge label="Current" variant="success" />
          )}
          {canReorder && (
            <Text style={{ fontSize: 20, color: "#9CA3AF", marginLeft: 8 }}>⠿</Text>
          )}
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginLeft: 16, flex: 1 }}>
            Members & Rotation
          </Text>
          {canReorder && localMembers && (
            <TouchableOpacity
              onPress={handleSaveOrder}
              disabled={savingOrder}
              style={{
                backgroundColor: "#1D9E75",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 10,
              }}
            >
              {savingOrder ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>Save</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {canReorder && (
          <View
            style={{
              backgroundColor: "#FEF3C7",
              borderRadius: 10,
              padding: 10,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 16 }}>ℹ️</Text>
            <Text style={{ fontSize: 12, color: "#92400E", flex: 1 }}>
              Long-press a member to drag and reorder the rotation. Save when done.
            </Text>
          </View>
        )}

        <Skeleton
          isLoading={members === undefined}
          skeleton={
            <View style={{ gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14 }}>
                  <SkeletonBlock width={28} height={28} borderRadius={14} />
                  <SkeletonBlock width={40} height={40} borderRadius={12} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonBlock width="60%" height={14} />
                    <SkeletonBlock width="40%" height={11} />
                  </View>
                </View>
              ))}
            </View>
          }
        >
          {canReorder ? (
            <DraggableFlatList
              data={displayMembers as Member[]}
              keyExtractor={(item) => item._id}
              renderItem={renderMember}
              onDragEnd={({ data }) => setLocalMembers(data as Member[])}
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          ) : (
            <FlatList
              data={displayMembers as Member[]}
              keyExtractor={(item) => item._id}
              renderItem={({ item, index }) =>
                renderMember({ item: item as Member, drag: () => {}, isActive: false, getIndex: () => index })
              }
              contentContainerStyle={{ paddingBottom: 120 }}
            />
          )}
        </Skeleton>
      </View>

      {/* Activate button for organizer in forming state */}
      {isOrganizer && isForming && (members?.length ?? 0) >= 2 && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            backgroundColor: "#ffffff",
            borderTopWidth: 1,
            borderTopColor: "#F3F4F6",
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#1D9E75",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
            }}
            onPress={handleActivate}
            activeOpacity={0.8}
          >
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 16 }}>
              🚀 Start Paluwagan ({members?.length} members)
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
