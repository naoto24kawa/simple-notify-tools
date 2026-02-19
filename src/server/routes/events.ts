import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { NotificationListener } from "./notifications";

export function createEventsRoute(subscribe: (listener: NotificationListener) => () => void) {
  const app = new Hono().get("/api/events", (c) => {
    return streamSSE(c, async (stream) => {
      const unsubscribe = subscribe((event, data) => {
        stream.writeSSE({
          event,
          data: JSON.stringify(data),
          id: Date.now().toString(),
        });
      });

      stream.onAbort(() => {
        unsubscribe();
      });

      // Keep connection alive
      while (true) {
        await stream.writeSSE({
          event: "ping",
          data: "",
        });
        await stream.sleep(30000);
      }
    });
  });

  return app;
}
