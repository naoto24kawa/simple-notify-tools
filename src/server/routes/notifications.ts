import { Hono } from "hono";
import { z } from "zod";
import { isSummarizationEnabled, shouldSummarize, summarizeMessage } from "../lib/summarize";
import { NotificationStore } from "../store/notification-store";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  category: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type NotificationListener = (
  event: "created" | "read" | "deleted" | "updated",
  data: unknown,
) => void;

interface NotificationRoutesOptions {
  onNotify?: (notification: {
    title: string;
    message: string;
    category: string;
    metadata: Record<string, unknown>;
  }) => void;
  onSummary?: (notification: { title: string; summary: string; category: string }) => void;
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
      console.log(`[notify] ${notification.title}: ${notification.message.slice(0, 80)}`);
      for (const listener of listeners) {
        listener("created", notification);
      }
      const willSummarize = shouldSummarize(notification.message);
      if (!willSummarize) {
        try {
          options?.onNotify?.(notification);
        } catch (err) {
          console.warn("[notify] onNotify callback error:", err);
        }
      }
      if (isSummarizationEnabled()) {
        void summarizeMessage(notification.message).then((summary) => {
          if (summary) {
            const updated = store.update(notification.id, { summary });
            if (updated) {
              for (const listener of listeners) {
                listener("updated", updated);
              }
              try {
                options?.onSummary?.({
                  title: notification.title,
                  summary,
                  category: notification.category ?? "info",
                });
              } catch (err) {
                console.warn("[notify] onSummary callback error:", err);
              }
            }
          }
        });
      }
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
