import { env } from "@tikli/env/native";
import { useAuth } from "@clerk/expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinGroupScreen() {
  const router = useRouter();
  const { code: prefilledCode } = useLocalSearchParams<{ code?: string }>();
  const { getToken } = useAuth();
  const [code, setCode] = useState((prefilledCode ?? "").toUpperCase());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (prefilledCode) setCode(prefilledCode.toUpperCase());
  }, [prefilledCode]);

  const handleJoin = async () => {
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      const token = await getToken({ template: "convex" });
      const res = await fetch(`${env.EXPO_PUBLIC_API_URL}/api/invites/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? "Failed to join group");
      }

      const { groupId } = body as { groupId: string };
      router.replace(`/(app)/groups/${groupId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 32 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
            Join a Group
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 32 }}>
            Enter the 6-character invite code from your group organizer.
          </Text>

          <TextInput
            style={{
              borderWidth: 2,
              borderColor: "#1D9E75",
              borderRadius: 16,
              padding: 18,
              fontSize: 28,
              fontWeight: "800",
              color: "#111827",
              backgroundColor: "#F0FDF8",
              textAlign: "center",
              letterSpacing: 8,
              marginBottom: 8,
            }}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
            placeholder="ABC123"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            autoFocus={!prefilledCode}
          />
          <Text style={{ fontSize: 12, color: "#9CA3AF", textAlign: "center", marginBottom: 32 }}>
            6-character code (letters & numbers)
          </Text>

          {error && (
            <View
              style={{
                backgroundColor: "#FEF2F2",
                borderRadius: 10,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "#DC2626", fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: code.length === 6 && !loading ? "#1D9E75" : "#A7F3D0",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
            }}
            onPress={handleJoin}
            disabled={code.length !== 6 || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Join Group</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
