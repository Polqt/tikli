import { zValidator } from "@hono/zod-validator";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Hono } from "hono";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import type { Env, Variables } from "../types.js";

const createGroupSchema = z.object({
  name: z.string().min(1).max(80),
  contributionAmount: z.number().int().positive(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  startDate: z.number().int().positive(),
  maxMembers: z.number().int().min(2).max(30),
  description: z.string().max(200).optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(200).optional(),
});

function convexClient(url: string, token: string): ConvexHttpClient {
  const c = new ConvexHttpClient(url);
  c.setAuth(token);
  return c;
}

// String-based references work in Cloudflare Workers and avoid generated-type deps
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fn = (name: string) => makeFunctionReference<"mutation", any, any>(name);

export const groupsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use(authMiddleware)
  .post("/", zValidator("json", createGroupSchema), async (c) => {
    const body = c.req.valid("json");
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    const groupId = await client.mutation(fn("groups:createGroup"), {
      ...body,
      clerkId: c.get("clerkId"),
    });
    return c.json({ groupId }, 201);
  })
  .patch("/:groupId", zValidator("json", updateGroupSchema), async (c) => {
    const { groupId } = c.req.param();
    const body = c.req.valid("json");
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("groups:updateGroup"), { groupId, ...body });
    return c.json({ ok: true });
  })
  .post("/:groupId/activate", async (c) => {
    const { groupId } = c.req.param();
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("groups:activateGroup"), { groupId });
    return c.json({ ok: true });
  })
  .post("/:groupId/pause", async (c) => {
    const { groupId } = c.req.param();
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("groups:pauseGroup"), { groupId });
    return c.json({ ok: true });
  })
  .post("/:groupId/resume", async (c) => {
    const { groupId } = c.req.param();
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("groups:resumeGroup"), { groupId });
    return c.json({ ok: true });
  })
  .post(
    "/:groupId/cycle-complete",
    zValidator("json", z.object({ cycleId: z.string() })),
    async (c) => {
      const { cycleId } = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("cycles:completeCycle"), { cycleId });
      return c.json({ ok: true });
    },
  );
