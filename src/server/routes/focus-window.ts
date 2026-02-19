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

const CODE_CMD = process.env.CODE_CMD || "code-insiders";

type SpawnFn = (cmd: string, dir: string) => void;

const defaultSpawn: SpawnFn = (cmd, dir) => {
  Bun.spawn([cmd, "-r", dir], { stdio: ["ignore", "ignore", "ignore"] });
};

export function createFocusWindowRoute(spawn: SpawnFn = defaultSpawn) {
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
      spawn(CODE_CMD, projectDir);
    } catch {
      console.warn(`Failed to spawn "${CODE_CMD}" for ${projectDir}`);
    }

    return c.json({ success: true });
  });

  return { app };
}
