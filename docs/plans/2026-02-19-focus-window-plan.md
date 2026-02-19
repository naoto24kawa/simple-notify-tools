# Focus Window Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clicking a notification card focuses the VS Code window that sent the notification.

**Architecture:** Frontend calls `POST /api/focus-window` with the project path from notification metadata. Backend validates the path and runs `code <path>` via `Bun.spawn` to focus VS Code.

**Tech Stack:** Hono (backend route), Bun.spawn (process execution), React (click handler)

---

### Task 1: Backend - Focus Window Route

**Files:**
- Create: `apps/backend/src/routes/focus-window.ts`
- Test: `apps/backend/src/routes/focus-window.test.ts`

**Step 1: Write the failing test**

Create `apps/backend/src/routes/focus-window.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { createFocusWindowRoute } from "./focus-window";

describe("Focus Window Route", () => {
  const { app } = createFocusWindowRoute();

  test("POST /api/focus-window returns 400 when projectDir is missing", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/focus-window returns 400 for dangerous path characters", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir: "/tmp; rm -rf /" }),
    });
    expect(res.status).toBe(400);
  });

  test("POST /api/focus-window returns 404 for non-existent directory", async () => {
    const res = await app.request("/api/focus-window", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir: "/nonexistent/path/12345" }),
    });
    expect(res.status).toBe(404);
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
```

**Step 2: Run test to verify it fails**

Run: `cd apps/backend && bun test src/routes/focus-window.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `apps/backend/src/routes/focus-window.ts`:

```typescript
import { existsSync } from "node:fs";
import { Hono } from "hono";
import { z } from "zod";

const DANGEROUS_CHARS = /[;&|`$(){}!<>]/;

const focusWindowSchema = z.object({
  projectDir: z
    .string()
    .min(1)
    .refine((v) => !DANGEROUS_CHARS.test(v), "Invalid characters in path"),
});

export function createFocusWindowRoute() {
  const app = new Hono().post("/api/focus-window", async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }

    const result = focusWindowSchema.safeParse(body);
    if (!result.success) {
      return c.json({ error: result.error.flatten() }, 400);
    }

    const { projectDir } = result.data;

    if (!existsSync(projectDir)) {
      return c.json({ error: "Directory not found" }, 404);
    }

    try {
      Bun.spawn(["code", projectDir], { stdio: ["ignore", "ignore", "ignore"] });
      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: "Failed to open VS Code" }, 500);
    }
  });

  return { app };
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/backend && bun test src/routes/focus-window.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add apps/backend/src/routes/focus-window.ts apps/backend/src/routes/focus-window.test.ts
git commit -m "feat: add POST /api/focus-window endpoint"
```

---

### Task 2: Backend - Register Route

**Files:**
- Modify: `apps/backend/src/index.ts`

**Step 1: Add import and route registration**

In `apps/backend/src/index.ts`, add after the notification routes block:

```typescript
import { createFocusWindowRoute } from "./routes/focus-window";
```

And after the events route registration:

```typescript
// Focus window route
const { app: focusWindowApp } = createFocusWindowRoute();
app.route("/", focusWindowApp);
```

**Step 2: Run existing tests to verify no regression**

Run: `cd apps/backend && bun test`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add apps/backend/src/index.ts
git commit -m "feat: register focus-window route in backend"
```

---

### Task 3: Frontend - Clickable Notification Card

**Files:**
- Modify: `apps/frontend/src/components/app/notification-card.tsx`

**Step 1: Add click handler and visual feedback**

Update `notification-card.tsx`:

- Add `onFocusWindow` callback prop
- Determine if card is clickable (`metadata.project` exists)
- Make card clickable with hover effect
- Stop propagation on existing buttons

```typescript
interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onFocusWindow?: (projectDir: string) => void;
}

export function NotificationCard({ notification, onMarkAsRead, onRemove, onFocusWindow }: NotificationCardProps) {
  const timeAgo = formatTimeAgo(notification.createdAt);
  const projectDir = typeof notification.metadata.project === "string" ? notification.metadata.project : null;
  const isClickable = !!projectDir && !!onFocusWindow;

  const handleCardClick = () => {
    if (isClickable && projectDir) {
      onFocusWindow(projectDir);
    }
  };

  return (
    <Card
      className={`p-4 ${notification.read ? "opacity-60" : "border-l-4 border-l-primary"} ${isClickable ? "cursor-pointer hover:bg-accent/50 transition-colors" : ""}`}
      onClick={handleCardClick}
    >
      {/* ...existing content, add e.stopPropagation() to buttons */}
    </Card>
  );
}
```

Add `e.stopPropagation()` to both button onClick handlers:

```typescript
onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
onClick={(e) => { e.stopPropagation(); onRemove(notification.id); }}
```

**Step 2: Pass prop through NotificationList**

Update `apps/frontend/src/components/app/notification-list.tsx` to accept and pass `onFocusWindow`:

```typescript
interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onRemove: (id: string) => void;
  onFocusWindow?: (projectDir: string) => void;
}
```

Pass to each `NotificationCard`:

```typescript
<NotificationCard
  key={notification.id}
  notification={notification}
  onMarkAsRead={onMarkAsRead}
  onRemove={onRemove}
  onFocusWindow={onFocusWindow}
/>
```

**Step 3: Add API call and wire up in App**

In `apps/frontend/src/components/app/app.tsx`, add `focusWindow` function and pass it:

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "";

const focusWindow = useCallback(async (projectDir: string) => {
  try {
    await fetch(`${API_BASE}/api/focus-window`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectDir }),
    });
  } catch (err) {
    console.error("Failed to focus window:", err);
  }
}, []);
```

Pass to NotificationList:

```typescript
<NotificationList
  notifications={notifications}
  onMarkAsRead={markAsRead}
  onRemove={remove}
  onFocusWindow={focusWindow}
/>
```

**Step 4: Manual test**

1. Run: `bun run dev:backend`
2. Send a test notification: `./scripts/notify.sh "Test" "msg" "info" '{"project":"/home/naoto24kawa/projects/naoto24kawa/simple-notify-tools"}'`
3. Open `http://localhost:23000` and click the notification card
4. Verify VS Code window focuses

**Step 5: Commit**

```bash
git add apps/frontend/src/components/app/notification-card.tsx apps/frontend/src/components/app/notification-list.tsx apps/frontend/src/components/app/app.tsx
git commit -m "feat: click notification card to focus VS Code window"
```
