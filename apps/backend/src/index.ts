import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createEventsRoute } from "./routes/events";
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

// AppType for Hono RPC
export type AppType = typeof app;

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Notification server running at http://localhost:${info.port}`);
});

export default app;
