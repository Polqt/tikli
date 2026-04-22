import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { APP_TABS_ROUTE, AUTH_WELCOME_ROUTE } from "@/lib/auth/auth-routes";

export default function Index() {
	const { isSignedIn, isLoaded } = useAuth();

	if (!isLoaded) {
		return <View style={{ flex: 1 }} />;
	}

	if (isSignedIn) {
		return <Redirect href={APP_TABS_ROUTE} />;
	}

	return <Redirect href={AUTH_WELCOME_ROUTE} />;
}
