import { Text, View } from "react-native";

const PALETTE = {
	neutral: { container: "bg-white/90 border border-black/5", text: "text-ink/70", dot: "bg-teal" },
	error: { container: "bg-coral/10 border border-coral/20", text: "text-coral", dot: "bg-coral" },
	offline: { container: "bg-yellow/20 border border-yellow/40", text: "text-ink/80", dot: "bg-yellow" },
} as const;

export function AuthStatusNote({
	tone,
	text,
}: {
	tone: "neutral" | "error" | "offline";
	text: string;
}) {
	const { container, text: textClass, dot } = PALETTE[tone];

	return (
		<View className={`rounded-[24px] p-4 ${container}`}>
			<View className="flex-row items-start gap-3">
				<View className={`mt-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
				<Text selectable className={`flex-1 text-[13px] leading-5 ${textClass}`}>
					{text}
				</Text>
			</View>
		</View>
	);
}
