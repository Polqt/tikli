import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Share, Text, TouchableOpacity, View } from "react-native";

interface InviteCodeCardProps {
	code: string;
}

export function InviteCodeCard({ code }: InviteCodeCardProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await Clipboard.setStringAsync(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleShare = async () => {
		await Share.share({
			message: `Join my paluwagan group on Tikli! Use invite code: ${code}\n\nDownload Tikli to get started.`,
		});
	};

	return (
		<View
			style={{
				backgroundColor: "#F0FDF8",
				borderRadius: 16,
				padding: 20,
				borderWidth: 2,
				borderColor: "#1D9E75",
				borderStyle: "dashed",
			}}
		>
			<Text
				style={{
					fontSize: 13,
					color: "#6B7280",
					fontWeight: "600",
					marginBottom: 8,
				}}
			>
				INVITE CODE
			</Text>
			<Text
				style={{
					fontSize: 36,
					fontWeight: "800",
					color: "#1D9E75",
					letterSpacing: 8,
					marginBottom: 16,
				}}
			>
				{code}
			</Text>
			<View style={{ flexDirection: "row", gap: 10 }}>
				<TouchableOpacity
					style={{
						flex: 1,
						backgroundColor: copied ? "#D1FAE5" : "#1D9E75",
						paddingVertical: 12,
						borderRadius: 12,
						alignItems: "center",
					}}
					onPress={handleCopy}
					activeOpacity={0.8}
				>
					<Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 14 }}>
						{copied ? "✓ Copied!" : "Copy Code"}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={{
						flex: 1,
						backgroundColor: "#ffffff",
						paddingVertical: 12,
						borderRadius: 12,
						alignItems: "center",
						borderWidth: 2,
						borderColor: "#1D9E75",
					}}
					onPress={handleShare}
					activeOpacity={0.8}
				>
					<Text style={{ color: "#1D9E75", fontWeight: "700", fontSize: 14 }}>
						Share
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}
