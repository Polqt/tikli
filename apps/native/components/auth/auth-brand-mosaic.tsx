import { View } from "react-native";

export function AuthBrandMosaic({
	compact = false,
}: {
	compact?: boolean;
}) {
	const radius = compact ? "rounded-[26px]" : "rounded-[32px]";
	const gap = compact ? "gap-3" : "gap-3";

	return (
		<View className={`flex-1 ${gap} p-3`}>
			{/* Row 1 */}
			<View className={`flex-1 flex-row ${gap}`}>
				<View className={`flex-1 overflow-hidden bg-coral ${radius}`}>
					<View className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
				</View>
				<View className={`flex-1 overflow-hidden bg-teal ${radius}`}>
					<View className="absolute -right-6 top-4 h-16 w-16 rounded-2xl bg-white/15" />
				</View>
			</View>

			{/* Row 2 */}
			<View className={`flex-1 flex-row ${gap}`}>
				<View className={`flex-1 overflow-hidden bg-yellow ${radius}`}>
					<View className="absolute -bottom-6 right-6 h-20 w-20 rounded-[24px] bg-ink/10" />
				</View>
				<View className={`flex-1 overflow-hidden bg-blue ${radius}`}>
					<View className="absolute -left-6 bottom-5 h-16 w-16 rounded-[20px] bg-white/12" />
				</View>
			</View>

			{/* Row 3 — only shown when not compact */}
			{!compact && (
				<View className={`flex-1 flex-row ${gap}`}>
					<View className={`flex-1 overflow-hidden bg-pink ${radius}`}>
						<View className="absolute left-6 top-4 h-10 w-10 rounded-full bg-white/18" />
					</View>
					<View className={`flex-1 overflow-hidden bg-lavender ${radius}`}>
						<View className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/14" />
					</View>
				</View>
			)}
		</View>
	);
}
