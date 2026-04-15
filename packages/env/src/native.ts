import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_CONVEX_URL: z.url(),
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    EXPO_PUBLIC_API_URL: z.url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
