import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "@tikli/backend/convex/_generated/api";

/**
 * Ensures the signed-in Clerk user has a corresponding Convex user record.
 * Should be called once in a top-level protected layout.
 */
export function useCurrentUser() {
  const { user, isLoaded } = useUser();
  const convexProfile = useQuery(api.users.getProfile);
  const upsertUser = useMutation(api.users.upsertUser);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSynced.current) return;

    const phoneNumber = user.phoneNumbers[0]?.phoneNumber ?? "";
    const clerkId = user.id;

    if (!convexProfile || convexProfile.phoneNumber !== phoneNumber) {
      hasSynced.current = true;
      void upsertUser({
        clerkId,
        phoneNumber,
        displayName: user.fullName ?? undefined,
      });
    } else {
      // Profile already matches — no upsert needed
      hasSynced.current = true;
    }
  }, [isLoaded, user, convexProfile, upsertUser]);

  return {
    clerkUser: user,
    convexProfile,
    isLoaded: isLoaded && convexProfile !== undefined,
  };
}
