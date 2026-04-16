import { zValidator } from "@hono/zod-validator";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import type { Env, Variables } from "../types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fn = (name: string) => makeFunctionReference<"mutation", any, any>(name);

function convexClient(url: string, token: string): ConvexHttpClient {
  const c = new ConvexHttpClient(url);
  c.setAuth(token);
  return c;
}

export const usersRouter = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use(authMiddleware)
  .patch(
    "/profile",
    zValidator("json", z.object({ displayName: z.string().min(1).max(50) })),
    async (c) => {
      const { displayName } = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("users:updateProfile"), { displayName });
      return c.json({ ok: true });
    },
  )
  .post(
    "/push-token",
    zValidator("json", z.object({ token: z.string().min(1) })),
    async (c) => {
      const { token } = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("users:updatePushToken"), { expoPushToken: token });
      return c.json({ ok: true });
    },
  );
