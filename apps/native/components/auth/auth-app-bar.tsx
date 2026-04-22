import type { ReactNode } from "react";
import { Text, View } from "react-native";

type AuthAppBarProps = {
	leading?: ReactNode;
	title?: string;
	trailing?: ReactNode;
};

export function AuthAppBar({ leading, title, trailing }: AuthAppBarProps) {
	return (
		<View
			className="min-h-11 flex-row items-center justify-between gap-3"
		>
			<View className="min-w-11 items-start justify-center">
				{leading ?? null}
			</View>

			<View className="flex-1 items-center justify-center">
				{title ? (
					<Text
						numberOfLines={1}
						className="text-[12px] uppercase tracking-[2px] text-ink/45"
						style={{ fontWeight: "700" }}
					>
						{title}
					</Text>
				) : null}
			</View>

			<View className="min-w-11 items-end justify-center">
				{trailing ?? null}
			</View>
		</View>
	);
}
