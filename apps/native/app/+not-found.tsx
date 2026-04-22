import { Link, Stack } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { APP_TABS_ROUTE } from "@/lib/auth/auth-routes";

export default function NotFoundScreen() {
	return (
		<>
			<Stack.Screen options={{ title: "Not Found" }} />
			<SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
				<View
					style={{
						flex: 1,
						alignItems: "center",
						justifyContent: "center",
						padding: 32,
					}}
				>
					<Text style={{ fontSize: 56, marginBottom: 16 }}>🔍</Text>
					<Text
						style={{
							fontSize: 20,
							fontWeight: "800",
							color: "#111827",
							marginBottom: 8,
						}}
					>
						Page Not Found
					</Text>
					<Text
						style={{
							fontSize: 14,
							color: "#6B7280",
							textAlign: "center",
							marginBottom: 32,
						}}
					>
						The page you're looking for doesn't exist.
					</Text>
					<Link href={APP_TABS_ROUTE} asChild>
						<TouchableOpacity
							style={{
								backgroundColor: "#1D9E75",
								paddingVertical: 14,
								paddingHorizontal: 40,
								borderRadius: 14,
							}}
							activeOpacity={0.8}
						>
							<Text
								style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}
							>
								Go Home
							</Text>
						</TouchableOpacity>
					</Link>
				</View>
			</SafeAreaView>
		</>
	);
}
