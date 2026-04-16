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

export const membersRouter = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use(authMiddleware)
  .patch(
    "/:groupId/reorder",
    zValidator("json", z.object({ orderedMemberIds: z.array(z.string()) })),
    async (c) => {
      const { groupId } = c.req.param();
      const { orderedMemberIds } = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("members:reorderRotation"), { groupId, orderedMemberIds });
      return c.json({ ok: true });
    },
  )
  .delete("/:memberId", async (c) => {
    const { memberId } = c.req.param();
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("members:removeMember"), { memberId });
    return c.json({ ok: true });
  });
