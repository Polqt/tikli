import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import { env } from "@tikli/env/native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Registers for push notifications and saves the token to the server. */
export function useNotifications() {
  const { getToken, isSignedIn } = useAuth();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    void registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      try {
        const clerkToken = await getToken({ template: "convex" });
        await fetch(`${env.EXPO_PUBLIC_API_URL}/api/users/push-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${clerkToken}`,
          },
          body: JSON.stringify({ token }),
        });
      } catch {
        // Non-critical — just log
        console.warn("Failed to save push token");
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((_notification) => {
      // Handle foreground notification display if needed
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((_response) => {
      // Handle notification tap — navigate if needed
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [isSignedIn, getToken]);
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("tikli-default", {
      name: "Tikli Notifications",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: "tikli",
    });
    return tokenData.data;
  } catch {
    return null;
  }
}

/**
 * Schedule local notifications for upcoming cycle due dates.
 * Should be called after group data loads. Replaces existing scheduled notifications
 * for the given group.
 */
export async function scheduleGroupNotifications(
  groupId: string,
  cycles: Array<{
    cycleIndex: number;
    endDate: number;
    payoutDate: number;
    status: string;
  }>,
  reminderDaysBefore = 2,
) {
  // Cancel existing notifications for this group
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if ((n.content.data as { groupId?: string } | undefined)?.groupId === groupId) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }

  // Schedule for the next 3 upcoming cycles only (iOS 64-notification limit)
  const upcomingCycles = cycles
    .filter((c) => c.status === "upcoming" || c.status === "active")
    .slice(0, 3);

  for (const cycle of upcomingCycles) {
    const dueDate = new Date(cycle.endDate);
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

    if (reminderDate.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Paluwagan Due Soon",
          body: `Your contribution for cycle ${cycle.cycleIndex + 1} is due ${reminderDaysBefore === 1 ? "tomorrow" : `in ${reminderDaysBefore} days`}.`,
          data: { groupId, cycleIndex: cycle.cycleIndex },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
      });
    }

    // Payout day notification
    const payoutDate = new Date(cycle.payoutDate);
    if (payoutDate.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Payout Day!",
          body: `Today is payout day for cycle ${cycle.cycleIndex + 1}. The pot is ready!`,
          data: { groupId, cycleIndex: cycle.cycleIndex, type: "payout" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: payoutDate,
        },
      });
    }
  }
}
