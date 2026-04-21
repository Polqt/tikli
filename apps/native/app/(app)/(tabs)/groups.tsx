import { Ionicons } from "@expo/vector-icons";
import { api } from "@tikli/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GroupCard } from "@/components/groups/GroupCard";
import { Skeleton, SkeletonBlock } from "@/components/ui/Skeleton";

type GroupItem = Parameters<typeof GroupCard>[0]["group"];

function GroupsSkeleton() {
	return (
		<View style={{ paddingHorizontal: 20, gap: 12, paddingTop: 8 }}>
			{Array.from({ length: 4 }).map((_, i) => (
				<SkeletonBlock key={i} height={110} borderRadius={20} />
			))}
		</View>
	);
}

export default function GroupsScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const groups = useQuery(api.groups.listForUser);
	const isLoading = groups === undefined;

	return (
		<View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
			<View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
					<Text style={{ fontSize: 28, fontWeight: "800", color: "#242424", letterSpacing: -0.5 }}>
						My Groups
					</Text>
					{groups && groups.length > 0 && (
						<Text style={{ fontSize: 14, fontWeight: "700", color: "rgba(36,36,36,0.35)" }}>
							{groups.length}
						</Text>
					)}
				</View>
				<TouchableOpacity
					style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#1D9E75", alignItems: "center", justifyContent: "center" }}
					onPress={() => router.push("/(app)/groups/new")}
					accessibilityLabel="Create group"
				>
					<Ionicons name="add" size={22} color="#ffffff" />
				</TouchableOpacity>
			</View>

			<Skeleton isLoading={isLoading} skeleton={<GroupsSkeleton />}>
				{groups && groups.length === 0 ? (
					<View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
						<View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: "#242424", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
							<Ionicons name="people-outline" size={28} color="#ffffff" />
						</View>
						<Text style={{ fontSize: 20, fontWeight: "800", color: "#242424", textAlign: "center", marginBottom: 8, letterSpacing: -0.3 }}>
							No groups yet
						</Text>
						<Text style={{ fontSize: 14, color: "#242424", opacity: 0.45, textAlign: "center", lineHeight: 21, marginBottom: 32 }}>
							Start a paluwagan circle or join one with an invite code.
						</Text>
						<TouchableOpacity
							style={{ backgroundColor: "#242424", paddingVertical: 15, borderRadius: 999, marginBottom: 12, width: "100%", alignItems: "center" }}
							onPress={() => router.push("/(app)/groups/new")}
							activeOpacity={0.8}
						>
							<Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Create a Group</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={{ paddingVertical: 15, width: "100%", alignItems: "center" }}
							onPress={() => router.push("/(app)/groups/join")}
							activeOpacity={0.8}
						>
							<Text style={{ color: "#1D9E75", fontWeight: "700", fontSize: 15 }}>Join with Code</Text>
						</TouchableOpacity>
					</View>
				) : (
					<FlatList
						data={groups ?? []}
						keyExtractor={(item) => item!._id}
						renderItem={({ item }) => item ? <GroupCard group={item as GroupItem} /> : null}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingTop: 4, paddingBottom: insets.bottom + 100 }}
						ListFooterComponent={
							<View style={{ marginHorizontal: 20, marginTop: 8 }}>
								<TouchableOpacity
									style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}
									onPress={() => router.push("/(app)/groups/new")}
									activeOpacity={0.7}
								>
									<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "#1D9E75", alignItems: "center", justifyContent: "center" }}>
										<Ionicons name="add" size={18} color="#ffffff" />
									</View>
									<Text style={{ fontSize: 14, fontWeight: "700", color: "#1D9E75" }}>Create New Group</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}
									onPress={() => router.push("/(app)/groups/join")}
									activeOpacity={0.7}
								>
									<View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(36,36,36,0.08)", alignItems: "center", justifyContent: "center" }}>
										<Ionicons name="link-outline" size={16} color="#242424" />
									</View>
									<Text style={{ fontSize: 14, fontWeight: "600", color: "rgba(36,36,36,0.5)" }}>Join with Code</Text>
								</TouchableOpacity>
							</View>
						}
					/>
				)}
			</Skeleton>
		</View>
	);
}
