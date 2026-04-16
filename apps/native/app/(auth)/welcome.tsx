import { useRouter } from "expo-router";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
        {/* Logo */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: "#1D9E75",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ fontSize: 36 }}>₱</Text>
        </View>

        <Text style={{ fontSize: 36, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
          Tikli
        </Text>
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#1D9E75", marginBottom: 16 }}>
          Paluwagan Tracker
        </Text>
        <Text
          style={{
            fontSize: 15,
            color: "#6B7280",
            textAlign: "center",
            lineHeight: 22,
            marginBottom: 48,
          }}
        >
          Manage your rotating savings group with ease. No more notebooks, no more confusion.
        </Text>

        <TouchableOpacity
          style={{
            backgroundColor: "#1D9E75",
            paddingVertical: 16,
            paddingHorizontal: 48,
            borderRadius: 16,
            width: "100%",
            alignItems: "center",
          }}
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.8}
        >
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Get Started</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ textAlign: "center", color: "#9CA3AF", fontSize: 12, paddingBottom: 24 }}>
        Simple. Transparent. Trusted.
      </Text>
    </SafeAreaView>
  );
}
