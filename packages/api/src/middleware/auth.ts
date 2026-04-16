import { verifyToken } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import type { Env, Variables } from "../types.js";

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  const authorization = c.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authorization.slice(7);

  try {
    const payload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    c.set("clerkId", payload.sub);
    c.set("clerkToken", token);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});
