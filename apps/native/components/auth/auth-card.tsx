import type { ReactNode } from "react";
import { View } from "react-native";

export function AuthCard({ children }: { children: ReactNode }) {
	return (
		<View className="overflow-hidden rounded-[34px] border border-black/5 bg-white px-6 py-6">
			<View className="absolute right-0 top-0 h-28 w-28 rounded-full bg-teal/10" />
			<View className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-coral/10" />
			{children}
		</View>
	);
}
