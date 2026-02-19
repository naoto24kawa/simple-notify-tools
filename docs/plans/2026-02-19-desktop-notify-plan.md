# Desktop Notification (terminal-notifier) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Backend が通知受信時に macOS の `terminal-notifier` でデスクトップ通知を表示し、クリックで VS Code (Insiders) をフォーカスする。

**Architecture:** `notifications.ts` の POST ハンドラから新規ユーティリティ `desktop-notify.ts` を fire-and-forget で呼ぶ。`terminal-notifier` 未インストール時はグレースフルデグレード。

**Tech Stack:** Bun (spawn), terminal-notifier (brew), bun:test

---

### Task 1: desktop-notify ユーティリティ - テスト作成

**Files:**
- Create: `apps/backend/src/lib/desktop-notify.test.ts`

**Step 1: テストファイルを作成**

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { sendDesktopNotification, checkTerminalNotifier } from "./desktop-notify";

describe("checkTerminalNotifier", () => {
  test("returns true when terminal-notifier exists", async () => {
    const result = await checkTerminalNotifier();
    // CI/macOS環境依存のためスキップ可能
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
      { spawn: mockSpawn },
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
      { spawn: mockSpawn },
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
      { spawn: mockSpawn },
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
```

**Step 2: テストを実行して失敗を確認**

Run: `cd apps/backend && bun test src/lib/desktop-notify.test.ts`
Expected: FAIL (モジュールが存在しない)

---

### Task 2: desktop-notify ユーティリティ - 実装

**Files:**
- Create: `apps/backend/src/lib/desktop-notify.ts`

**Step 1: 実装を作成**

```ts
type SpawnFn = (args: string[]) => void;

interface DesktopNotifyOptions {
  title: string;
  message: string;
  group?: string;
  execute?: string;
}

interface DesktopNotifyDeps {
  spawn?: SpawnFn;
  available?: boolean;
}

const defaultSpawn: SpawnFn = (args) => {
  Bun.spawn(["terminal-notifier", ...args], {
    stdio: ["ignore", "ignore", "ignore"],
  });
};

let cachedAvailable: boolean | null = null;

export async function checkTerminalNotifier(): Promise<boolean> {
  if (cachedAvailable !== null) return cachedAvailable;
  try {
    const proc = Bun.spawn(["which", "terminal-notifier"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    const code = await proc.exited;
    cachedAvailable = code === 0;
  } catch {
    cachedAvailable = false;
  }
  if (!cachedAvailable) {
    console.warn("[desktop-notify] terminal-notifier not found. Desktop notifications disabled.");
  }
  return cachedAvailable;
}

export async function sendDesktopNotification(
  opts: DesktopNotifyOptions,
  deps: DesktopNotifyDeps = {},
): Promise<void> {
  const spawn = deps.spawn ?? defaultSpawn;
  const available = deps.available ?? (await checkTerminalNotifier());

  if (!available) return;

  const args: string[] = ["-title", opts.title, "-message", opts.message];

  if (opts.group) {
    args.push("-group", opts.group);
  }

  if (opts.execute) {
    args.push("-execute", opts.execute);
  }

  try {
    spawn(args);
  } catch (err) {
    console.warn("[desktop-notify] Failed to send notification:", err);
  }
}
```

**Step 2: テストを実行して通過を確認**

Run: `cd apps/backend && bun test src/lib/desktop-notify.test.ts`
Expected: PASS (全テスト通過)

**Step 3: コミット**

```bash
git add apps/backend/src/lib/desktop-notify.ts apps/backend/src/lib/desktop-notify.test.ts
git commit -m "feat: add desktop-notify utility with terminal-notifier"
```

---

### Task 3: notifications ルートに desktop-notify を統合

**Files:**
- Modify: `apps/backend/src/routes/notifications.ts:19-34`

**Step 1: notifications.test.ts にテスト追加**

`apps/backend/src/routes/notifications.test.ts` の既存テストの後に追加:

```ts
test("POST /api/notify triggers desktop notification callback", async () => {
  const calls: Array<{ title: string; message: string }> = [];
  const routes = createNotificationRoutes(TEST_FILE, {
    onNotify: (n) => { calls.push({ title: n.title, message: n.message }); },
  });

  await routes.app.request("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Hello", message: "World" }),
  });

  expect(calls).toHaveLength(1);
  expect(calls[0].title).toBe("Hello");
});
```

**Step 2: テストを実行して失敗を確認**

Run: `cd apps/backend && bun test src/routes/notifications.test.ts`
Expected: FAIL (createNotificationRoutes の第2引数が未対応)

**Step 3: notifications.ts を修正**

`createNotificationRoutes` に `onNotify` コールバックオプションを追加:

```ts
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
  onNotify?: (notification: { title: string; message: string; category: string; metadata: Record<string, unknown> }) => void;
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
```

**Step 4: テストを実行して通過を確認**

Run: `cd apps/backend && bun test src/routes/notifications.test.ts`
Expected: PASS (全テスト通過)

**Step 5: コミット**

```bash
git add apps/backend/src/routes/notifications.ts apps/backend/src/routes/notifications.test.ts
git commit -m "feat: add onNotify callback to notification routes"
```

---

### Task 4: index.ts で desktop-notify を接続

**Files:**
- Modify: `apps/backend/src/index.ts:24`

**Step 1: index.ts を修正**

```ts
import { sendDesktopNotification } from "./lib/desktop-notify";
```

を追加し、`createNotificationRoutes()` の呼び出しを変更:

```ts
const CODE_CMD = process.env.CODE_CMD || "code-insiders";

const { app: notificationApp, subscribe } = createNotificationRoutes(undefined, {
  onNotify: (n) => {
    const project = typeof n.metadata.project === "string" ? n.metadata.project : undefined;
    sendDesktopNotification({
      title: n.title,
      message: n.message,
      group: n.category,
      execute: project ? `${CODE_CMD} ${project}` : undefined,
    });
  },
});
```

**Step 2: 全テストを実行して既存が壊れていないことを確認**

Run: `cd apps/backend && bun test`
Expected: PASS (全テスト通過)

**Step 3: コミット**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: wire desktop notification into notification pipeline"
```

---

### Task 5: 手動検証と lint

**Step 1: lint を実行**

Run: `bun run lint`
Expected: PASS

**Step 2: 全テストを実行**

Run: `cd apps/backend && bun test`
Expected: PASS

**Step 3: 手動検証 (macOS 上で実行時)**

```bash
# Backend 起動
bun run dev:backend

# 別ターミナルから通知送信
./scripts/notify.sh "Test" "Desktop notification works!" "info" '{"project":"/path/to/project"}'
```

Expected: macOS デスクトップ通知が表示され、クリックで code-insiders が起動

**Step 4: コミット (lint fix があれば)**

```bash
git add -A
git commit -m "chore: lint fixes"
```
