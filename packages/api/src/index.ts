import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types.js";
import { groupsRouter } from "./routes/groups.js";
import { invitesRouter } from "./routes/invites.js";
import { membersRouter } from "./routes/members.js";
import { paymentsRouter } from "./routes/payments.js";
import { usersRouter } from "./routes/users.js";

const app = new Hono<{ Bindings: Env }>()
  .use(logger())
  .use(
    cors({
      // Native apps don't send an Origin header, so this passes through.
      // For web clients, set CORS_ORIGIN in Cloudflare Workers env vars.
      origin: (origin) => origin ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE"],
      allowHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .get("/health", (c) => c.json({ ok: true, service: "tikli-api" }))
  .route("/api/groups", groupsRouter)
  .route("/api/invites", invitesRouter)
  .route("/api/payments", paymentsRouter)
  .route("/api/members", membersRouter)
  .route("/api/users", usersRouter);

export type AppType = typeof app;

export default app;
