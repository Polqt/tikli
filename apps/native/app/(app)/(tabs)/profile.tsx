import { Avatar } from "@/components/ui/Avatar";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { env } from "@tikli/env/native";
import { useAuth } from "@clerk/expo";
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

export default function ProfileScreen() {
  const { clerkUser, convexProfile } = useCurrentUser();
  const { signOut, getToken } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(convexProfile?.displayName ?? "");
  const [saving, setSaving] = useState(false);

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingName(false);
    } catch {
      Alert.alert("Error", "Could not update name. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 24 }}>
          Profile
        </Text>

        {/* Avatar + name */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
          <Avatar
            name={convexProfile?.displayName}
            phone={convexProfile?.phoneNumber}
            color={convexProfile?.avatarColor}
            size="xl"
          />
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827", marginTop: 12 }}>
            {convexProfile?.displayName ?? "No name set"}
          </Text>
          <Text style={{ fontSize: 14, color: "#6B7280", marginTop: 4 }}>
            {convexProfile?.phoneNumber ?? clerkUser?.phoneNumbers[0]?.phoneNumber}
          </Text>
        </View>

        {/* Display name edit */}
        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 13, color: "#6B7280", fontWeight: "600", marginBottom: 8 }}>
            DISPLAY NAME
          </Text>
          {editingName ? (
            <View style={{ gap: 10 }}>
              <TextInput
                style={{
                  borderWidth: 2,
                  borderColor: "#1D9E75",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  color: "#111827",
                  backgroundColor: "#F0FDF8",
                }}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor="#9CA3AF"
                maxLength={50}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity
                  style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" }}
                  onPress={() => setEditingName(false)}
                >
                  <Text style={{ fontWeight: "700", color: "#374151" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#1D9E75", alignItems: "center" }}
                  onPress={handleSaveName}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={{ fontWeight: "700", color: "#ffffff" }}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
              onPress={() => {
                setDisplayName(convexProfile?.displayName ?? "");
                setEditingName(true);
              }}
            >
              <Text style={{ fontSize: 16, color: "#111827", fontWeight: "600" }}>
                {convexProfile?.displayName ?? "Tap to set name"}
              </Text>
              <Text style={{ fontSize: 14, color: "#1D9E75", fontWeight: "600" }}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            marginTop: 8,
          }}
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              { text: "Sign Out", style: "destructive", onPress: () => signOut() },
            ])
          }
          activeOpacity={0.8}
        >
          <Text style={{ color: "#DC2626", fontWeight: "700", fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
