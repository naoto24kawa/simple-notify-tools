# CLAUDE.md

Claude Code 向け指示書。

**共通情報(コマンド、アーキテクチャ、ガイドライン)**: [AGENTS.md](AGENTS.md)

## クイックリファレンス

```bash
bun run dev              # フロントエンド :5173
bun run dev:backend      # バックエンド :23000 (通知サーバー)
bun run lint             # Biome チェック
bun run test             # Playwright E2E
cd apps/backend && bun test  # バックエンド単体テスト
bun run validate         # lint + test + build 統合チェック
```

## プロジェクト概要

Hono + React モノレポ。通知サーバー(backend)が SSE でリアルタイム通知を配信し、React フロントエンドが受信・表示する。`scripts/notify.sh` や `POST /api/notify` で通知を送信可能。

## 環境セットアップ

```bash
cp .env.example .env  # GITHUB_TOKEN 等を設定
bun install
```

## 重要な制約

- **backend は Zod v4**: `z.record` 等の API が v3 と異なる
- **TypeScript strict 必須**: Hono RPC に必要
- **`data/` は gitignore 対象**: ランタイムJSON データ格納用

## Claude Code 固有の設定

### ツール使用ポリシー

- ファイル検索は `Glob` / `Grep` ツールを優先
- 複雑な探索は `Task` ツール(subagent_type=Explore)を使用
- 並列実行可能なツールは同時に呼び出す

### コード参照形式

コード参照時は `file_path:line_number` 形式を使用:

```
例: src/lib/api-client.ts:15
```

### コミットメッセージ

```
<type>: <description>

🤖 Generated with Claude Code
```

type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### ドキュメント配置

- `docs/plans/` - 設計ドキュメント、実装計画
- `__docs__/` - リファレンス、セットアップガイド
