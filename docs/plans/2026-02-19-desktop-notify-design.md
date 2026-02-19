# Desktop Notification Design (terminal-notifier)

## Overview

Backend (Hono) が通知受信時に macOS の `terminal-notifier` を呼び出し、OS デスクトップ通知を表示する。通知クリックで `code-insiders` を起動し VS Code ウィンドウをフォーカスする。

## Requirements

- macOS 上で Backend を動かす前提
- `terminal-notifier` (brew) が必要。未インストール時はグレースフルデグレード
- ブラウザ不要でデスクトップ通知が届く
- 通知クリックで VS Code (Insiders) をフォーカス

## Architecture

```
POST /api/notify
       |
       v
  Backend (Hono)
       |
       +-> Store 保存 (既存)
       +-> SSE 配信 (既存)
       +-> terminal-notifier でデスクトップ通知 (新規)
              |
              +-- クリック時: code-insiders <projectDir>
```

## Implementation

### New: `apps/backend/src/lib/desktop-notify.ts`

- `sendDesktopNotification(opts)` 関数をエクスポート
- `Bun.spawn` で `terminal-notifier` を実行
- 引数: `-title`, `-message`, `-group` (カテゴリ), `-execute` (クリックアクション)
- `which terminal-notifier` で存在チェック。なければ警告ログのみ
- metadata に `project` があれば `-execute "code-insiders <projectDir>"` を設定

### Modified: `apps/backend/src/routes/notifications.ts`

- POST ハンドラ内で Store 保存後に `sendDesktopNotification` を fire-and-forget で呼び出し

## Graceful Degradation

- `terminal-notifier` 未インストール: 起動時に1回警告ログ、通知送信は正常動作
- コマンド実行失敗: エラーログのみ、API レスポンスに影響なし

## Prerequisites

```bash
brew install terminal-notifier
```

## Out of Scope

- WSL2 / Linux 対応
- Web Notification API の削除(既存のブラウザ通知は残す)
- 通知音やアイコンのカスタマイズ
- `terminal-notifier` の自動インストール
