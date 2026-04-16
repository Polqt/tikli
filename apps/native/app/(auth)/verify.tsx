import { useSignIn } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
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

const OTP_LENGTH = 6;

export default function VerifyScreen() {
  const { signIn, fetchStatus } = useSignIn();
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();

  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const isVerifying = useRef(false);
  const loading = fetchStatus === "fetching";

  const handleChange = (val: string, index: number) => {
    // Handle paste — distribute digits
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, OTP_LENGTH).split("");
      const next = [...code];
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) next[index + i] = d;
      });
      setCode(next);
      const focusIndex = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[focusIndex]?.focus();
      if (next.every(Boolean)) void handleVerify(next.join(""));
      return;
    }

    const next = [...code];
    next[index] = val;
    setCode(next);
    if (val && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every(Boolean)) void handleVerify(next.join(""));
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (finalCode?: string) => {
    const otp = finalCode ?? code.join("");
    if (otp.length < OTP_LENGTH) return;
    if (isVerifying.current) return;
    isVerifying.current = true;

    setError(null);

    const { error: verifyError } = await signIn.phoneCode.verifyCode({ code: otp });

    if (verifyError) {
      setError(verifyError.longMessage ?? "Invalid code. Please try again.");
      setCode(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
      isVerifying.current = false;
      return;
    }

    // Finalize: sets the active session and navigates
    await signIn.finalize({
      navigate: async () => {
        router.replace("/(app)/(tabs)/");
      },
    });
  };

  const handleResend = async () => {
    setError(null);
    const { error: resendError } = await signIn.phoneCode.sendCode({
      phoneNumber: phoneNumber ?? "",
    });
    if (resendError) {
      setError(resendError.longMessage ?? "Could not resend code.");
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
            Enter the code
          </Text>
          <Text style={{ fontSize: 15, color: "#6B7280", marginBottom: 36 }}>
            We sent a 6-digit code to{"\n"}
            <Text style={{ fontWeight: "700", color: "#111827" }}>{phoneNumber}</Text>
          </Text>

          {/* OTP boxes */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => {
                  inputRefs.current[i] = ref;
                }}
                style={{
                  flex: 1,
                  height: 56,
                  borderWidth: 2,
                  borderColor: digit ? "#1D9E75" : "#E5E7EB",
                  borderRadius: 12,
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#111827",
                  backgroundColor: digit ? "#F0FDF8" : "#FAFAFA",
                }}
                value={digit}
                onChangeText={(val) => handleChange(val, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={1}
                autoFocus={i === 0}
                selectTextOnFocus
              />
            ))}
          </View>

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
              backgroundColor: code.every(Boolean) && !loading ? "#1D9E75" : "#A7F3D0",
              paddingVertical: 16,
              borderRadius: 16,
              alignItems: "center",
              marginBottom: 16,
            }}
            onPress={() => void handleVerify()}
            disabled={!code.every(Boolean) || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>Verify</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => void handleResend()} style={{ alignItems: "center" }}>
            <Text style={{ color: "#1D9E75", fontSize: 14, fontWeight: "600" }}>Resend code</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
