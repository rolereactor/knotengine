---
name: git-workflow
description: Passive guardrail that enforces Git workflow guidelines. Install globally — the agent applies commit conventions, branch naming, and PR rules automatically without being asked.
---

# Skill: git-workflow

## When to Use This Skill

This is a passive guardrail — install it globally and it applies automatically. The agent follows these rules whenever it writes a commit, creates a branch, or prepares a PR. You do not need to invoke it explicitly.

## Commits

**Format:** `<type>(<scope>): <description>`

- Description is lowercase, present tense, no period
- Scope is optional but useful for large repos
- Keep it under 72 characters

**Types:**

- `feat` — new capability the user can see
- `fix` — bug fix
- `perf` — performance improvement with no behavior change
- `refactor` — restructure without behavior change
- `test` — adding or fixing tests
- `docs` — documentation only
- `chore` — tooling, deps, config
- `ci` — CI/CD pipeline changes
- `style` — formatting only (whitespace, semicolons, etc.)

**Breaking changes:**

Append `!` after the type to signal a breaking change:

```
feat!: remove deprecated /v1 endpoints
fix!: change auth token format
```

Or add `BREAKING CHANGE:` in the commit body. Both trigger a major version bump in `/release`.

**Rules:**

- **CRITICAL: Granular Multi-Commits.** Do NOT use `git add .` to bulk-commit an entire workspace if multiple distinct tasks were accomplished. You MUST group changed files logically (e.g., `git add src/components` → commit, `git add src/utils` → commit).
- One logical change per commit. If you find yourself writing "and" in the message, split the commit into two separate commits.
- Never commit directly to `main` or `master`.
- Never commit with `--no-verify` unless you have an explicit reason and the user approves.

## Commit Workflow

When asked to commit changes, always follow this analysis process — never jump straight to `git add`:

### 1. Understand What Changed

```bash
git status
git diff
```

Read the full diff. Understand what each change does before writing any message.

### 2. Group by Logical Concern

Identify how many distinct concerns are in the working tree:

- A new feature touches `src/auth/` and `tests/auth/` → one commit
- A bug fix touches `src/api/` while an unrelated refactor touches `src/utils/` → two commits
- If you find yourself writing "and" in the message → split into two commits

### 3. Stage and Commit Each Group Separately

```bash
# Group 1
git add src/auth/ tests/auth/
git commit -m "feat(auth): add OAuth2 login support"

# Group 2
git add src/utils/
git commit -m "refactor(utils): extract date formatting helpers"
```

Never use `git add .` or `git add -A` unless every changed file belongs to the same logical concern.

### 4. Write the Message Based on What Actually Changed

Read the staged diff — not the user's request — to write the commit message. The message describes the change, not the intent.

```bash
git diff --cached   # confirm what is staged before committing
```

## Branches

`<type>/<short-description>` — kebab-case, no ticket numbers unless the project uses them.

```
feat/user-auth
fix/null-pointer-login
refactor/extract-payment-service
```

## Pull Requests

- Title follows the same format as a commit message
- Keep PRs focused — one concern per PR
- If a PR is getting large, split it before opening
- Add a short description of _why_, not _what_ — the diff shows what

## Force Push

- **Never force push to `main` or `master`** — no exceptions.
- Only force push to your own feature branch, and only after the user explicitly approves:
  ```bash
  git push --force-with-lease origin <branch>   # safer than --force
  ```
- Use `--force-with-lease` over `--force` — it fails if someone else has pushed to the branch since your last fetch, preventing accidental overwrites.

## Undoing Changes

Choose based on whether the commit has been pushed:

| Situation                             | Command                   | Safe?                           |
| ------------------------------------- | ------------------------- | ------------------------------- |
| Undo last commit, keep changes staged | `git reset --soft HEAD~1` | ✅ Local only                   |
| Undo last commit, unstage changes     | `git reset HEAD~1`        | ✅ Local only                   |
| Undo a pushed commit                  | `git revert <hash>`       | ✅ Creates new commit           |
| Discard all local changes             | `git reset --hard HEAD`   | ⚠️ Destructive — ask user first |

**Never run `git reset --hard` on pushed commits** — use `git revert` instead. Revert is always safe because it adds a new commit rather than rewriting history.

## Rebasing

- **Rebase your feature branch** before opening a PR to keep history clean:
  ```bash
  git fetch origin
  git rebase origin/main
  ```
- **Never rebase shared branches** (`main`, `master`, `develop`) — rewriting shared history breaks everyone's local copies.
- If a rebase produces conflicts, resolve them file by file, then `git rebase --continue`. If it goes wrong, `git rebase --abort` returns to the pre-rebase state safely.

## Before Merging

- All CI checks pass
- At least one review (if team project)
- No unresolved comments
- Branch is up to date with base
