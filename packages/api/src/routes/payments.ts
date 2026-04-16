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

const markPaymentSchema = z.object({
  status: z.enum(["paid", "late", "excused"]),
  notes: z.string().max(200).optional(),
});

export const paymentsRouter = new Hono<{ Bindings: Env; Variables: Variables }>()
  .use(authMiddleware)
  .post("/:paymentId/mark", zValidator("json", markPaymentSchema), async (c) => {
    const { paymentId } = c.req.param();
    const body = c.req.valid("json");
    const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
    await client.mutation(fn("payments:markPayment"), { paymentId, ...body });
    return c.json({ ok: true });
  })
  .post(
    "/bulk-mark",
    zValidator(
      "json",
      z.object({
        paymentIds: z.array(z.string()).min(1),
        status: z.enum(["paid", "late", "excused"]),
      }),
    ),
    async (c) => {
      const body = c.req.valid("json");
      const client = convexClient(c.env.CONVEX_URL, c.get("clerkToken"));
      await client.mutation(fn("payments:bulkMarkPayments"), body);
      return c.json({ ok: true });
    },
  );
