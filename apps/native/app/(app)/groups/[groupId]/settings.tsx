import { InviteCodeCard } from "@/components/groups/InviteCodeCard";
import { api } from "@tikli/backend/convex/_generated/api";
import { useAuth } from "@clerk/expo";
import { env } from "@tikli/env/native";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const { getToken } = useAuth();

  const group = useQuery(api.groups.getById, { groupId: groupId as never });
  const memberForUser = useQuery(api.members.getMemberForUser, { groupId: groupId as never });

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editingInfo, setEditingInfo] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOrganizer = group && memberForUser && group.organizerId === memberForUser.userId;

  if (!isOrganizer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#6B7280" }}>Only the organizer can access settings.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName || undefined,
          description: editDesc || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingInfo(false);
    } catch {
      Alert.alert("Error", "Could not update group. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    Alert.alert(
      "Regenerate Code?",
      "The old code will no longer work. New members will need the new code.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            try {
              const token = await getToken({ template: "convex" });
              await fetch(`${env.EXPO_PUBLIC_API_URL}/api/invites/${groupId}/regenerate`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
              });
            } catch {
              Alert.alert("Error", "Could not regenerate code.");
            }
          },
        },
      ],
    );
  };

  const handlePause = async () => {
    try {
      const token = await getToken({ template: "convex" });
      const isPaused = group?.status === "paused";
      await fetch(`${env.EXPO_PUBLIC_API_URL}/api/groups/${groupId}/${isPaused ? "resume" : "pause"}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      Alert.alert("Error", "Could not update group status.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: "800", color: "#111827", marginLeft: 16 }}>
            Group Settings
          </Text>
        </View>

        {/* Group Info */}
        <View style={{ backgroundColor: "#ffffff", borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>Group Info</Text>
            {!editingInfo && (
              <TouchableOpacity onPress={() => { setEditName(group?.name ?? ""); setEditDesc(group?.description ?? ""); setEditingInfo(true); }}>
                <Text style={{ color: "#1D9E75", fontWeight: "600" }}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingInfo ? (
            <View style={{ gap: 10 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 15, color: "#111827" }}
                value={editName}
                onChangeText={setEditName}
                placeholder="Group name"
              />
              <TextInput
                style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, padding: 12, fontSize: 14, color: "#374151", minHeight: 60, textAlignVertical: "top" }}
                value={editDesc}
                onChangeText={setEditDesc}
                placeholder="Description (optional)"
                multiline
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" }}
                  onPress={() => setEditingInfo(false)}
                >
                  <Text style={{ fontWeight: "700", color: "#374151" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#1D9E75", alignItems: "center" }}
                  onPress={handleSaveInfo}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={{ fontWeight: "700", color: "#ffffff" }}>Save</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>{group?.name}</Text>
              {group?.description && <Text style={{ fontSize: 13, color: "#6B7280" }}>{group.description}</Text>}
            </View>
          )}
        </View>

        {/* Invite Code */}
        {group?.status === "forming" && group.inviteCode && (
          <View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 10 }}>
              Invite Code
            </Text>
            <InviteCodeCard code={group.inviteCode} />
            <TouchableOpacity
              style={{ marginTop: 10, alignItems: "center" }}
              onPress={handleRegenerateCode}
            >
              <Text style={{ color: "#EF4444", fontWeight: "600", fontSize: 13 }}>
                Regenerate Code
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pause / Resume */}
        {(group?.status === "active" || group?.status === "paused") && (
          <TouchableOpacity
            style={{
              backgroundColor: group.status === "paused" ? "#F0FDF8" : "#FEF3C7",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
            onPress={handlePause}
            activeOpacity={0.8}
          >
            <Text style={{ fontWeight: "700", color: group.status === "paused" ? "#1D9E75" : "#92400E", fontSize: 15 }}>
              {group.status === "paused" ? "▶ Resume Group" : "⏸ Pause Group"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
