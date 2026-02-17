# Notification System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Claude Code Hooks から作業完了通知を送信し、Web ダッシュボードで一覧管理 + ブラウザデスクトップ通知で受信するシンプルな通知システムを構築する。

**Architecture:** Hono + `@hono/node-server` でローカル HTTP サーバーを起動し、通知を JSON ファイルに永続化。React SPA が SSE でリアルタイム受信し、ブラウザ Notification API でデスクトップ通知を表示。Claude Code Hooks からは curl で POST 送信。

**Tech Stack:** Hono, React 19, Tailwind CSS 4, shadcn/ui, SSE, Zod, Bun, JSON file persistence

---

## Task 1: プロジェクトセットアップ

**Files:**
- Modify: `.gitignore`
- Modify: `apps/backend/package.json`
- Create: `data/.gitkeep`

**Step 1: backend に zod 依存を追加**

Run: `cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools && bun add zod --cwd apps/backend`

**Step 2: .gitignore に data ディレクトリを追加**

`.gitignore` の末尾に追加:

```
# ============================================
# Application Data
# ============================================
data/*.json
```

**Step 3: data ディレクトリとディレクトリ構造を作成**

```bash
mkdir -p data
touch data/.gitkeep
mkdir -p apps/backend/src/routes
mkdir -p apps/backend/src/store
mkdir -p apps/frontend/src/hooks
mkdir -p scripts
```

**Step 4: コミット**

```bash
git add .gitignore data/.gitkeep apps/backend/package.json bun.lock
git commit -m "chore: add zod dependency and data directory setup"
```

---

## Task 2: 共有型定義 - Notification

**Files:**
- Create: `packages/types/src/notification.ts`
- Modify: `packages/types/src/index.ts`

**Step 1: 通知型定義を作成**

`packages/types/src/notification.ts`:

```typescript
export interface Notification {
  id: string;
  title: string;
  message: string;
  category: string;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  category?: string;
  metadata?: Record<string, unknown>;
}
```

**Step 2: index.ts からエクスポート**

`packages/types/src/index.ts` に追加:

```typescript
export type { CreateNotificationPayload, Notification } from "./notification";
```

**Step 3: コミット**

```bash
git add packages/types/src/notification.ts packages/types/src/index.ts
git commit -m "feat: add notification type definitions"
```

---

## Task 3: NotificationStore - JSON ファイル永続化

**Files:**
- Create: `apps/backend/src/store/notification-store.test.ts`
- Create: `apps/backend/src/store/notification-store.ts`

**Step 1: テストを書く**

`apps/backend/src/store/notification-store.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { NotificationStore } from "./notification-store";

const TEST_DIR = "data/test";
const TEST_FILE = `${TEST_DIR}/notifications-test.json`;

describe("NotificationStore", () => {
  let store: NotificationStore;

  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    store = new NotificationStore(TEST_FILE);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  test("add creates a notification with generated id and timestamp", () => {
    const notification = store.add({
      title: "Test",
      message: "Hello",
    });

    expect(notification.id).toBeDefined();
    expect(notification.title).toBe("Test");
    expect(notification.message).toBe("Hello");
    expect(notification.category).toBe("info");
    expect(notification.metadata).toEqual({});
    expect(notification.read).toBe(false);
    expect(notification.createdAt).toBeDefined();
  });

  test("getAll returns all notifications sorted by createdAt desc", () => {
    store.add({ title: "First", message: "1" });
    store.add({ title: "Second", message: "2" });

    const all = store.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.title).toBe("Second");
    expect(all[1]!.title).toBe("First");
  });

  test("markAsRead sets read to true", () => {
    const notification = store.add({ title: "Test", message: "msg" });

    const updated = store.markAsRead(notification.id);
    expect(updated?.read).toBe(true);
  });

  test("markAsRead returns null for non-existent id", () => {
    const result = store.markAsRead("non-existent");
    expect(result).toBeNull();
  });

  test("remove deletes a notification", () => {
    const notification = store.add({ title: "Test", message: "msg" });

    const removed = store.remove(notification.id);
    expect(removed).toBe(true);
    expect(store.getAll()).toHaveLength(0);
  });

  test("remove returns false for non-existent id", () => {
    const result = store.remove("non-existent");
    expect(result).toBe(false);
  });

  test("persists data to JSON file", () => {
    store.add({ title: "Persisted", message: "data" });

    const store2 = new NotificationStore(TEST_FILE);
    const all = store2.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.title).toBe("Persisted");
  });

  test("handles missing file gracefully", () => {
    const store = new NotificationStore(`${TEST_DIR}/non-existent.json`);
    expect(store.getAll()).toEqual([]);
  });

  test("add with custom category and metadata", () => {
    const notification = store.add({
      title: "Custom",
      message: "msg",
      category: "task_complete",
      metadata: { project: "my-project" },
    });

    expect(notification.category).toBe("task_complete");
    expect(notification.metadata).toEqual({ project: "my-project" });
  });
});
```

