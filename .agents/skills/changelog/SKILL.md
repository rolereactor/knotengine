---
name: changelog
description: Check all changes from the previous tag until the latest commit and update CHANGELOG.md with clean, user-focused release notes.
---

# Skill: changelog

## When to Use This Skill

Use this skill when the user says:

- `/changelog`
- "Generate the changelog"
- "Update release notes"
- "Prepare for the next release"

## Workflow Instructions

When invoked, the AI must follow these exact steps:

### 1. Identify the Baseline

Run the following to find the most recent tag:

```bash
git tag --sort=-v:refname | head -n 1
```

- **If a tag exists:** use it as `<PREVIOUS_TAG>` in the steps below.
- **If no tags exist:** treat the beginning of the repo history as the baseline (no range filter needed).

### 2. Gather Source Material

Collect from three sources for the richest possible context:

**Commits since last tag:**

```bash
# With a previous tag:
git log <PREVIOUS_TAG>..HEAD --oneline

# Without any tags:
git log --oneline
```

**Merged PRs since last tag:**

First detect the default branch:

```bash
git remote show origin | grep "HEAD branch" | awk '{print $NF}'
```

Then fetch merged PRs:

```bash
# With a previous tag (format date as YYYY-MM-DD for GitHub search):
gh pr list --state merged --base <DEFAULT_BRANCH> --search "merged:>$(git log -1 --format=%cs <PREVIOUS_TAG>)" --json number,title,body,labels

# Without any tags:
gh pr list --state merged --base <DEFAULT_BRANCH> --json number,title,body,labels
```

**Linked issues** (for any PR that references an issue via "Fixes #N" or "Closes #N"):

```bash
gh issue view <N> --json title,body,labels
```

Prioritize PR descriptions and linked issues over raw commit messages — they contain the **why**, not just the **what**.

### 3. Filter & Analyze

- Ignore minor noise: internal test fixes, dependency bumps (unless a critical upgrade), formatting-only changes, and merge commits.
- Categorize remaining changes based on the "Keep a Changelog" standard: `Added`, `Changed`, `Fixed`, `Removed`, `Security`, `Deprecated`.

### 4. Translate to User Value

- **Do NOT dump raw commit messages or PR titles verbatim.**
- Translate technical achievements into user-facing value:
  - `perf: added compound index` → `Significantly faster load times`
  - `fix: resolve null pointer in auth service` → `Fixed a crash that occurred during login on slow connections`
- Use the PR description and linked issue to understand intent before writing.

### 5. Update or Create the File

Check if `CHANGELOG.md` exists in the project root.

The standard format for new entries is:

```markdown
## [Unreleased]

### Added

- Brief user-facing description of the new feature.

### Fixed

- Brief user-facing description of the bug that was fixed.
```

Only include categories that have entries. Omit empty ones.

**If it does NOT exist:**

- Generate a new `CHANGELOG.md` with the standard "Keep a Changelog" preamble.
- Write the new entries under an `## [Unreleased]` heading.

**If it DOES exist:**

- Read the file to understand its structure — but always write new entries in this skill's standard format (user-facing language, Keep a Changelog categories). Do not mirror existing style if it differs.
- Never touch existing versioned sections (e.g. `## [1.2.0]`) — historical entries are immutable.
- Check whether `## [Unreleased]` already has entries:
  - **If empty:** insert the new entries under it.
  - **If it already has entries:** append the new entries below the existing ones.
- If the `## [Unreleased]` section is missing entirely, create it at the top of the changelog below the preamble.

### 6. Present for Review

- Show the user a summary of what was added.
- Highlight any entries where intent was inferred (no PR description or issue to confirm against).
- Ask the user to confirm before saving.
