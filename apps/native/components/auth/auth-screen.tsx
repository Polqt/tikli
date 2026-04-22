import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function AuthScreen({
	children,
	footer,
	appBar,
}: {
	children: ReactNode;
	footer?: ReactNode;
	appBar?: ReactNode;
}) {
	const insets = useSafeAreaInsets();

	return (
		<View style={{ flex: 1, backgroundColor: "#f7f6f2" }}>
			<View
				style={{
					paddingTop: insets.top + 8,
					paddingHorizontal: 20,
					paddingBottom: appBar ? 8 : 0,
					backgroundColor: "#f7f6f2",
				}}
			>
				{appBar}
			</View>
			<ScrollView
				contentInsetAdjustmentBehavior="never"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					flexGrow: 1,
					paddingHorizontal: 20,
					paddingTop: 12,
					paddingBottom: 24,
					gap: 20,
				}}
			>
				{children}
			</ScrollView>
			{footer ? (
				<View
					style={{
						paddingHorizontal: 20,
						paddingTop: 12,
						paddingBottom: Math.max(insets.bottom, 16),
						backgroundColor: "rgba(247, 246, 242, 0.96)",
					}}
				>
					{footer}
				</View>
			) : null}
		</View>
	);
}
