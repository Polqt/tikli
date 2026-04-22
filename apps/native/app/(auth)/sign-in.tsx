import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthPrimaryButton } from "@/components/auth/auth-primary-button";
import { AuthStatusNote } from "@/components/auth/auth-status-note";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { loadEmailDraft, saveEmailDraft } from "@/lib/auth/auth-draft";
import { AUTH_VERIFY_ROUTE } from "@/lib/auth/auth-routes";

function isValidEmail(v: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function SignInScreen() {
	const { signIn, fetchStatus: signInFetch } = useSignIn();
	const { signUp, fetchStatus: signUpFetch } = useSignUp();
	const router = useRouter();
	const { isOnline } = useNetworkStatus();
	const insets = useSafeAreaInsets();
	const [email, setEmail] = useState("");
	const [error, setError] = useState<string | null>(null);

	const loading = signInFetch === "fetching" || signUpFetch === "fetching";
	const canSubmit = isOnline && !loading && isValidEmail(email);

	useEffect(() => {
		void loadEmailDraft().then((d) => { if (d) setEmail(d); });
	}, []);

	const handleChange = (v: string) => {
		setEmail(v);
		void saveEmailDraft(v);
	};

	const handleSend = async () => {
		if (!canSubmit) return;
		setError(null);
		const addr = email.trim();

		// Try sign-in first — create the attempt to identify the user
		const { error: createSignInErr } = await signIn.create({ identifier: addr });
		if (createSignInErr) console.log("[auth] signIn.create error:", JSON.stringify(createSignInErr));
		if (!createSignInErr) {
			const { error: sendErr } = await signIn.emailCode.sendCode();
			if (sendErr) {
				console.log("[auth] signIn.sendCode error:", JSON.stringify(sendErr));
				const e = sendErr as unknown as { errors?: { longMessage?: string; message?: string }[] };
				setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? sendErr.message ?? "Could not send code.");
				return;
			}
			router.push({ pathname: AUTH_VERIFY_ROUTE, params: { email: addr, flow: "signIn" } });
			return;
		}

		// If account not found, fall through to sign-up
		// ClerkAPIResponseError wraps field errors in .errors[] — check both
		const errWithErrors = createSignInErr as unknown as { errors?: { code: string }[] };
		const clerkCode = errWithErrors.errors?.[0]?.code ?? createSignInErr.code ?? "";
		if (clerkCode !== "form_identifier_not_found" && clerkCode !== "form_password_incorrect") {
			const errMsg =
				(errWithErrors as { errors?: { longMessage?: string; message?: string }[] }).errors?.[0]?.longMessage ??
				(errWithErrors as { errors?: { message?: string }[] }).errors?.[0]?.message ??
				createSignInErr.longMessage ?? createSignInErr.message ?? "Could not send code.";
			setError(errMsg);
			return;
		}

		// New user — sign-up
		const { error: createSignUpErr } = await signUp.create({ emailAddress: addr });
		if (createSignUpErr) {
			console.log("[auth] signUp.create error:", JSON.stringify(createSignUpErr));
			const e = createSignUpErr as unknown as { errors?: { longMessage?: string; message?: string }[] };
			setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? createSignUpErr.message ?? "Could not create account.");
			return;
		}
		const { error: sendSignUpErr } = await signUp.verifications.sendEmailCode();
		if (sendSignUpErr) {
			console.log("[auth] sendEmailCode error:", JSON.stringify(sendSignUpErr));
			const e = sendSignUpErr as unknown as { errors?: { longMessage?: string; message?: string }[] };
			setError(e.errors?.[0]?.longMessage ?? e.errors?.[0]?.message ?? sendSignUpErr.message ?? "Could not send code.");
			return;
		}
		router.push({ pathname: AUTH_VERIFY_ROUTE, params: { email: addr, flow: "signUp" } });
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
					<View className="h-[5px] w-8 rounded-full bg-ink" />
					<View className="h-[5px] w-8 rounded-full bg-ink/15" />
				</View>
			</View>

			{/* Content */}
			<View className="flex-1 px-6 pt-10">
				{/* Eyebrow */}
				<Text
					className="text-primary text-[11px] uppercase tracking-[2.4px]"
					style={{ fontWeight: "800" }}
				>
					Step 1 — Email
				</Text>

				{/* Headline */}
				<Text
					className="mt-3 text-ink"
					style={{ fontSize: 36, lineHeight: 43, fontWeight: "800", letterSpacing: -0.8 }}
				>
					{"What's your\nemail?"}
				</Text>

				{/* Sub */}
				<Text className="mt-3 text-ink/50" style={{ fontSize: 15, lineHeight: 22 }}>
					We'll send a one-time code. No password needed.
				</Text>

				{/* Divider */}
				<View className="my-8 h-px bg-ink/8" />

				{/* Errors */}
				{!isOnline && (
					<View className="mb-4">
						<AuthStatusNote tone="offline" text="You're offline. Connect to send a code." />
					</View>
				)}
				{error && (
					<View className="mb-4">
						<AuthStatusNote tone="error" text={error} />
					</View>
				)}

				{/* Input */}
				<Text
					className="mb-2 text-ink/40 text-[11px] uppercase tracking-[1.8px]"
					style={{ fontWeight: "700" }}
				>
					Email address
				</Text>
				<TextInput
					autoFocus
					keyboardType="email-address"
					autoCapitalize="none"
					autoCorrect={false}
					value={email}
					onChangeText={handleChange}
					placeholder="you@example.com"
					placeholderTextColor="#B8B0A5"
					onSubmitEditing={() => void handleSend()}
					returnKeyType="send"
					className="border-b-2 border-ink/15 pb-3 text-ink"
					style={{ fontSize: 22, fontWeight: "600" }}
				/>

				<Text className="mt-3 text-ink/35" style={{ fontSize: 12, lineHeight: 18 }}>
					Remembered on this device for faster sign-ins.
				</Text>
			</View>

			{/* Footer */}
			<View
				className="px-6 pb-2"
				style={{ paddingBottom: Math.max(insets.bottom + 12, 28) }}
			>
				<AuthPrimaryButton
					label="Send secure code"
					onPress={() => void handleSend()}
					loading={loading}
					disabled={!canSubmit}
				/>
			</View>
		</KeyboardAvoidingView>
	);
}
