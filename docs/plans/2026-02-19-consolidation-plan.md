# Monorepo Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** apps/backend + apps/frontend + packages/types を src/ 配下の 1 アプリに統合する

**Architecture:** Hono API サーバー(src/server/) + React SPA(src/client/) + 共有型(src/shared/)。開発時は concurrently で Vite + Bun server を同時起動。本番は Hono が API + 静的ファイルを配信。

**Tech Stack:** Bun, Hono, React 19, Vite 7, Tailwind CSS 4, Playwright, Biome

**Design doc:** `docs/plans/2026-02-19-consolidation-design.md`

---

## Task 1: Create feature branch and verify baseline

**Step 1: Create branch**

```bash
git checkout -b refactor/consolidate-monorepo
```

**Step 2: Verify backend tests pass**

```bash
cd apps/backend && bun test
```

Expected: All tests pass

**Step 3: Verify build works**

```bash
cd /home/naoto24kawa/projects/naoto24kawa/simple-notify-tools
bun run build
```

Expected: Vite build succeeds

**Step 4: Commit baseline**

No changes to commit - just confirming baseline.

---

## Task 2: Create directory scaffolding and consolidated configs

**Files:**
- Create: `src/server/`, `src/client/`, `src/shared/`
- Modify: `package.json` (root)
- Create: `tsconfig.json` (new consolidated)

**Step 1: Create directories**

```bash
mkdir -p src/server/routes src/server/store src/server/lib
mkdir -p src/client/components/app src/client/components/ui src/client/hooks src/client/lib src/client/styles
mkdir -p src/shared
```

**Step 2: Create consolidated package.json**

Merge dependencies from root + apps/backend + apps/frontend into single package.json.
Remove `workspaces` field. Remove `@repo/*` workspace references. Add `concurrently`.

Key changes:
- Remove: `"workspaces": ["apps/*", "packages/*"]`
- Add to dependencies: `hono`, `zod`, `react`, `react-dom`, radix-ui packages, `clsx`, `tailwind-merge`, `class-variance-authority`
- Add to devDependencies: `concurrently`
- Update scripts:

```json
{
  "scripts": {
    "dev": "concurrently -k -n api,vite -c blue,green \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "bun --watch src/server/index.ts",
    "dev:client": "vite",
    "start": "bun src/server/index.ts",
    "build": "vite build",
    "lint": "biome check .",
    "lint:fix": "biome check --write . --unsafe",
    "format": "biome format --write .",
    "test": "bun test",
    "test:e2e": "playwright test",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "validate": "bun run lint && bun run test && bun run build",
    "pre-commit": "lefthook run pre-commit",
    "pre-push": "lefthook run pre-push",
    "prepare": "lefthook install"
  }
}
```

**Step 3: Create consolidated tsconfig.json**

Based on `tsconfig.base.json`, add path aliases:

