import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createNotificationRoutes } from "./notifications";

const TEST_DIR = "data/test";
const TEST_FILE = `${TEST_DIR}/notifications-route-test.json`;

describe("Notification Routes", () => {
  let app: ReturnType<typeof createNotificationRoutes>["app"];

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    const routes = createNotificationRoutes(TEST_FILE);
    app = routes.app;
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test("POST /api/notify creates a notification", async () => {
    const res = await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Test",
        message: "Hello",
        category: "task_complete",
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("Test");
    expect(body.category).toBe("task_complete");
  });

  test("POST /api/notify validates required fields", async () => {
    const res = await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });

  test("GET /api/notifications returns all notifications", async () => {
    await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "A", message: "msg" }),
    });
    await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "B", message: "msg" }),
    });

    const res = await app.request("/api/notifications");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notifications).toHaveLength(2);
  });

  test("PATCH /api/notifications/:id/read marks as read", async () => {
    const createRes = await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", message: "msg" }),
    });
    const created = await createRes.json();

    const res = await app.request(`/api/notifications/${created.id}/read`, { method: "PATCH" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.read).toBe(true);
  });

  test("PATCH /api/notifications/:id/read returns 404 for non-existent", async () => {
    const res = await app.request("/api/notifications/non-existent/read", {
      method: "PATCH",
    });
    expect(res.status).toBe(404);
  });

  test("DELETE /api/notifications/:id removes notification", async () => {
    const createRes = await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", message: "msg" }),
    });
    const created = await createRes.json();

    const res = await app.request(`/api/notifications/${created.id}`, {
      method: "DELETE",
    });
    expect(res.status).toBe(200);
  });

  test("DELETE /api/notifications/:id returns 404 for non-existent", async () => {
    const res = await app.request("/api/notifications/non-existent", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
  });

  test("POST /api/notify triggers desktop notification callback", async () => {
    const calls: Array<{ title: string; message: string }> = [];
    const routes = createNotificationRoutes(TEST_FILE, {
      onNotify: (n) => {
        calls.push({ title: n.title, message: n.message });
      },
    });

    await routes.app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Hello", message: "World" }),
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].title).toBe("Hello");
  });
});
