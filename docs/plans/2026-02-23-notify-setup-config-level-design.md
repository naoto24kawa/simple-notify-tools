# notify-setup スキル: 設定レベル選択機能の設計

## 概要

notify-setup スキルに「設定レベル選択」ステップを追加し、hookの書き込み先をプロジェクト(`settings.json`)またはプロジェクトローカル(`settings.local.json`)から選べるようにする。

## 背景

現状の SKILL.md では書き込み先が `settings.json` に固定されている。チーム共有プロジェクトでは個人の通知設定を git 管理下に置きたくないケースがあるため、`settings.local.json` への書き込みも選択可能にする。

## 設計

### ステップ構成の変更

| 現行 | 変更後 |
|------|--------|
| Step 1: Prerequisites | Step 1: Prerequisites (変更なし) |
| Step 2: Resolve notify.sh | Step 2: Resolve notify.sh (変更なし) |
| Step 3: Ask Which Hooks | Step 3: Ask Which Hooks (変更なし) |
| - | **Step 4: Ask Configuration Level (新規)** |
| Step 4: Write Hook | Step 5: Write Hook (書き込み先を動的に) |
| Step 5: Test | Step 6: Test (番号のみ変更) |

### 新規 Step 4: Ask Configuration Level

AskUserQuestion で以下の選択肢を提示:

1. **プロジェクトローカル (推奨)** - `settings.local.json` に書き込む。個人のみに適用、git管理外。
2. **プロジェクト** - `settings.json` に書き込む。チーム全員に適用、git管理下。

デフォルト推奨: プロジェクトローカル

### Step 5 (旧Step 4) の変更

書き込み先を `<TARGET_PROJECT>/.claude/settings.json` 固定から、Step 4 で選択されたファイルパスに変更。

- プロジェクトローカル選択時: `<TARGET_PROJECT>/.claude/settings.local.json`
- プロジェクト選択時: `<TARGET_PROJECT>/.claude/settings.json`

### 変更対象ファイル

- `.claude/skills/notify-setup/SKILL.md` - ステップ追加・番号変更

### 変更しないファイル

- `examples/` - hook の JSON 構造自体は同じ
- `scripts/notify.sh` - 実行時の動作に変更なし
- `references/` - 参考資料に変更なし