```json
{
  "compilerOptions": {
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "target": "ESNext",
    "module": "ESNext",
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "allowJs": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noPropertyAccessFromIndexSignature": false,
    "exactOptionalPropertyTypes": false,
    "types": ["bun-types", "@types/node"],
    "paths": {
      "@/*": ["./src/client/*"],
      "@server/*": ["./src/server/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "e2e/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Path aliases rationale:
- `@/*` → `src/client/*` : Keeps all existing client imports (`@/hooks/...`, `@/components/...`) unchanged
- `@server/*` → `src/server/*` : For AppType type-only import from client
- `@shared/*` → `src/shared/*` : For shared types

**Step 4: Install concurrently**

```bash
bun add -d concurrently
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold consolidated directory structure and configs"
```

---

## Task 3: Move shared types

**Files:**
- Read: `packages/types/src/notification.ts`
- Create: `src/shared/types.ts`

**Step 1: Create src/shared/types.ts**

Only `Notification` and `CreateNotificationPayload` are actually used. `api.ts` (ApiResponse, ApiError, Post) and `env.ts` (Cloudflare Env) are template leftovers - drop them.

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

**Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add consolidated shared types"
```

---

## Task 4: Move server files and fix imports

**Files:**
- Move: `apps/backend/src/routes/*.ts` → `src/server/routes/`
- Move: `apps/backend/src/store/*.ts` → `src/server/store/`
- Move: `apps/backend/src/lib/*.ts` → `src/server/lib/`
- Create: `src/server/index.ts` (rewrite from apps/backend/src/index.ts)

**Step 1: Copy server source files**

```bash
cp apps/backend/src/routes/* src/server/routes/
cp apps/backend/src/store/* src/server/store/
cp apps/backend/src/lib/* src/server/lib/
```

**Step 2: Fix import in notification-store.ts**

Change:
```typescript
import type { CreateNotificationPayload, Notification } from "@repo/types/notification";
```
To:
```typescript
import type { CreateNotificationPayload, Notification } from "@shared/types";
```

Other server files use only relative imports - no changes needed.

**Step 3: Create src/server/index.ts**

Adapted from `apps/backend/src/index.ts`. Key changes:
- `frontendDist` path: `join(import.meta.dir, "../../dist")` (relative to src/server/)
- Everything else stays the same

```typescript
import { hostname } from "node:os";
import { join } from "node:path";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { createEventsRoute } from "./routes/events";
import { createFocusWindowRoute } from "./routes/focus-window";
import { createNotificationRoutes } from "./routes/notifications";

const app = new Hono();

app.use("/*", cors());

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    hostname: hostname(),
    timestamp: new Date().toISOString(),
  });
});

const { app: notificationApp, subscribe } = createNotificationRoutes();
app.route("/", notificationApp);

const eventsApp = createEventsRoute(subscribe);
app.route("/", eventsApp);

const { app: focusWindowApp } = createFocusWindowRoute();
app.route("/", focusWindowApp);

// Serve frontend static files
const frontendDist = join(import.meta.dir, "../../dist");

app.use("/assets/*", serveStatic({ root: frontendDist }));
app.use("/favicon*", serveStatic({ root: frontendDist }));

// SPA fallback
app.get("*", async (c) => {
  const file = Bun.file(join(frontendDist, "index.html"));
  if (await file.exists()) {
    return c.html(await file.text());
  }
  return c.text("Frontend not built. Run: bun run build", 503);
});

export type AppType = typeof app;

const port = Number(process.env.PORT) || 23000;

console.log(`Starting server on port ${port}...`);

export default {
  port,
  fetch: app.fetch,
};
```

**Step 4: Commit**

```bash
git add src/server/
git commit -m "feat: move server files to src/server/"
```

---

## Task 5: Verify server tests pass

**Step 1: Run server tests from new location**

```bash
bun test src/server/
```

Expected: All tests pass. The tests use relative imports internally, so they should work from the new location.

**Step 2: If tests fail, debug and fix**

Most likely issue: import paths or missing tsconfig resolution. Fix and re-run.

---

## Task 6: Move client files

**Files:**
- Move: `apps/frontend/src/client/index.tsx` → `src/client/index.tsx`
- Move: `apps/frontend/src/components/` → `src/client/components/`
- Move: `apps/frontend/src/hooks/` → `src/client/hooks/`
- Move: `apps/frontend/src/lib/` → `src/client/lib/`
- Move: `apps/frontend/src/styles/` → `src/client/styles/`

**Step 1: Copy client source files**

```bash
cp apps/frontend/src/client/index.tsx src/client/index.tsx
cp -r apps/frontend/src/components/* src/client/components/
cp -r apps/frontend/src/hooks/* src/client/hooks/
cp -r apps/frontend/src/lib/* src/client/lib/
cp -r apps/frontend/src/styles/* src/client/styles/
```

**Step 2: Fix cross-boundary imports**

Files that import from `@repo/types/notification` (change to `@shared/types`):
- `src/client/components/app/notification-card.tsx` line 1
- `src/client/components/app/notification-list.tsx` line 1
- `src/client/hooks/use-notifications.ts` line 1

File that imports from `@repo/backend` (change to `@server/index`):
- `src/client/lib/api-client.ts` line 1

All `@/` internal imports (e.g. `@/hooks/use-notifications`) stay unchanged because tsconfig maps `@/*` → `src/client/*`.

**Step 3: Commit**

```bash
git add src/client/
git commit -m "feat: move client files to src/client/"
```

---

## Task 7: Move config and static files to root

**Files:**
- Move: `apps/frontend/index.html` → `./index.html`
- Move: `apps/frontend/public/` → `./public/`
- Move: `apps/frontend/e2e/` → `./e2e/`
- Move: `apps/frontend/.storybook/` → `./.storybook/`

**Step 1: Copy files**

```bash
cp apps/frontend/index.html ./index.html
cp -r apps/frontend/public/* ./public/ 2>/dev/null || true
mkdir -p public && cp apps/frontend/public/favicon.svg public/
cp -r apps/frontend/e2e ./e2e
cp -r apps/frontend/.storybook ./.storybook
```

**Step 2: Update index.html script src**

The `<script>` tag in index.html references `src/client/index.tsx`. Check current value and update if needed. It should point to `/src/client/index.tsx` (Vite resolves this).

**Step 3: Commit**

```bash
git add index.html public/ e2e/ .storybook/
git commit -m "chore: move config and static files to root"
```

---

## Task 8: Update vite.config.ts

**Files:**
- Create: `./vite.config.ts` (new root-level, replaces apps/frontend/vite.config.ts)

**Step 1: Write new vite.config.ts**

Remove custom `apiProxyPlugin`. Use Vite's built-in proxy. Update paths.

```typescript
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:23000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
  plugins: [
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    viteReact(),
    tailwindcss(),
  ],
});
```

Key changes from old vite.config.ts:
- Removed `apiProxyPlugin()` (custom HTTP proxy) → Vite's built-in `server.proxy`
- `tsConfigPaths` points to root `tsconfig.json`
- Port stays 5173 (matching current config)

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: add simplified root vite.config.ts with built-in proxy"
```

---

## Task 9: Update playwright.config.ts

**Files:**
- Create: `./playwright.config.ts` (root, replaces apps/frontend/playwright.config.ts)

**Step 1: Write new playwright.config.ts**

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

Changes:
- `testDir` stays `./e2e` (now at root)
- `webServer.command` is `bun run dev` (starts both server + vite via concurrently)
- Simplified to chromium only (reduce CI time; add others back if needed)

**Step 2: Commit**

```bash
git add playwright.config.ts
git commit -m "chore: add root playwright.config.ts"
```

---

## Task 10: Verify build and dev server

**Step 1: Install dependencies**

```bash
bun install
```

**Step 2: Verify bun test (server unit tests)**

```bash
bun test
```

Expected: All server tests pass

**Step 3: Verify vite build**

```bash
bun run build
```

Expected: Vite builds successfully, output in `dist/`

**Step 4: Verify dev server**

```bash
bun run dev
```

Expected: Both processes start. Vite on :5173, Hono on :23000. Browser at localhost:5173 shows the notification UI. API calls via /api proxy work.

**Step 5: Verify lint**

```bash
bun run lint
```

Fix any lint issues.

**Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build/lint issues after consolidation"
```

---

## Task 11: Remove old directories and clean up

**Files:**
- Delete: `apps/` (entire directory)
- Delete: `packages/` (entire directory)
- Delete: `tsconfig.base.json`
- Delete: root `wrangler.jsonc` (if exists)
- Modify: `.gitignore` (remove workspace patterns)

**Step 1: Remove old directories**

```bash
rm -rf apps/ packages/ tsconfig.base.json
```

**Step 2: Remove wrangler files**

```bash
rm -f wrangler.jsonc
```

**Step 3: Update .gitignore**

Remove workspace-specific patterns:
```
# Remove these lines:
apps/*/node_modules
apps/*/dist
packages/*/node_modules
packages/*/dist
```

Remove Cloudflare section (not used):
```
# Remove Cloudflare section
```

**Step 4: Verify again**

```bash
bun install
bun test
bun run build
bun run lint
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove old monorepo structure and clean up"
```

---

## Task 12: Update documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

**Step 1: Update CLAUDE.md**

Update quick reference section:

```bash
bun run dev              # API(:23000) + Vite(:5173) 同時起動
bun run start            # 本番サーバー :23000
bun run lint             # Biome チェック
bun run test             # バックエンド単体テスト
bun run test:e2e         # Playwright E2E
bun run validate         # lint + test + build 統合チェック
```

Update project overview to reflect single-app structure.
Remove monorepo-specific constraints.

**Step 2: Update AGENTS.md**

- Remove "monoreポ構造" section
- Update commands section
- Remove workspace dependency references
- Update directory structure to new layout
- Remove Cloudflare references

**Step 3: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs: update documentation for consolidated structure"
```

---

## Task 13: Final validation

**Step 1: Run full validate**

```bash
bun run validate
```

Expected: lint + test + build all pass

**Step 2: Manual smoke test**

```bash
bun run dev
# In another terminal:
./scripts/notify.sh "Test" "Consolidation complete"
# Verify notification appears in browser at localhost:5173
```

**Step 3: Review all changes**

```bash
git log --oneline refactor/consolidate-monorepo ^main
git diff main --stat
```

---

## Summary of import changes

| Old import | New import | Files affected |
|-----------|-----------|----------------|
| `@repo/types/notification` | `@shared/types` | notification-card.tsx, notification-list.tsx, use-notifications.ts, notification-store.ts |
| `@repo/backend` (type) | `@server/index` (type) | api-client.ts |
| `@/hooks/...` | `@/hooks/...` (unchanged) | app.tsx |
| relative server imports | relative (unchanged) | all server route/store files |

## Files deleted in total

- `apps/` (entire directory)
- `packages/` (entire directory)
- `tsconfig.base.json`
- `wrangler.jsonc` (root + apps/backend + apps/frontend = 3 files)
- `apps/frontend/vite.config.ts` (replaced by root)
- `apps/frontend/playwright.config.ts` (replaced by root)
