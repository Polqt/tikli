import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InviteHandlerScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ flex: 1, padding: 24, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
          You're invited!
        </Text>
        <Text style={{ fontSize: 14, color: "#6B7280", marginBottom: 32 }}>
          Invite code: <Text style={{ fontWeight: "700", color: "#1D9E75" }}>{code}</Text>
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#1D9E75",
            paddingVertical: 14,
            paddingHorizontal: 40,
            borderRadius: 14,
          }}
          onPress={() => router.replace({ pathname: "/(app)/groups/join", params: { code } })}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
