import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { CurrencyText } from "@/components/ui/CurrencyText";
import { FREQUENCY_LABEL } from "@/types";
import type { Frequency } from "@/types";

const GROUP_COLORS = ["#E0533D", "#E78C9D", "#EED868", "#377CC8", "#469B88", "#9DA7D0"];

function colorForName(name: string): string {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
	return GROUP_COLORS[Math.abs(h) % GROUP_COLORS.length]!;
}

function statusDot(status: string): string {
	switch (status) {
		case "active": return "#4ADE80";
		case "forming": return "#60A5FA";
		case "paused": return "#FBBF24";
		default: return "rgba(255,255,255,0.4)";
	}
}

interface GroupCardProps {
	group: {
		_id: string;
		name: string;
		status: string;
		potAmount: number;
		currentCycleIndex: number;
		totalCycles: number;
		frequency: string;
		currentCyclePaidCount?: number;
		currentCycleTotalCount?: number;
		isRecipientThisCycle?: boolean;
		joinedMemberCount?: number;
		maxMembers: number;
	};
}

export function GroupCard({ group }: GroupCardProps) {
	const router = useRouter();
	const bg = colorForName(group.name);
	const isYellow = bg === "#EED868";
	const textColor = isYellow ? "#242424" : "#ffffff";
	const subColor = isYellow ? "rgba(36,36,36,0.5)" : "rgba(255,255,255,0.6)";
	const trackColor = isYellow ? "rgba(36,36,36,0.15)" : "rgba(255,255,255,0.2)";
	const cycleProgress =
		group.status === "active" && group.totalCycles > 0
			? group.currentCycleIndex / group.totalCycles
			: 0;

	return (
		<TouchableOpacity
			style={{ backgroundColor: bg, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 12 }}
			onPress={() => router.push(`/(app)/groups/${group._id}`)}
			activeOpacity={0.88}
			accessibilityLabel={`Open ${group.name} group`}
		>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14 }}>
				<View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: statusDot(group.status), marginRight: 8 }} />
				<Text style={{ flex: 1, fontSize: 17, fontWeight: "800", color: textColor, letterSpacing: -0.3 }} numberOfLines={1}>
					{group.name}
				</Text>
				<Ionicons name="chevron-forward" size={15} color={textColor} style={{ opacity: 0.45 }} />
			</View>

			{group.status === "active" && (
				<View style={{ marginBottom: 14 }}>
					<View style={{ height: 3, borderRadius: 2, backgroundColor: trackColor, overflow: "hidden" }}>
						<View style={{ height: 3, width: `${Math.round(cycleProgress * 100)}%`, borderRadius: 2, backgroundColor: textColor }} />
					</View>
				</View>
			)}

			<View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
				<View>
					<Text style={{ fontSize: 10, color: subColor, fontWeight: "700", marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>
						Pot
					</Text>
					<CurrencyText centavos={group.potAmount} style={{ fontSize: 22, fontWeight: "800", color: textColor, letterSpacing: -0.5 }} />
				</View>
				<View style={{ alignItems: "flex-end" }}>
					<Text style={{ fontSize: 12, color: subColor, fontWeight: "600" }}>
						{FREQUENCY_LABEL[group.frequency as Frequency] ?? group.frequency}
					</Text>
					{group.status === "active" ? (
						<Text style={{ fontSize: 12, color: subColor, marginTop: 2 }}>
							Round {group.currentCycleIndex + 1}/{group.totalCycles}
						</Text>
					) : (
						<Text style={{ fontSize: 12, color: subColor, marginTop: 2, textTransform: "capitalize" }}>
							{group.status}
						</Text>
					)}
				</View>
			</View>
			{(() => {
				if (group.status === "forming") {
					return (
						<Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
							{group.joinedMemberCount ?? 1}/{group.maxMembers} members joined
						</Text>
					);
				}
				if (group.status === "paused") {
					return (
						<Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
							Paused
						</Text>
					);
				}
				if (group.status === "active") {
					if (group.isRecipientThisCycle) {
						return (
							<Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "600" }}>
								🏆 You receive next
							</Text>
						);
					}
					if (group.currentCyclePaidCount !== undefined && group.currentCycleTotalCount !== undefined) {
						return (
							<Text style={{ fontSize: 12, color: subColor, marginTop: 10, fontWeight: "500" }}>
								{group.currentCyclePaidCount}/{group.currentCycleTotalCount} paid this cycle
							</Text>
						);
					}
				}
				return null;
			})()}
		</TouchableOpacity>
	);
}
