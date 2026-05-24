---
name: release
description: Stamps the changelog, bumps the version, pushes the tag, and publishes the GitHub Release with the release notes.
---

# Skill: release

## When to Use This Skill

Use this skill when the user runs the command `/release <version>` or asks to "cut the release for v<version>".

## Workflow Instructions

When invoked, the AI must sequentially execute these steps:

### 1. Determine Version

**If the user provided a version:** strip any leading `v` and use it. Skip to Step 2.

**If no version was provided:** suggest one based on commits since the last tag.

Get the last tag and commits:

```bash
git tag --sort=-v:refname | head -n 1
git log <PREVIOUS_TAG>..HEAD --oneline
# If no tags exist:
git log --oneline
```

Read the current version from `package.json` if it exists. If the project has no `package.json` (e.g. Python, Go, Rust), ask the user what the current version is. Then apply semver rules to the commits:

| Commit contains                                     | Bump type | Example: `1.2.3` → |
| --------------------------------------------------- | --------- | ------------------ |
| `BREAKING CHANGE` or `!` after type (e.g. `feat!:`) | **major** | `2.0.0`            |
| `feat:`                                             | **minor** | `1.3.0`            |
| `fix:`, `perf:`, `refactor:`, or anything else      | **patch** | `1.2.4`            |

If multiple rules match, use the highest bump. Present the suggestion to the user:

> "Based on your commits, this looks like a **minor** release. Suggested version: **1.3.0**. Confirm or enter a different version."

Wait for confirmation before proceeding.

### 2. Check for Unreleased Content

- Read `CHANGELOG.md` and check whether `## [Unreleased]` has any entries.
- If it is empty, warn the user: "No unreleased changes found in CHANGELOG.md. Run `/changelog` first to generate release notes."
- Stop and wait for the user to confirm they want to proceed anyway, or run `/changelog` first.

### 3. Stamp the Changelog

- Replace the `## [Unreleased]` heading with `## [<version>] - <YYYY-MM-DD>` (today's date).
- Insert a new empty `## [Unreleased]` heading above it with standard empty categories ready for the next cycle:

  ```
  ## [Unreleased]

  ### Added

  ### Changed

  ### Fixed

  ### Removed
  ```

### 4. Extract Release Notes

- Read the content under the newly stamped `## [<version>]` heading (everything until the next `##` heading).
- Store it as the release body — this will be posted to GitHub.

### 5. Update Version Numbers

- If `package.json` exists, update the `"version"` field to `<version>`.
- If a version sync script exists (e.g., `pnpm run version:sync` in a monorepo), run it:
  ```bash
  pnpm run version:sync
  ```
- If the project uses a different version file (e.g. `pyproject.toml`, `Cargo.toml`, `version.go`), update it accordingly.

### 6. Check for Duplicate Tag

Before committing, verify the tag does not already exist:

```bash
git tag -l "v<version>"
```

If it returns output, stop and warn the user: "Tag v<version> already exists. Please choose a different version."

### 7. Check for Existing Publish Workflow

Check whether a GitHub Actions workflow already handles release creation:

```bash
grep -rl "release\|gh release create\|action-gh-release\|create-release" .github/workflows/ 2>/dev/null
```

- **If a workflow is found:** skip `gh release create` — GitHub Actions will create the release after the tag is pushed. Inform the user: "A publish workflow was detected. GitHub Actions will create the GitHub Release automatically after the tag is pushed."
- **If no workflow is found:** proceed with `gh release create` in Step 8.

### 8. Commit, Tag, and Publish

Write the release notes to a temp file to avoid shell escaping issues:

```bash
cat > /tmp/release-notes.md << 'EOF'
<release body>
EOF
```

Show the user the full plan and ask for approval before running anything.

**If no publish workflow exists:**

```bash
git add CHANGELOG.md package.json   # or whichever version file was changed
git commit -m "chore: release v<version>"
git tag v<version>
git push origin HEAD --tags
gh release create v<version> --title "v<version>" --notes-file /tmp/release-notes.md
```

**If a publish workflow exists:**

```bash
git add CHANGELOG.md package.json   # or whichever version file was changed
git commit -m "chore: release v<version>"
git tag v<version>
git push origin HEAD --tags
```

Wait for the user to approve. Once confirmed, run the commands in order. After pushing, share the GitHub Actions URL so the user can monitor the publish pipeline:

```bash
gh run list --limit 1
```
