# Monorepo to Single App Consolidation Design

Date: 2026-02-19

## Goal

Hono + React monorepo (apps/backend + apps/frontend + packages/types) を Hono 1 アプリに統合する。

- 開発体験: `bun run dev` 一発で API + HMR 付き SPA
- 本番: Hono が API + 静的ファイル配信
- デプロイ先: Bun サーバーのみ (Cloudflare 不使用)

## Directory Structure

```
simple-notify-tools/
├── src/
│   ├── server/                    # バックエンド (Hono API)
│   │   ├── index.ts               # Hono app 定義 + AppType export
│   │   ├── routes/
│   │   │   ├── notifications.ts
│   │   │   ├── notifications.test.ts
│   │   │   ├── events.ts
│   │   │   ├── focus-window.ts
│   │   │   └── focus-window.test.ts
│   │   ├── store/
│   │   │   ├── notification-store.ts
│   │   │   └── notification-store.test.ts
│   │   └── lib/
│   │       ├── desktop-notify.ts
│   │       └── desktop-notify.test.ts
│   ├── client/                    # フロントエンド (React SPA)
│   │   ├── index.tsx              # React エントリ
│   │   ├── components/
│   │   │   ├── app/
│   │   │   └── ui/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   ├── shared/                    # 共有型定義
│   │   └── types.ts
│   ├── dev.ts                     # 開発エントリ (Vite middleware mode + Hono)
│   └── main.ts                    # 本番エントリ (Hono + static serving)
├── public/
├── e2e/
├── .storybook/
├── scripts/notify.sh
├── data/                          # gitignore
├── index.html                     # Vite HTML template
├── vite.config.ts
├── playwright.config.ts
├── tsconfig.json
├── biome.json
└── package.json
```

## Entry Points

### Production (`src/main.ts`)

- Hono app を import
- `hono/bun` の `serveStatic` で `dist/` を配信
- SPA fallback で `index.html` を返す
- Port: 23000

### Development (`src/dev.ts`)

- Vite を middleware mode で起動
- `/api` リクエストは Hono が処理
- その他は Vite が HMR 付きで処理
- 単一プロセスで API + SPA 開発

## Scripts

```json
{
  "dev": "bun run src/dev.ts",
  "start": "bun run src/main.ts",
  "build": "vite build",
  "test": "bun test",
  "test:e2e": "playwright test",
  "lint": "biome check .",
  "validate": "bun run lint && bun run test && bun run test:e2e && bun run build"
}
```

## Type Safety

- `src/server/index.ts` が `AppType` を export
- `src/client/lib/api-client.ts` が直接 import (workspace 経由不要)
- tsconfig paths: `@/` → `src/`

## Removals

| Item | Reason |
|------|--------|
| `apps/` directory | Consolidated into `src/` |
| `packages/` directory | Consolidated into `src/shared/` |
| `wrangler.jsonc` (x3) | Cloudflare not used |
| Vite `apiProxyPlugin` | Same process, not needed |
| workspace config | No longer a monorepo |
| `@cloudflare/workers-types` | Not needed |

## Migration Strategy

- File moves + import path fixes (minimal logic changes)
- All tests preserved (`bun test` + `playwright test`)
- `@repo/types` → `@/shared/types`
- `@repo/backend` → `@/server`

## Decisions

- **Approach**: Vite middleware mode for dev, Hono static serving for prod
- **Deploy target**: Bun server only
- **HMR**: Preserved via Vite middleware mode
- **Hono RPC**: Direct import, no workspace indirection
