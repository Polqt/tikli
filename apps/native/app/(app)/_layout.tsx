import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useNotifications } from "@/hooks/useNotifications";

function AppLayoutInner() {
  // Sync Clerk user → Convex on every app open
  useCurrentUser();
  // Register for push notifications & save token
  useNotifications();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="groups" />
      <Stack.Screen name="invite" />
    </Stack>
  );
}

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return <AppLayoutInner />;
}
