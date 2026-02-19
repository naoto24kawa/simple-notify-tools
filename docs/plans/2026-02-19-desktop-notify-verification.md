# Desktop Notification 動作チェック

## 前提条件

- [ ] macOS 上で作業していること
- [ ] `brew install terminal-notifier` 済み
- [ ] `which terminal-notifier` で パスが表示される

## 1. Backend 起動

```bash
cd /path/to/simple-notify-tools
bun install
bun run dev:backend
```

確認: `Starting server on port 23000...` が表示される

## 2. 基本通知 (metadata なし)

```bash
curl -sf -X POST http://localhost:23000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","message":"Desktop notification test"}'
```

- [ ] macOS デスクトップ通知バナーが表示される
- [ ] タイトル: "Hello"
- [ ] メッセージ: "Desktop notification test"
- [ ] クリックしても何も起きない (execute 未指定のため)

## 3. VS Code フォーカス付き通知

```bash
curl -sf -X POST http://localhost:23000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Build Done","message":"Project build complete","category":"task_complete","metadata":{"project":"/path/to/any/project"}}'
```

`/path/to/any/project` は実在するディレクトリに置き換える。

- [ ] デスクトップ通知バナーが表示される
- [ ] 通知をクリックすると `code-insiders` でそのディレクトリが開く

## 4. notify.sh 経由

```bash
./scripts/notify.sh "Script Test" "From notify.sh" "info" '{"project":"/path/to/any/project"}'
```

- [ ] デスクトップ通知が表示される

## 5. グレースフルデグレード確認 (任意)

```bash
# terminal-notifier を一時的にリネーム
sudo mv $(which terminal-notifier) /usr/local/bin/terminal-notifier.bak

# Backend 再起動
bun run dev:backend
# ログに "[desktop-notify] terminal-notifier not found..." が出る

# 通知送信 - エラーにならないことを確認
curl -sf -X POST http://localhost:23000/api/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Should not crash"}'
# API は 201 を返す (通知バナーは出ない)

# 元に戻す
sudo mv /usr/local/bin/terminal-notifier.bak $(which terminal-notifier 2>/dev/null || echo /usr/local/bin/terminal-notifier)
```

- [ ] Backend がクラッシュしない
- [ ] API レスポンスは正常 (201)

## 6. CODE_CMD カスタマイズ確認 (任意)

```bash
CODE_CMD=code bun run dev:backend
```

- [ ] 通知クリック時に `code` (通常版 VS Code) が起動する
