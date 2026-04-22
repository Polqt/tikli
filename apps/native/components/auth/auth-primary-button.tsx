import { ActivityIndicator, Text, TouchableOpacity } from "react-native";

export function AuthPrimaryButton({
	label,
	onPress,
	loading,
	disabled,
}: {
	label: string;
	onPress: () => void;
	loading?: boolean;
	disabled?: boolean;
}) {
	const isDisabled = Boolean(disabled || loading);

	return (
		<TouchableOpacity
			style={{
				backgroundColor: isDisabled ? "rgba(36,36,36,0.18)" : "#242424",
				borderRadius: 999,
				paddingVertical: 18,
				alignItems: "center",
			}}
			onPress={onPress}
			disabled={isDisabled}
			activeOpacity={0.82}
		>
			{loading ? (
				<ActivityIndicator color="#ffffff" />
			) : (
				<Text style={{ color: isDisabled ? "rgba(36,36,36,0.35)" : "#ffffff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 }}>
					{label}
				</Text>
			)}
		</TouchableOpacity>
	);
}
