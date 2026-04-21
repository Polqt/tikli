import { useSignIn, useSignUp } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthStatusNote } from "@/components/auth/auth-status-note";
import { OtpInputRow } from "@/components/auth/otp-input-row";
import { clearEmailDraft } from "@/lib/auth/auth-draft";
import { APP_TABS_ROUTE } from "@/lib/auth/auth-routes";

const OTP_LENGTH = 6;

export default function VerifyScreen() {
	const { signIn, fetchStatus: signInFetch } = useSignIn();
	const { signUp, fetchStatus: signUpFetch } = useSignUp();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { email, flow } = useLocalSearchParams<{ email: string; flow: "signIn" | "signUp" }>();

	const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
	const [error, setError] = useState<string | null>(null);
	const [resent, setResent] = useState(false);
	const inputRefs = useRef<(TextInput | null)[]>([]);

	const loading = signInFetch === "fetching" || signUpFetch === "fetching";
	const fullCode = code.join("");
	const isComplete = fullCode.length === OTP_LENGTH && !code.includes("");

	useEffect(() => {
		setTimeout(() => inputRefs.current[0]?.focus(), 300);
	}, []);

	const handleChangeDigit = (value: string, index: number) => {
		// Support paste of full 6-digit code into first input
		if (index === 0 && value.length === OTP_LENGTH && /^\d+$/.test(value)) {
			const digits = value.split("");
			setCode(digits);
			inputRefs.current[OTP_LENGTH - 1]?.focus();
			return;
		}
		const digit = value.replace(/\D/g, "").slice(-1);
		const next = [...code];
		next[index] = digit;
		setCode(next);
		if (digit && index < OTP_LENGTH - 1) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyPress = (key: string, index: number) => {
		if (key === "Backspace" && !code[index] && index > 0) {
			const next = [...code];
			next[index - 1] = "";
			setCode(next);
			inputRefs.current[index - 1]?.focus();
		}
	};

	const extractError = (err: unknown): string => {
		const e = err as { errors?: { longMessage?: string; message?: string }[]; message?: string };
		return e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? (err instanceof Error ? err.message : "Something went wrong.");
	};

	const handleVerify = async () => {
		if (!isComplete || loading) return;
		setError(null);

		if (flow === "signUp") {
			const { error: e } = await signUp.verifications.verifyEmailCode({ code: fullCode });
			if (e) { setError(extractError(e)); return; }
			const { error: fe } = await signUp.finalize({
				navigate: async () => { router.replace(APP_TABS_ROUTE); },
			});
			if (fe) { setError(extractError(fe)); return; }
		} else {
			const { error: e } = await signIn.emailCode.verifyCode({ code: fullCode });
			if (e) { setError(extractError(e)); return; }
			const { error: fe } = await signIn.finalize({
				navigate: async () => { router.replace(APP_TABS_ROUTE); },
			});
			if (fe) { setError(extractError(fe)); return; }
		}

		await clearEmailDraft();
	};

	const handleResend = async () => {
		setError(null);
		setResent(false);
		if (flow === "signUp") {
			const { error: e } = await signUp.verifications.sendEmailCode();
			if (e) { setError(extractError(e)); return; }
		} else {
			const { error: e } = await signIn.emailCode.sendCode();
			if (e) { setError(extractError(e)); return; }
		}
		setResent(true);
	};

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-[#F5F3EF]"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			{/* Top bar */}
			<View
				className="flex-row items-center justify-between px-5"
				style={{ paddingTop: insets.top + 10 }}
			>
				<TouchableOpacity
					onPress={() => router.back()}
					hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
					className="h-10 w-10 items-center justify-center rounded-full bg-ink/8"
				>
					<Ionicons name="chevron-back" size={20} color="#242424" />
				</TouchableOpacity>

				{/* Step pills */}
				<View className="flex-row gap-1.5">
					<View className="h-[5px] w-8 rounded-full bg-ink/15" />
					<View className="h-[5px] w-8 rounded-full bg-ink" />
				</View>
			</View>

			{/* Content */}
			<View className="flex-1 px-6 pt-10">
				{/* Eyebrow */}
				<Text
					className="text-primary text-[11px] uppercase tracking-[2.4px]"
					style={{ fontWeight: "800" }}
				>
					Step 2 — Verify
				</Text>

				{/* Headline */}
				<Text
					className="mt-3 text-ink"
					style={{ fontSize: 36, lineHeight: 43, fontWeight: "800", letterSpacing: -0.8 }}
				>
					{"Check your\nemail"}
				</Text>

				{/* Sub */}
				<Text className="mt-3 text-ink/50" style={{ fontSize: 15, lineHeight: 22 }}>
					We sent a 6-digit code to{" "}
					<Text style={{ fontWeight: "700", color: "#242424" }}>{email}</Text>.
				</Text>

				{/* Divider */}
				<View className="my-8 h-px bg-ink/8" />

				{error && (
					<View className="mb-4">
						<AuthStatusNote tone="error" text={error} />
					</View>
				)}
				{resent && !error && (
					<View className="mb-4">
						<AuthStatusNote tone="neutral" text="Code resent. Check your inbox." />
					</View>
				)}

				{/* OTP inputs */}
				<OtpInputRow
					code={code}
					inputRefs={inputRefs}
					onChangeDigit={handleChangeDigit}
					onKeyPressDigit={handleKeyPress}
				/>

				{/* Resend */}
				<TouchableOpacity
					onPress={() => void handleResend()}
					disabled={loading}
					className="mt-6 self-start"
					activeOpacity={0.6}
				>
					<Text className="text-ink/45" style={{ fontSize: 14, fontWeight: "600" }}>
						Didn't get it?{" "}
						<Text style={{ color: "#1D9E75", fontWeight: "700" }}>Resend code</Text>
					</Text>
				</TouchableOpacity>
			</View>

			{/* Footer */}
			<View
				className="px-6 pb-2"
				style={{ paddingBottom: Math.max(insets.bottom + 12, 28) }}
			>
				<AuthPrimaryButton
					label="Verify & continue"
					onPress={() => void handleVerify()}
					loading={loading}
					disabled={!isComplete}
				/>
			</View>
		</KeyboardAvoidingView>
	);
}
