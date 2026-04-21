import * as Network from "expo-network";
import { useEffect, useState } from "react";

export function useNetworkStatus() {
	const [isOnline, setIsOnline] = useState(true);

	useEffect(() => {
		let mounted = true;

		async function syncState() {
			const state = await Network.getNetworkStateAsync();

			if (mounted) {
				setIsOnline(
					Boolean(state.isConnected && state.isInternetReachable !== false),
				);
			}
		}

		void syncState();

		const subscription = Network.addNetworkStateListener((state) => {
			if (mounted) {
				setIsOnline(
					Boolean(state.isConnected && state.isInternetReachable !== false),
				);
			}
		});

		return () => {
			mounted = false;
			subscription.remove();
		};
	}, []);

	return { isOnline };
}
