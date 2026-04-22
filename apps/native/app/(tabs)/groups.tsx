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
		<View className="flex-1 bg-[#F5F3EF]">
			<View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
				<View className="flex-row items-baseline gap-2">
					<Text className="text-2xl font-extrabold text-black tracking-tight">
						My Groups
					</Text>
					{groups && groups.length > 0 && (
						<Text className="text-sm font-bold text-black/35">
							{groups.length}
						</Text>
					)}
				</View>
				<TouchableOpacity
					className="w-10 h-10 rounded-xl bg-primary items-center justify-center"
					onPress={() => router.push("/(app)/groups/new")}
					accessibilityLabel="Create group"
				>
					<Ionicons name="add" size={22} color="#ffffff" />
				</TouchableOpacity>
			</View>

			<Skeleton isLoading={isLoading} skeleton={<GroupsSkeleton />}>
				{groups && groups.length === 0 ? (
					<View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
						<View className="w-16 h-16 rounded-2xl bg-black items-center justify-center mb-5">
							<Ionicons name="people-outline" size={28} color="#ffffff" />
						</View>
						<Text className="text-lg font-extrabold text-black text-center mb-2 tracking-tight">
							No groups yet
						</Text>
						<Text className="text-sm text-black/45 text-center leading-[21px] mb-8">
							Start a paluwagan circle or join one with an invite code.
						</Text>
						<TouchableOpacity
							className="bg-black py-[15px] rounded-full mb-3 w-full items-center"
							onPress={() => router.push("/(app)/groups/new")}
							activeOpacity={0.8}
						>
							<Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>Create a Group</Text>
						</TouchableOpacity>
						<TouchableOpacity
							className="py-[15px] w-full items-center"
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
							<View className="mx-5 mt-2">
								<TouchableOpacity
									style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}
									onPress={() => router.push("/(app)/groups/new")}
									activeOpacity={0.7}
								>
									<View className="w-8 h-8 rounded-lg bg-primary items-center justify-center">
										<Ionicons name="add" size={18} color="#ffffff" />
									</View>
									<Text style={{ fontSize: 14, fontWeight: "700", color: "#1D9E75" }}>Create New Group</Text>
								</TouchableOpacity>
								<TouchableOpacity
									style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 16 }}
									onPress={() => router.push("/(app)/groups/join")}
									activeOpacity={0.7}
								>
									<View className="w-8 h-8 rounded-lg bg-black/10 items-center justify-center">
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
