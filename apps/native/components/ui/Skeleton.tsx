import { useEffect, useRef } from "react";
import { Animated, type ViewStyle } from "react-native";

interface SkeletonBlockProps {
	width?: number | `${number}%`;
	height?: number;
	borderRadius?: number;
	style?: ViewStyle;
}

export function SkeletonBlock({
	width = "100%",
	height = 20,
	borderRadius = 8,
	style,
}: SkeletonBlockProps) {
	const shimmer = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		const anim = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmer, {
					toValue: 1,
					duration: 900,
					useNativeDriver: true,
				}),
				Animated.timing(shimmer, {
					toValue: 0,
					duration: 900,
					useNativeDriver: true,
				}),
			]),
		);
		anim.start();
		return () => anim.stop();
	}, [shimmer]);

	const opacity = shimmer.interpolate({
		inputRange: [0, 1],
		outputRange: [0.4, 0.9],
	});

	return (
		<Animated.View
			style={[
				{
					width,
					height,
					borderRadius,
					backgroundColor: "#E5E7EB",
					opacity,
				},
				style,
			]}
		/>
	);
}

interface SkeletonProps {
	isLoading: boolean;
	children: React.ReactNode;
	skeleton: React.ReactNode;
}

export function Skeleton({ isLoading, children, skeleton }: SkeletonProps) {
	if (isLoading) return <>{skeleton}</>;
	return <>{children}</>;
}