**Step 2: テストが失敗することを確認**

Run: `cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/backend && bun test src/store/notification-store.test.ts`

Expected: FAIL (モジュール未定義)

**Step 3: NotificationStore を実装**

`apps/backend/src/store/notification-store.ts`:

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type {
  CreateNotificationPayload,
  Notification,
} from "@repo/types/notification";

export class NotificationStore {
  private notifications: Notification[] = [];
  private readonly filePath: string;
  private writing = false;
  private pendingWrite = false;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  add(payload: CreateNotificationPayload): Notification {
    const notification: Notification = {
      id: crypto.randomUUID(),
      title: payload.title,
      message: payload.message,
      category: payload.category ?? "info",
      metadata: payload.metadata ?? {},
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notification);
    this.save();
    return notification;
  }

  getAll(): Notification[] {
    return [...this.notifications].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  markAsRead(id: string): Notification | null {
    const notification = this.notifications.find((n) => n.id === id);
    if (!notification) return null;
    notification.read = true;
    this.save();
    return notification;
  }

  remove(id: string): boolean {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index === -1) return false;
    this.notifications.splice(index, 1);
    this.save();
    return true;
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        const data = readFileSync(this.filePath, "utf-8");
        this.notifications = JSON.parse(data);
      }
    } catch {
      this.notifications = [];
    }
  }

  private save(): void {
    if (this.writing) {
      this.pendingWrite = true;
      return;
    }
    this.writing = true;
    try {
      const dir = dirname(this.filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.filePath, JSON.stringify(this.notifications, null, 2));
    } finally {
      this.writing = false;
      if (this.pendingWrite) {
        this.pendingWrite = false;
        this.save();
      }
    }
  }
}
```

**Step 4: テストが通ることを確認**

Run: `cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/backend && bun test src/store/notification-store.test.ts`

Expected: ALL PASS

**Step 5: コミット**

```bash
git add apps/backend/src/store/
git commit -m "feat: add NotificationStore with JSON file persistence"
```

---

## Task 4: 通知 API ルート

**Files:**
- Create: `apps/backend/src/routes/notifications.test.ts`
- Create: `apps/backend/src/routes/notifications.ts`

**Step 1: テストを書く**

`apps/backend/src/routes/notifications.test.ts`:

```typescript
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

    const res = await app.request(
      `/api/notifications/${created.id}/read`,
      { method: "PATCH" },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.read).toBe(true);
  });

  test("PATCH /api/notifications/:id/read returns 404 for non-existent", async () => {
    const res = await app.request(
      "/api/notifications/non-existent/read",
      { method: "PATCH" },
    );
    expect(res.status).toBe(404);
  });

  test("DELETE /api/notifications/:id removes notification", async () => {
    const createRes = await app.request("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test", message: "msg" }),
    });
    const created = await createRes.json();

    const res = await app.request(
      `/api/notifications/${created.id}`,
      { method: "DELETE" },
    );
    expect(res.status).toBe(200);
  });

  test("DELETE /api/notifications/:id returns 404 for non-existent", async () => {
    const res = await app.request(
      "/api/notifications/non-existent",
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
  });
});
```

**Step 2: テストが失敗することを確認**

Run: `cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/backend && bun test src/routes/notifications.test.ts`

Expected: FAIL

**Step 3: 通知ルートを実装**

`apps/backend/src/routes/notifications.ts`:

```typescript
import { Hono } from "hono";
import { z } from "zod";
import { NotificationStore } from "../store/notification-store";

const createNotificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  category: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type NotificationListener = (
  event: "created" | "read" | "deleted",
  data: unknown,
) => void;

export function createNotificationRoutes(filePath?: string) {
  const store = new NotificationStore(filePath ?? "data/notifications.json");
  const listeners = new Set<NotificationListener>();

  const app = new Hono()
    .post("/api/notify", async (c) => {
      const body = await c.req.json();
      const result = createNotificationSchema.safeParse(body);
      if (!result.success) {
        return c.json({ error: result.error.flatten() }, 400);
      }
      const notification = store.add(result.data);
      for (const listener of listeners) {
        listener("created", notification);
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
```

**Step 4: テストが通ることを確認**

Run: `cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/backend && bun test src/routes/notifications.test.ts`

Expected: ALL PASS

**Step 5: コミット**

```bash
git add apps/backend/src/routes/
git commit -m "feat: add notification CRUD API routes with Zod validation"
```

---

## Task 5: SSE エンドポイント

**Files:**
- Create: `apps/backend/src/routes/events.ts`

**Step 1: SSE ルートを実装**

`apps/backend/src/routes/events.ts`:

```typescript
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import type { NotificationListener } from "./notifications";

export function createEventsRoute(
  subscribe: (listener: NotificationListener) => () => void,
) {
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
```

**Step 2: コミット**

```bash
git add apps/backend/src/routes/events.ts
git commit -m "feat: add SSE endpoint for real-time notification push"
```

---

## Task 6: バックエンドエントリポイント

**Files:**
- Modify: `apps/backend/src/index.ts`
- Modify: `apps/backend/package.json`

**Step 1: index.ts をローカルサーバー用に書き換え**

`apps/backend/src/index.ts`:

```typescript
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
```

**Step 2: package.json の dev スクリプトを更新**

`apps/backend/package.json` の `scripts` を変更:

```json
{
  "scripts": {
    "dev": "bun run --watch src/index.ts",
    "start": "bun run src/index.ts"
  }
}
```

**Step 3: 動作確認**

```bash
cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools
bun run dev:backend &
sleep 2
curl -s http://localhost:3000/api/health | head -1
curl -s -X POST http://localhost:3000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello"}' | head -1
curl -s http://localhost:3000/api/notifications | head -1
# サーバーを停止
kill %1
```

Expected: 各レスポンスに JSON が返る

**Step 4: コミット**

```bash
git add apps/backend/src/index.ts apps/backend/package.json
git commit -m "feat: configure backend as local Bun server with notification routes"
```

---

## Task 7: フロントエンド Hooks

**Files:**
- Create: `apps/frontend/src/hooks/use-sse.ts`
- Create: `apps/frontend/src/hooks/use-notifications.ts`
- Modify: `apps/frontend/src/lib/api-client.ts`

**Step 1: API クライアントを更新**

`apps/frontend/src/lib/api-client.ts`:

```typescript
import type { AppType } from "@repo/backend";
import { hc } from "hono/client";

export const apiClient = hc<AppType>(
  import.meta.env.VITE_API_URL || "http://localhost:3000",
);
```

**Step 2: SSE フックを作成**

`apps/frontend/src/hooks/use-sse.ts`:

```typescript
import { useEffect, useRef, useState } from "react";

interface SSEOptions {
  url: string;
  onMessage?: (event: string, data: string) => void;
}

export function useSSE({ url, onMessage }: SSEOptions) {
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    const eventSource = new EventSource(url);

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    const handleEvent = (type: string) => (event: MessageEvent) => {
      onMessageRef.current?.(type, event.data);
    };

    eventSource.addEventListener("created", handleEvent("created"));
    eventSource.addEventListener("read", handleEvent("read"));
    eventSource.addEventListener("deleted", handleEvent("deleted"));

    return () => {
      eventSource.close();
      setConnected(false);
    };
  }, [url]);

  return { connected };
}
```

**Step 3: 通知管理フックを作成**

`apps/frontend/src/hooks/use-notifications.ts`:

```typescript
import type { Notification } from "@repo/types/notification";
import { useCallback, useEffect, useState } from "react";
import { useSSE } from "./use-sse";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const data = await res.json();
      setNotifications(data.notifications);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const { connected } = useSSE({
    url: `${API_BASE}/api/events`,
    onMessage: (event, data) => {
      if (event === "created") {
        const notification: Notification = JSON.parse(data);
        setNotifications((prev) => [notification, ...prev]);
        showDesktopNotification(notification);
      } else if (event === "read") {
        const notification: Notification = JSON.parse(data);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? notification : n)),
        );
      } else if (event === "deleted") {
        const { id } = JSON.parse(data);
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    },
  });

  const markAsRead = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/notifications/${id}/read`, {
      method: "PATCH",
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/notifications/${id}`, {
      method: "DELETE",
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, loading, connected, markAsRead, remove };
}

