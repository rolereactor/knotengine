---
name: handoff
description: Compacts the current conversation into a handoff document so another agent can continue the work. Use when handing off to another agent, starting a new session, or passing work context to another developer.
---

# Skill: handoff

## When to Use This Skill

Use this skill when:

- User wants to hand off work to another agent
- Continuing work in a new session
- Passing work to another developer

## Guidelines

Write a handoff document as a markdown file and save it to `/tmp/handoff.md` — not the current workspace.

### Required sections

```markdown
# Handoff

## What was done

Brief summary of completed work.

## What's remaining

Ordered list of next steps.

## Key decisions

Decisions made and the reasoning behind them — so the next agent doesn't re-litigate them.

## Suggested skills

Which skills the next agent should have loaded (e.g. `git-workflow`, `tdd`).

## References

Links or paths to relevant files, PRs, issues, or docs — do not duplicate their content here.
```

### Rules

- Do not duplicate content already in PRDs, plans, ADRs, issues, or commits — reference by path instead.
- Redact sensitive info (API keys, passwords, PII).
- Keep it short enough that a fresh agent can read it in one pass — if it exceeds one page, you're including too much detail.
