import { Text, View } from "react-native";

export function AuthHero() {
	return (
		<View
			style={{
				borderRadius: 34,
				padding: 26,
				backgroundColor: "rgba(255,255,255,0.9)",
				gap: 22,
				borderWidth: 1,
				borderColor: "#ebe7df",
			}}
		>
			<View
				style={{
					alignSelf: "flex-start",
					paddingHorizontal: 14,
					paddingVertical: 8,
					borderRadius: 999,
					backgroundColor: "#eef8f4",
				}}
			>
				<Text style={{ fontSize: 12, fontWeight: "600", color: "#1d9e75" }}>
					Trusted group savings
				</Text>
			</View>

			<View style={{ gap: 8 }}>
				<Text
					style={{
						fontSize: 40,
						lineHeight: 46,
						fontWeight: "300",
						color: "#111827",
					}}
				>
					Save with people you trust.
				</Text>
				<Text style={{ fontSize: 16, lineHeight: 24, color: "#4b5563" }}>
					Tikli brings calm structure to community savings, with disciplined
					tracking and secure phone verification.
				</Text>
			</View>

			<View
				style={{
					height: 238,
					borderRadius: 30,
					backgroundColor: "#eef4ef",
					overflow: "hidden",
					justifyContent: "space-between",
					padding: 20,
				}}
			>
				<View style={{ flexDirection: "row", justifyContent: "space-between" }}>
					<View
						style={{
							width: 54,
							height: 54,
							borderRadius: 18,
							backgroundColor: "#ffffff",
						}}
					/>
					<View
						style={{
							width: 132,
							height: 56,
							borderRadius: 20,
							backgroundColor: "#d6eee3",
						}}
					/>
				</View>

				<View
					style={{
						marginLeft: "auto",
						width: "70%",
						borderRadius: 26,
						backgroundColor: "#ffffff",
						padding: 20,
						gap: 12,
					}}
				>
					<Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "600" }}>
						CURRENT GROUP
					</Text>
					<View
						style={{
							height: 11,
							borderRadius: 999,
							backgroundColor: "#e5e7eb",
						}}
					/>
					<View
						style={{
							height: 11,
							width: "58%",
							borderRadius: 999,
							backgroundColor: "#1d9e75",
						}}
					/>
				</View>
			</View>
		</View>
	);
}
