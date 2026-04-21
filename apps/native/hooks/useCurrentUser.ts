import { useUser } from "@clerk/expo";
import { api } from "@tikli/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";

export function useCurrentUser() {
	const { user, isLoaded } = useUser();
	const convexProfile = useQuery(api.users.getProfile);
	const upsertUser = useMutation(api.users.upsertUser);
	const hasSynced = useRef(false);

	useEffect(() => {
		if (!isLoaded || !user || hasSynced.current || convexProfile === undefined) {
			return;
		}

		const email = user.emailAddresses[0]?.emailAddress ?? "";
		const displayName = user.fullName ?? undefined;
		const needsSync =
			!convexProfile ||
			convexProfile.email !== email ||
			(convexProfile.displayName ?? undefined) !== displayName;

		if (!needsSync) {
			hasSynced.current = true;
			return;
		}

		void upsertUser({ email, displayName })
			.then(() => { hasSynced.current = true; })
			.catch(() => { hasSynced.current = false; });
	}, [convexProfile, isLoaded, upsertUser, user]);

	return {
		clerkUser: user,
		convexProfile,
		isLoaded: isLoaded && convexProfile !== undefined,
	};
}
