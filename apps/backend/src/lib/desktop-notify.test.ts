import { describe, expect, test } from "bun:test";
import { checkTerminalNotifier, sendDesktopNotification } from "./desktop-notify";

describe("checkTerminalNotifier", () => {
  test("returns true when terminal-notifier exists", async () => {
    const result = await checkTerminalNotifier();
    expect(typeof result).toBe("boolean");
  });
});

describe("sendDesktopNotification", () => {
  test("calls spawn with correct args for basic notification", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Test", message: "Hello" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]).toContain("-title");
    expect(spawnCalls[0]).toContain("Test");
    expect(spawnCalls[0]).toContain("-message");
    expect(spawnCalls[0]).toContain("Hello");
  });

  test("includes -execute when project metadata is provided", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Done", message: "Build complete", execute: "code-insiders /path/to/project" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls[0]).toContain("-execute");
    expect(spawnCalls[0]).toContain("code-insiders /path/to/project");
  });

  test("includes -group when provided", async () => {
    const spawnCalls: string[][] = [];
    const mockSpawn = (args: string[]) => {
      spawnCalls.push(args);
    };

    await sendDesktopNotification(
      { title: "Test", message: "msg", group: "task_complete" },
      { spawn: mockSpawn, available: true },
    );

    expect(spawnCalls[0]).toContain("-group");
    expect(spawnCalls[0]).toContain("task_complete");
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
