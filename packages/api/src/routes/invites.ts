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

export const invitesRouter = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use(authMiddleware)
  .post(
    "/join",
    zValidator("json", z.object({ code: z.string().length(6) })),
    async (c) => {
      const { code } = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      const result = await client.mutation(fn("invites:joinByCode"), { code });
      return c.json(result, 200);
    },
  )
  .post("/:groupId/regenerate", async (c) => {
    const { groupId } = c.req.param();
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    const newCode = await client.mutation(fn("invites:regenerateInviteCode"), { groupId });
    return c.json({ code: newCode });
  });
