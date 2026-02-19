import { existsSync, statSync } from "node:fs";
import { Hono } from "hono";
import { z } from "zod";

const DANGEROUS_CHARS = /[;&|`$(){}!<>]/;

const focusWindowSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .refine((v) => !DANGEROUS_CHARS.test(v), "Invalid characters in path"),
});

export function createFocusWindowRoute() {
  const app = new Hono().post("/api/focus-window", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const result = focusWindowSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: result.error.flatten() }, 400);
    }

    const { projectDir } = result.data;

    if (!existsSync(projectDir) || !statSync(projectDir).isDirectory()) {
      return c.json({ error: "Directory not found" }, 404);
    }

    try {
      Bun.spawn(["code", projectDir], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } catch {
      // Best-effort: code command may not be available in all environments
      console.warn(`Failed to spawn "code" for ${projectDir}`);
    }

    return c.json({ success: true });
  });

  return { app };
}
