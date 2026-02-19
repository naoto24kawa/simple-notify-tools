import { join } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { createEventsRoute } from "./routes/events";
import { createFocusWindowRoute } from "./routes/focus-window";
import { createNotificationRoutes } from "./routes/notifications";

const app = new Hono();

app.use("/*", cors());

// Health check
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Notification routes
const { app: notificationApp, subscribe } = createNotificationRoutes();
app.route("/", notificationApp);

// SSE events route
const eventsApp = createEventsRoute(subscribe);
app.route("/", eventsApp);

// Focus window route
const { app: focusWindowApp } = createFocusWindowRoute();
app.route("/", focusWindowApp);

// Serve frontend static files
const frontendDist = join(import.meta.dir, "../../frontend/dist");

app.use("/assets/*", serveStatic({ root: frontendDist }));
app.use("/favicon*", serveStatic({ root: frontendDist }));

// SPA fallback
app.get("*", async (c) => {
  const file = Bun.file(join(frontendDist, "index.html"));
  if (await file.exists()) {
    return c.html(await file.text());
  }
  return c.text("Frontend not built. Run: bun run build", 503);
});

// AppType for Hono RPC
export type AppType = typeof app;

const port = Number(process.env.PORT) || 23000;

console.log(`Starting server on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
