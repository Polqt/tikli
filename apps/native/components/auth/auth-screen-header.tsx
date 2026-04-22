import { Text, View } from "react-native";

export function AuthScreenHeader({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<View className="gap-3">
			<Text className="text-[11px] uppercase tracking-[2.2px] text-teal" style={{ fontWeight: "800" }}>
				{eyebrow}
			</Text>
			<Text className="text-[34px] leading-[40px] text-ink" style={{ fontWeight: "300" }}>
				{title}
			</Text>
			<Text className="text-[15px] leading-6 text-ink/60">
				{description}
			</Text>
		</View>
	);
}
