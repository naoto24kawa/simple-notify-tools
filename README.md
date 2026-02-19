# Simple Notify Tools

Claude Code Hooks 向けシンプル通知システム。ローカルネットワーク内で動作し、作業完了通知をWeb ダッシュボードとデスクトップ通知で受け取れます。

## Quick Start

```bash
# 依存関係のインストール
bun install

# サーバー起動
bun run dev:backend

# フロントエンド起動(別ターミナル)
bun run dev

# 通知送信テスト
./scripts/notify.sh "Hello" "My first notification"
```

サーバー: http://localhost:23000
フロントエンド: http://localhost:5173

## 使い方

### 通知を送信する

```bash
# 基本
./scripts/notify.sh "タイトル" "メッセージ"

# カテゴリ指定
./scripts/notify.sh "Build Complete" "Successfully built" "task_complete"

# メタデータ付き
./scripts/notify.sh "Deploy" "Deployed to prod" "deploy" '{"env":"production","branch":"main"}'
```

### 環境変数

| 変数 | デフォルト | 説明 |
|------|----------|------|
| `NOTIFY_HOST` | `localhost` | 通知サーバーのホスト |
| `NOTIFY_PORT` | `23000` | 通知サーバーのポート |
| `PORT` | `23000` | バックエンドサーバーのポート |
| `VITE_API_URL` | `http://localhost:23000` | フロントエンドのAPI接続先 |

### Claude Code Hooks 設定例

`.claude/settings.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/simple-notify-tools/scripts/notify.sh \"Tool Complete\" \"$CLAUDE_TOOL_NAME finished\""
          }
        ]
      }
    ]
  }
}
```

## API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/notify` | 通知の送信 |
| GET | `/api/notifications` | 通知一覧の取得 |
| PATCH | `/api/notifications/:id/read` | 既読マーク |
| DELETE | `/api/notifications/:id` | 通知削除 |
| GET | `/api/events` | SSE ストリーム |
| GET | `/api/health` | ヘルスチェック |

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| バックエンド | Hono + Bun |
| フロントエンド | React 19 + Vite + Tailwind CSS 4 + shadcn/ui |
| リアルタイム通信 | Server-Sent Events (SSE) |
| データ永続化 | JSON ファイル (`data/notifications.json`) |
| バリデーション | Zod |
| テスト | bun:test (unit) + Playwright (E2E) |

## 開発コマンド

```bash
bun run dev              # フロントエンド開発サーバー (:5173)
bun run dev:backend      # バックエンド開発サーバー (:23000)
bun run lint             # Biome lint
bun run lint:fix         # 自動修正
bun run test             # テスト (unit + E2E)
```
