import { describe, expect, test } from "bun:test";
import { createFocusWindowRoute } from "./focus-window";

const noopSpawn = () => {};

describe("Focus Window Route", () => {
  const { app } = createFocusWindowRoute(noopSpawn);

  test("POST /api/focus-window returns 400 for invalid JSON body", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid JSON");
  });

  test("POST /api/focus-window returns 400 when projectDir is missing", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("POST /api/focus-window returns 400 for dangerous path characters", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir: "/tmp; rm -rf /" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("POST /api/focus-window returns 404 for non-existent directory", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir: "/nonexistent/path/12345" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Directory not found");
  });

  test("POST /api/focus-window returns 200 for valid existing directory", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir: "/tmp" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
