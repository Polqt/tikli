import { Text, View } from "react-native";
import { avatarColorFromString, initialsFromName } from "@/lib/avatarColors";

type AvatarSize = "sm" | "md" | "lg" | "xl";

const SIZE_MAP: Record<
	AvatarSize,
	{ container: number; font: number; radius: number }
> = {
	sm: { container: 32, font: 12, radius: 10 },
	md: { container: 40, font: 15, radius: 12 },
	lg: { container: 56, font: 20, radius: 16 },
	xl: { container: 72, font: 26, radius: 20 },
};

interface AvatarProps {
	name?: string | null;
	color?: string;
	size?: AvatarSize;
}

export function Avatar({ name, color, size = "md" }: AvatarProps) {
	const initials = initialsFromName(name);
	const bg = color ?? avatarColorFromString(name ?? "??");
	const { container, font, radius } = SIZE_MAP[size];

	return (
		<View
			style={{
				width: container,
				height: container,
				borderRadius: radius,
				backgroundColor: bg,
				alignItems: "center",
				justifyContent: "center",
			}}
			accessible
			accessibilityLabel={`Avatar for ${name ?? "member"}`}
		>
			<Text style={{ color: "#ffffff", fontSize: font, fontWeight: "700" }}>
				{initials}
			</Text>
		</View>
	);
}
