import { Text, View } from "react-native";

interface EmptyStateProps {
	icon?: string;
	title: string;
	description?: string;
	action?: React.ReactNode;
}

export function EmptyState({
	icon = "📭",
	title,
	description,
	action,
}: EmptyStateProps) {
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				paddingHorizontal: 32,
				paddingVertical: 48,
			}}
		>
			<Text style={{ fontSize: 48, marginBottom: 16 }}>{icon}</Text>
			<Text
				style={{
					fontSize: 18,
					fontWeight: "700",
					color: "#111827",
					textAlign: "center",
					marginBottom: 8,
				}}
			>
				{title}
			</Text>
			{description && (
				<Text
					style={{
						fontSize: 14,
						color: "#6B7280",
						textAlign: "center",
						lineHeight: 20,
						marginBottom: 24,
					}}
				>
					{description}
				</Text>
			)}
			{action}
		</View>
	);
}
