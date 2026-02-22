# notify-setup 設定レベル選択機能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** notify-setup スキルに設定レベル選択ステップを追加し、hook の書き込み先を `settings.json` / `settings.local.json` から選べるようにする。

**Architecture:** SKILL.md のステップ構成に Step 4(設定レベル選択)を挿入し、旧 Step 4/5 を Step 5/6 に繰り下げ。Step 5 の書き込み先記述を動的に変更。

**Tech Stack:** Markdown (SKILL.md のみ)

---

### Task 1: SKILL.md に Step 4 (設定レベル選択) を追加

**Files:**
- Modify: `.claude/skills/notify-setup/SKILL.md:59-98` (Step 3 の後に新 Step 4 を挿入)

**Step 1: Step 3 の後に新しい Step 4 を挿入**

現在の `### Step 4: Write Hook to settings.json` の直前に以下を追加:

```markdown
### Step 4: Ask Configuration Level

Ask the user which configuration level to use via AskUserQuestion:

| Level | File | Description |
|-------|------|-------------|
| **Project Local** (default) | `settings.local.json` | 個人のみに適用。git管理外。 |
| **Project** | `settings.json` | チーム全員に適用。git管理下。 |

**Question example:**
- "設定をどのレベルに書き込みますか?"
- Options:
  1. "プロジェクトローカル (推奨)" - settings.local.json に書き込む。個人のみに適用、git管理されない。
  2. "プロジェクト" - settings.json に書き込む。チーム全員に適用、gitで共有される。
```

**Step 2: 旧 Step 4 を Step 5 にリナンバリング**

`### Step 4: Write Hook to settings.json` を `### Step 5: Write Hook to Settings File` に変更。

書き込み先の記述を変更:
- 旧: `Add selected hooks to <TARGET_PROJECT>/.claude/settings.json.`
- 新: `Add selected hooks to the settings file chosen in Step 4.` + 以下の表を追加:

```markdown
| Level | File |
|-------|------|
| Project Local | `<TARGET_PROJECT>/.claude/settings.local.json` |
| Project | `<TARGET_PROJECT>/.claude/settings.json` |
```

**Step 3: 旧 Step 5 を Step 6 にリナンバリング**

`### Step 5: Test` を `### Step 6: Test` に変更。

**Step 4: 動作確認**

SKILL.md を通読して、ステップ番号が連続していること、参照関係が正しいことを確認。

**Step 5: Commit**

```bash
git add .claude/skills/notify-setup/SKILL.md
git commit -m "feat: add config level selection step to notify-setup skill"
```
