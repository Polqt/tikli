import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { APP_TABS_ROUTE } from "@/lib/auth/auth-routes";

export default function AuthRoutesLayout() {
	const { isLoaded, isSignedIn } = useAuth();

	if (!isLoaded) {
		return null;
	}

	if (isSignedIn) {
		return <Redirect href={APP_TABS_ROUTE} />;
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="welcome" />
			<Stack.Screen name="sign-in" />
			<Stack.Screen name="verify" />
		</Stack>
	);
}
