import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
	Dimensions,
	FlatList,
	Text,
	TouchableOpacity,
	View,
	type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthBrandMosaic } from "@/components/auth/auth-brand-mosaic";
import { AUTH_SIGN_IN_ROUTE } from "@/lib/auth/auth-routes";

const { width: SW } = Dimensions.get("window");

const SLIDES = [
	{
		key: "s1",
		eyebrow: "Group savings",
		title: "Save together.\nKnow every move.",
		sub: "Paluwagan built for trust — transparent rotations, clear contributions, zero surprises.",
	},
	{
		key: "s2",
		eyebrow: "Always on track",
		title: "Your circle.\nYour schedule.",
		sub: "Set contribution amounts, track who paid, and see exactly whose turn is next.",
	},
	{
		key: "s3",
		eyebrow: "Start now",
		title: "Modern paluwagan\nfor real circles.",
		sub: "Join or start a group in seconds. Invite your circle and let Tikli handle the rest.",
	},
];

export default function WelcomeScreen() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const [activeIndex, setActiveIndex] = useState(0);
	const flatRef = useRef<FlatList>(null);

	const onViewableItemsChanged = useRef(
		({ viewableItems }: { viewableItems: ViewToken[] }) => {
			if (viewableItems[0]?.index != null) {
				setActiveIndex(viewableItems[0].index);
			}
		},
	).current;

	const goNext = () => {
		const next = activeIndex + 1;
		if (next < SLIDES.length) {
			flatRef.current?.scrollToIndex({ index: next, animated: true });
		} else {
			router.push(AUTH_SIGN_IN_ROUTE);
		}
	};

	return (
		<View className="flex-1 bg-[#1a1a1a]" style={{ paddingTop: insets.top }}>
			{/* Mosaic hero — fixed height ~48% */}
			<View style={{ height: "48%" }}>
				<AuthBrandMosaic />
			</View>

			{/* Swipeable content slides */}
			<FlatList
				ref={flatRef}
				data={SLIDES}
				keyExtractor={(item) => item.key}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onViewableItemsChanged={onViewableItemsChanged}
				viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
				style={{ flex: 1 }}
				renderItem={({ item }) => (
					<View
						style={{ width: SW }}
						className="px-6 pt-5"
					>
						<Text
							className="text-primary text-[11px] uppercase tracking-[2.4px]"
							style={{ fontWeight: "800" }}
						>
							{item.eyebrow}
						</Text>
						<Text
							className="mt-3 text-white"
							style={{ fontSize: 28, lineHeight: 35, fontWeight: "800", letterSpacing: -0.5 }}
						>
							{item.title}
						</Text>
						<Text
							className="mt-3 text-white/50"
							style={{ fontSize: 13, lineHeight: 19 }}
						>
							{item.sub}
						</Text>
					</View>
				)}
			/>

			{/* Bottom bar — dots + arrow */}
			<View
				className="flex-row items-center justify-between px-6"
				style={{ paddingBottom: Math.max(insets.bottom + 12, 28) }}
			>
				{/* Dot indicators */}
				<View className="flex-row items-center gap-2">
					{SLIDES.map((_, i) => (
						<View
							key={i}
							className={`h-2 rounded-full ${
								i === activeIndex ? "w-6 bg-white" : "w-2 bg-white/25"
							}`}
						/>
					))}
				</View>

				{/* Arrow orb */}
				<TouchableOpacity
					className="h-12 w-12 items-center justify-center rounded-full bg-white"
					onPress={goNext}
					activeOpacity={0.85}
				>
					<Ionicons name="arrow-forward" size={18} color="#1a1a1a" />
				</TouchableOpacity>
			</View>
		</View>
	);
}
