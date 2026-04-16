import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <View style={{ flex: 1 }} />;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/(tabs)/" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
