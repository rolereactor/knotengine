---
name: git-commit
description: Execute git commit with conventional commit message analysis, intelligent staging, and message generation. Use when user asks to commit changes, create a git commit, or mentions "/commit".
---

# Git Commit

Create standardized, semantic git commits using Conventional Commits.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

## Types

| Type       | Purpose               |
| ---------- | --------------------- |
| `feat`     | New feature           |
| `fix`      | Bug fix               |
| `docs`     | Documentation         |
| `style`    | Formatting (no logic) |
| `refactor` | Code restructure      |
| `perf`     | Performance           |
| `test`     | Tests                 |
| `build`    | Build/dependencies    |
| `ci`       | CI/config             |
| `chore`    | Maintenance           |
| `revert`   | Revert commit         |

## Workflow

### 1. Analyze Changes

```bash
git status --porcelain
git diff --stat
```

### 2. Detect Scope

- **Multi-feature detection:** If changes span 3+ areas, **ask user**:
  - "Commit all together or split into separate commits?"

### 3. Stage Files

```bash
# Specific files
git add src/auth/ tests/

# All changes
git add -A

# Interactive
git add -p
```

**Never commit secrets** (.env, credentials.json).

### 4. Generate & Execute

```bash
git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

- Bullet points for multi-line
EOF
)"
```

## Rules

- Imperative mood: "add feature" not "added feature"
- Description <72 chars
- One logical change per commit
- Reference issues: `Closes #123`

## Safety

- NEVER force push to main/master
- NEVER skip hooks without explicit request
- If hooks fail, fix and create NEW commit (don't amend)
- NEVER update git config
- NEVER destructive commands (--force, hard reset) without explicit request
