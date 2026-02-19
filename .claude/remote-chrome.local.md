---
ssh_host: "192.168.1.9"
ssh_user: "nishikawa"
auth_method: "password"
---

## Active Sessions

- Reverse tunnel pane: %8 (tunnel window, remote:23000 -> local:23000)

## Commands

### Normal Mode (osascript)

SSH接続後、AppleScriptでChromeを制御する。ロック画面中でも動作する。

```bash
# Chrome title
osascript -e 'tell application "Google Chrome" to return title of active tab of window 1'
# Navigate
osascript -e 'tell application "Google Chrome" to set URL of active tab of window 1 to "https://..."'
# New tab
osascript -e 'tell application "Google Chrome" to tell window 1 to make new tab with properties {URL:"https://..."}'
```

## スキル参照

- E2E検証: `remote-chrome:remote-chrome-e2e`