function showDesktopNotification(notification: Notification) {
  if (Notification.permission === "granted") {
    new Notification(notification.title, {
      body: notification.message,
      tag: notification.id,
    });
  }
}
```

**Step 4: コミット**

```bash
git add apps/frontend/src/hooks/ apps/frontend/src/lib/api-client.ts
git commit -m "feat: add SSE and notification hooks for frontend"
```

---

## Task 8: フロントエンドコンポーネント - ダッシュボード UI

**Files:**
- Create: `apps/frontend/src/components/app/notification-card.tsx`
- Create: `apps/frontend/src/components/app/notification-list.tsx`
- Create: `apps/frontend/src/components/app/notification-badge.tsx`
- Modify: `apps/frontend/src/components/app/app.tsx`
- Modify: `apps/frontend/src/components/app/header.tsx`

**Step 1: shadcn/ui コンポーネントの追加(必要に応じて)**

既に card, badge, button, alert が存在するのでそのまま使う。scroll-area を追加:

```bash
cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/frontend && bunx shadcn add scroll-area
```

**Step 2: NotificationCard コンポーネント**

`apps/frontend/src/components/app/notification-card.tsx`:

```tsx
import type { Notification } from "@repo/types/notification";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationCard({
  notification,
  onMarkAsRead,
  onRemove,
}: NotificationCardProps) {
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <Card
      className={`p-4 ${notification.read ? "opacity-60" : "border-l-4 border-l-primary"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm truncate">
              {notification.title}
            </h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {notification.category}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          {Object.keys(notification.metadata).length > 0 && (
            <pre className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(notification.metadata, null, 2)}
            </pre>
          )}
          <p className="text-xs text-muted-foreground mt-2">{timeAgo}</p>
        </div>
        <div className="flex gap-1 shrink-0">
          {!notification.read && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMarkAsRead(notification.id)}
            >
              Mark read
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(notification.id)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

**Step 3: NotificationList コンポーネント**

`apps/frontend/src/components/app/notification-list.tsx`:

```tsx
import type { Notification } from "@repo/types/notification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationCard } from "./notification-card";

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
}

export function NotificationList({
  notifications,
  onMarkAsRead,
  onRemove,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground">
        No notifications yet
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-2 pr-4">
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onRemove={onRemove}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
```

**Step 4: NotificationBadge コンポーネント**

`apps/frontend/src/components/app/notification-badge.tsx`:

```tsx
interface NotificationBadgeProps {
  count: number;
  connected: boolean;
}

export function NotificationBadge({
  count,
  connected,
}: NotificationBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <div
          className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`}
        />
        <span className="text-xs text-muted-foreground">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      {count > 0 && (
        <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  );
}
```

**Step 5: App コンポーネントを書き換え**

`apps/frontend/src/components/app/app.tsx`:

```tsx
import { useEffect } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationBadge } from "./notification-badge";
import { NotificationList } from "./notification-list";

export function App() {
  const { notifications, unreadCount, loading, connected, markAsRead, remove } =
    useNotifications();

  useEffect(() => {
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold">Notifications</h1>
          <NotificationBadge count={unreadCount} connected={connected} />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            Loading...
          </div>
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkAsRead={markAsRead}
            onRemove={remove}
          />
        )}
      </main>
    </div>
  );
}
```

**Step 6: 不要なテンプレートコンポーネントを削除**

以下のファイルを削除:
- `apps/frontend/src/components/app/header.tsx`
- `apps/frontend/src/components/app/hero-section.tsx`
- `apps/frontend/src/components/app/features-section.tsx`
- `apps/frontend/src/components/app/demo-section.tsx`
- `apps/frontend/src/components/app/footer.tsx`
- `apps/frontend/src/components/app/hello-world.tsx`
- `apps/frontend/src/components/app/hono-rpc-demo.tsx`
- `apps/frontend/src/components/app/api-config-demo.tsx`
- `apps/frontend/src/components/app/api-config-demo.stories.tsx`

**Step 7: コミット**

```bash
git add apps/frontend/src/components/ apps/frontend/src/hooks/
git commit -m "feat: add notification dashboard UI with real-time updates"
```

---

## Task 9: クライアント送信スクリプト

**Files:**
- Create: `scripts/notify.sh`

**Step 1: スクリプトを作成**

`scripts/notify.sh`:

```bash
#!/bin/bash
# notify.sh - Send notifications to the notification server
# Usage: ./scripts/notify.sh "Title" "Message" [category] [metadata_json]
#
# Examples:
#   ./scripts/notify.sh "Task Complete" "Build finished"
#   ./scripts/notify.sh "Error" "Test failed" "error"
#   ./scripts/notify.sh "Deploy" "Deployed to prod" "deploy" '{"env":"prod"}'
#
# Environment variables:
#   NOTIFY_HOST  - Server host (default: localhost)
#   NOTIFY_PORT  - Server port (default: 3000)

set -euo pipefail

NOTIFY_HOST="${NOTIFY_HOST:-localhost}"
NOTIFY_PORT="${NOTIFY_PORT:-3000}"
NOTIFY_URL="http://${NOTIFY_HOST}:${NOTIFY_PORT}/api/notify"

TITLE="${1:-Notification}"
MESSAGE="${2:-}"
CATEGORY="${3:-info}"
METADATA="${4:-{}}"

curl -sf -X POST "${NOTIFY_URL}" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"${TITLE}\",
    \"message\": \"${MESSAGE}\",
    \"category\": \"${CATEGORY}\",
    \"metadata\": ${METADATA}
  }" || echo "Failed to send notification (server may be down)" >&2
```

**Step 2: 実行権限を付与**

```bash
chmod +x scripts/notify.sh
```

**Step 3: コミット**

```bash
git add scripts/notify.sh
git commit -m "feat: add notification client script for Claude Code Hooks"
```

---

## Task 10: 統合テスト & 最終調整

**Files:**
- Modify: `apps/frontend/index.html`
- Modify: `README.md`
- Modify: `apps/frontend/e2e/example.spec.ts`

**Step 1: index.html のタイトルを更新**

`apps/frontend/index.html` の `<title>` を `Notifications` に変更。

**Step 2: E2E テストを更新**

`apps/frontend/e2e/example.spec.ts`:

```typescript
import { expect, test } from "@playwright/test";

test("notification dashboard loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Notifications");
});
```

**Step 3: 全テスト実行**

```bash
# Backend unit tests
cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools/apps/backend && bun test

# Lint
cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools && bun run lint
```

**Step 4: README を更新**

`README.md` に使い方セクションを追加:

```markdown
# Simple Notify Tools

Claude Code Hooks 向けシンプル通知システム。

## Quick Start

# サーバー起動
bun run dev:backend

# フロントエンド起動(別ターミナル)
bun run dev

# 通知送信
./scripts/notify.sh "Task Complete" "Build finished successfully"

## Claude Code Hooks 設定例

.claude/hooks.json に以下を追加:

{
  "postToolUse": [
    {
      "command": "/path/to/scripts/notify.sh \"Task Complete\" \"$TOOL_NAME finished\""
    }
  ]
}
```

**Step 5: コミット**

```bash
git add .
git commit -m "feat: finalize notification system with docs and e2e test"
```

---

## Summary

| Task | 内容 | 推定ステップ |
|------|------|------------|
| 1 | プロジェクトセットアップ | 4 |
| 2 | 共有型定義 | 3 |
| 3 | NotificationStore (TDD) | 5 |
| 4 | 通知 API ルート (TDD) | 5 |
| 5 | SSE エンドポイント | 2 |
| 6 | バックエンドエントリポイント | 4 |
| 7 | フロントエンド Hooks | 4 |
| 8 | ダッシュボード UI | 7 |
| 9 | クライアントスクリプト | 3 |
| 10 | 統合テスト & 最終調整 | 5 |
