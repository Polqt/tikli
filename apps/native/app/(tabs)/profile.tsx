import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useCurrentUser } from "@/hooks/useCurrentUser";


function Row({
	icon,
	iconBg,
	label,
	sub,
	onPress,
	destructive,
	hideChevron,
}: {
	icon: keyof typeof Ionicons.glyphMap;
	iconBg: string;
	label: string;
	sub?: string;
	onPress?: () => void;
	destructive?: boolean;
	hideChevron?: boolean;
}) {
	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={!onPress}
			activeOpacity={onPress ? 0.65 : 1}
			style={{ flexDirection: "row", alignItems: "center", paddingVertical: 13, gap: 14 }}
		>
			<View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>
				<Ionicons name={icon} size={17} color={destructive ? "#DC2626" : "#242424"} />
			</View>
			<View style={{ flex: 1 }}>
				<Text style={{ fontSize: 14, fontWeight: "600", color: destructive ? "#DC2626" : "#242424" }}>
					{label}
				</Text>
				{sub ? <Text style={{ fontSize: 12, color: "#242424", opacity: 0.38, marginTop: 1, fontWeight: "500" }} numberOfLines={1}>{sub}</Text> : null}
			</View>
			{!destructive && !hideChevron && onPress ? (
				<Ionicons name="chevron-forward" size={14} color="#242424" style={{ opacity: 0.2 }} />
			) : null}
		</TouchableOpacity>
	);
}


export default function ProfileScreen() {
	const { clerkUser, convexProfile } = useCurrentUser();
	const { signOut } = useAuth();
	const insets = useSafeAreaInsets();
	const [editingName, setEditingName] = useState(false);
	const [displayName, setDisplayName] = useState(convexProfile?.displayName ?? "");
	const { mutate: updateProfile, loading: saving } = useApiMutation();

	const email = convexProfile?.email ?? clerkUser?.emailAddresses[0]?.emailAddress ?? "—";
	const name = convexProfile?.displayName ?? email.split("@")[0] ?? "—";

	const openEdit = () => {
		setDisplayName(convexProfile?.displayName ?? "");
		setEditingName(true);
	};

	const handleSaveName = async () => {
		if (!displayName.trim()) return;
		const result = await updateProfile({
			path: "/api/users/profile",
			method: "PATCH",
			body: { displayName: displayName.trim() },
		});
		if (result !== null) setEditingName(false);
		else Alert.alert("Error", "Could not update name. Please try again.");
	};

	return (
		<View style={{ flex: 1, backgroundColor: "#F5F3EF" }}>
			<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
				{/* Title */}
				<View style={{ paddingHorizontal: 20, paddingTop: insets.top + 16, paddingBottom: 36 }}>
					<Text style={{ fontSize: 28, fontWeight: "800", color: "#242424", letterSpacing: -0.5 }}>Profile</Text>
				</View>

				{/* Avatar — centered, tappable */}
				<View style={{ alignItems: "center", marginBottom: 8 }}>
					<TouchableOpacity onPress={openEdit} activeOpacity={0.8}>
						<View>
							<Avatar name={convexProfile?.displayName ?? email} color={convexProfile?.avatarColor} size="xl" />
							<View style={{
								position: "absolute", bottom: -4, right: -4,
								width: 26, height: 26, borderRadius: 8,
								backgroundColor: "#242424", alignItems: "center", justifyContent: "center",
								borderWidth: 2, borderColor: "#F5F3EF",
							}}>
								<Ionicons name="pencil" size={11} color="#ffffff" />
							</View>
						</View>
					</TouchableOpacity>
					<TouchableOpacity onPress={openEdit} activeOpacity={0.8} style={{ alignItems: "center", marginTop: 14 }}>
						<Text style={{ fontSize: 22, fontWeight: "800", color: "#242424", letterSpacing: -0.4 }}>{name}</Text>
						<Text style={{ fontSize: 13, color: "#242424", opacity: 0.4, marginTop: 3, fontWeight: "500" }}>{email}</Text>
					</TouchableOpacity>
				</View>

				{/* Inline name edit */}
				{editingName && (
					<View style={{ marginHorizontal: 20, marginTop: 24 }}>
						<Text style={{ fontSize: 11, fontWeight: "800", color: "#242424", opacity: 0.35, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
							Display Name
						</Text>
						<TextInput
							style={{ borderBottomWidth: 2, borderBottomColor: "#1D9E75", paddingVertical: 8, fontSize: 20, fontWeight: "700", color: "#242424" }}
							value={displayName}
							onChangeText={setDisplayName}
							placeholder="Your name"
							placeholderTextColor="rgba(36,36,36,0.22)"
							maxLength={50}
							autoFocus
						/>
						<View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
							<TouchableOpacity style={{ paddingVertical: 12, paddingHorizontal: 20, borderRadius: 999 }} onPress={() => setEditingName(false)}>
								<Text style={{ fontWeight: "700", color: "#242424", opacity: 0.38, fontSize: 14 }}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: "#242424", alignItems: "center" }}
								onPress={handleSaveName}
								disabled={saving}
							>
								{saving ? <ActivityIndicator color="#ffffff" size="small" /> : (
									<Text style={{ fontWeight: "700", color: "#ffffff", fontSize: 14 }}>Save name</Text>
								)}
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Sections */}
				<View style={{ paddingHorizontal: 20 }}>
					<SectionLabel>Account</SectionLabel>
<Row icon="mail-outline" iconBg="rgba(36,36,36,0.07)" label="Email" sub={email} hideChevron />
<Divider className="ml-13" />
<Row icon="person-outline" iconBg="rgba(36,36,36,0.07)" label="Display name" sub={convexProfile?.displayName ?? "Not set"} onPress={openEdit} />

<SectionLabel>App</SectionLabel>
<Row icon="notifications-outline" iconBg="rgba(36,36,36,0.07)" label="Notifications" onPress={() => {}} />
<Divider className="ml-13" />
<Row icon="help-circle-outline" iconBg="rgba(36,36,36,0.07)" label="Help & Support" onPress={() => {}} />

<SectionLabel>Session</SectionLabel>
<Row
  icon="log-out-outline"
  iconBg="#FEF2F2"
  label="Sign Out"
  destructive
  onPress={() =>
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: () => signOut() },
    ])
  }
/>
				</View>

				<Text style={{ textAlign: "center", fontSize: 11, color: "#242424", opacity: 0.16, fontWeight: "700", marginTop: 44, letterSpacing: 1 }}>
					TIKLI · v1.0.0
				</Text>
			</ScrollView>
		</View>
	);
}
