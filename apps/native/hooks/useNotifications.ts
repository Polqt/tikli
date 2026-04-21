import { useAuth } from "@clerk/expo";
import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { env } from "@tikli/env/native";

type NotificationsModule = typeof import("expo-notifications");
type NotificationSubscription = Awaited<
	ReturnType<NotificationsModule["addNotificationReceivedListener"]>
>;

const isExpoGo = Constants.appOwnership === "expo";

let notificationHandlerRegistered = false;

/** Registers for push notifications and saves the token to the server. */
export function useNotifications() {
	const { getToken, isSignedIn } = useAuth();
	const notificationListener = useRef<NotificationSubscription | null>(null);
	const responseListener = useRef<NotificationSubscription | null>(null);

	useEffect(() => {
		if (!isSignedIn || isExpoGo) {
			return;
		}

		let isMounted = true;

		void setupNotifications()
			.then(async (notifications) => {
				if (!notifications || !isMounted) {
					return;
				}

				const token = await registerForPushNotificationsAsync(notifications);
				if (!token || !isMounted) {
					return;
				}

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
					console.warn("Failed to save push token");
				}

				notificationListener.current =
					notifications.addNotificationReceivedListener((_notification) => {
						// Handle foreground notification display if needed.
					});

				responseListener.current =
					notifications.addNotificationResponseReceivedListener((_response) => {
						// Handle notification tap and navigation if needed.
					});
			})
			.catch(() => {
				// Notifications are optional in Expo Go and unsupported environments.
			});

		return () => {
			isMounted = false;
			notificationListener.current?.remove();
			responseListener.current?.remove();
			notificationListener.current = null;
			responseListener.current = null;
		};
	}, [getToken, isSignedIn]);
}

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
	const notifications = await setupNotifications();
	if (!notifications) {
		return;
	}

	const scheduled = await notifications.getAllScheduledNotificationsAsync();
	for (const notification of scheduled) {
		if (
			(notification.content.data as { groupId?: string } | undefined)?.groupId ===
			groupId
		) {
			await notifications.cancelScheduledNotificationAsync(
				notification.identifier,
			);
		}
	}

	const upcomingCycles = cycles
		.filter((cycle) => cycle.status === "upcoming" || cycle.status === "active")
		.slice(0, 3);

	for (const cycle of upcomingCycles) {
		const dueDate = new Date(cycle.endDate);
		const reminderDate = new Date(dueDate);
		reminderDate.setDate(reminderDate.getDate() - reminderDaysBefore);

		if (reminderDate.getTime() > Date.now()) {
			await notifications.scheduleNotificationAsync({
				content: {
					title: "Paluwagan Due Soon",
					body: `Your contribution for cycle ${cycle.cycleIndex + 1} is due ${
						reminderDaysBefore === 1 ? "tomorrow" : `in ${reminderDaysBefore} days`
					}.`,
					data: { groupId, cycleIndex: cycle.cycleIndex },
				},
				trigger: {
					type: notifications.SchedulableTriggerInputTypes.DATE,
					date: reminderDate,
				},
			});
		}

		const payoutDate = new Date(cycle.payoutDate);
		if (payoutDate.getTime() > Date.now()) {
			await notifications.scheduleNotificationAsync({
				content: {
					title: "Payout Day",
					body: `Today is payout day for cycle ${cycle.cycleIndex + 1}. The pot is ready.`,
					data: { groupId, cycleIndex: cycle.cycleIndex, type: "payout" },
				},
				trigger: {
					type: notifications.SchedulableTriggerInputTypes.DATE,
					date: payoutDate,
				},
			});
		}
	}
}

async function setupNotifications(): Promise<NotificationsModule | null> {
	if (isExpoGo) {
		return null;
	}

	const notifications = await import("expo-notifications");

	if (!notificationHandlerRegistered) {
		notifications.setNotificationHandler({
			handleNotification: async () => ({
				shouldShowAlert: true,
				shouldPlaySound: true,
				shouldSetBadge: false,
				shouldShowBanner: true,
				shouldShowList: true,
			}),
		});
		notificationHandlerRegistered = true;
	}

	return notifications;
}

async function registerForPushNotificationsAsync(
	notifications: NotificationsModule,
): Promise<string | null> {
	if (Platform.OS === "android") {
		await notifications.setNotificationChannelAsync("tikli-default", {
			name: "Tikli Notifications",
			importance: notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
		});
	}

	const { status: existingStatus } = await notifications.getPermissionsAsync();
	let finalStatus = existingStatus;

	if (existingStatus !== "granted") {
		const { status } = await notifications.requestPermissionsAsync();
		finalStatus = status;
	}

	if (finalStatus !== "granted") {
		return null;
	}

	try {
		const tokenData = await notifications.getExpoPushTokenAsync({
			projectId: "tikli",
		});
		return tokenData.data;
	} catch {
		return null;
	}
}
