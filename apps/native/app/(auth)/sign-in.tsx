import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
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

export default function SignInScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("+63");
  const [error, setError] = useState<string | null>(null);

  const loading = fetchStatus === "fetching";
  const canSubmit = phoneNumber.length >= 13 && !loading;

  const handleSendOtp = async () => {
    setError(null);
    try {
      const { error: sendError } = await signIn.phoneCode.sendCode({
        phoneNumber,
      });
      if (sendError) {
        setError(sendError.longMessage ?? "Could not send OTP. Try again.");
        return;
      }
      router.push({ pathname: "/(auth)/verify", params: { phoneNumber } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 48 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginBottom: 32 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={{ fontSize: 24 }}>←</Text>
          </TouchableOpacity>

          <Text style={{ fontSize: 28, fontWeight: "800", color: "#111827", marginBottom: 8 }}>
            Enter your number
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            We'll send a verification code to confirm it's you.
          </Text>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 2,
              borderColor: "#1D9E75",
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 4,
              backgroundColor: "#F0FDF8",
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 20, marginRight: 8 }}>🇵🇭</Text>
            <TextInput
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "600",
                color: "#111827",
                paddingVertical: 12,
              }}
              value={phoneNumber}
              onChangeText={(val) => {
                if (!val.startsWith("+63")) {
                  setPhoneNumber("+63");
                } else {
                  setPhoneNumber(val);
                }
              }}
              keyboardType="phone-pad"
              placeholder="+639XXXXXXXXX"
              placeholderTextColor="#9CA3AF"
              maxLength={13}
              autoFocus
            />
          </View>
          <Text style={{ fontSize: 12, color: "#9CA3AF", marginBottom: 32 }}>
            Philippine mobile number (e.g. +639171234567)
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
              backgroundColor: canSubmit ? "#1D9E75" : "#A7F3D0",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
            }}
            onPress={handleSendOtp}
            disabled={!canSubmit}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
                Send Code
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
