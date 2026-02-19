import { Hono } from "hono";
import { z } from "zod";
import { NotificationStore } from "../store/notification-store";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  category: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type NotificationListener = (event: "created" | "read" | "deleted", data: unknown) => void;

interface NotificationRoutesOptions {
  onNotify?: (notification: {
    title: string;
    message: string;
    category: string;
    metadata: Record<string, unknown>;
  }) => void;
}

export function createNotificationRoutes(filePath?: string, options?: NotificationRoutesOptions) {
  const store = new NotificationStore(filePath ?? "data/notifications.json");
  const listeners = new Set<NotificationListener>();

  const app = new Hono()
    .post("/api/notify", async (c) => {
      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        return c.json({ error: "Invalid JSON" }, 400);
      }
      const result = createNotificationSchema.safeParse(body);
      if (!result.success) {
        return c.json({ error: result.error.flatten() }, 400);
      }
      const notification = store.add(result.data);
      for (const listener of listeners) {
        listener("created", notification);
      }
      options?.onNotify?.(notification);
      return c.json(notification, 201);
    })
    .get("/api/notifications", (c) => {
      return c.json({ notifications: store.getAll() });
    })
    .patch("/api/notifications/:id/read", (c) => {
      const id = c.req.param("id");
      const notification = store.markAsRead(id);
      if (!notification) {
        return c.json({ error: "Not found" }, 404);
      }
      for (const listener of listeners) {
        listener("read", notification);
      }
      return c.json(notification);
    })
    .delete("/api/notifications/:id", (c) => {
      const id = c.req.param("id");
      const removed = store.remove(id);
      if (!removed) {
        return c.json({ error: "Not found" }, 404);
      }
      for (const listener of listeners) {
        listener("deleted", { id });
      }
      return c.json({ success: true });
    });

  function subscribe(listener: NotificationListener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { app, store, subscribe };
}
