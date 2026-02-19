import { describe, expect, test } from "bun:test";
import { checkNotifier, sendDesktopNotification } from "./desktop-notify";

describe("checkNotifier", () => {
  test("returns boolean based on platform", async () => {
    const result = await checkNotifier();
    expect(typeof result).toBe("boolean");
  });
});

describe("sendDesktopNotification", () => {
  test("calls spawn with osascript args for basic notification", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Test", message: "Hello" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0][0]).toBe("osascript");
    expect(spawnCalls[0][1]).toBe("-e");
    expect(spawnCalls[0][2]).toContain("Test");
    expect(spawnCalls[0][2]).toContain("Hello");
  });

  test("spawns execute command separately when provided", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Done", message: "Build complete", execute: "code-insiders /path/to/project" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls).toHaveLength(2);
    // First call: osascript notification
    expect(spawnCalls[0][0]).toBe("osascript");
    // Second call: execute command
    expect(spawnCalls[1]).toEqual(["code-insiders", "/path/to/project"]);
  });

  test("includes group as subtitle when provided", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Test", message: "msg", group: "task_complete" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls[0][2]).toContain("task_complete");
  });

  test("does nothing when notifier is unavailable", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Test", message: "msg" },
      { spawn: mockSpawn, available: false },
    );

    expect(spawnCalls).toHaveLength(0);
  });
});
