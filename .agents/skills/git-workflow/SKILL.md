---
name: git-workflow
description: Git workflow guidelines including commit conventions, branch naming, and code review. Use when working with Git branches, writing commits, or merging code.
---

# Skill: git-workflow

## When to Use This Skill

Use this skill when:

- Writing commit messages
- Working with branches
- Merging or rebasing
- Code reviews

## Commit Messages

Format: `<type>(<scope>): <description>`

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples:**

```
feat(auth): add login with Google
fix(api): handle null response from server
docs(readme): update installation steps
```

## Branch Naming

```
<type>/<ticket-id>-<description>

feature/123-add-login
bugfix/456-fix-header
hotfix/789-security-patch
```

## Common Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/my-feature

# Keep branch updated with main
git fetch origin
git rebase origin/main
```

## Useful Commands

```bash
# Interactive rebase to clean commits
git rebase -i HEAD~3

# Stash changes
git stash push -m "work in progress"

# Cherry-pick a commit
git cherry-pick <commit-hash>

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

## Code Review Tips

- Review small, focused PRs
- Check for: logic errors, edge cases, naming, tests
- Use suggestion comments for minor fixes
- Approve when changes look good
