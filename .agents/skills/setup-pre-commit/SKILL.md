---
name: setup-pre-commit
description: Set up Husky pre-commit hooks with lint-staged, Prettier, type checking, and tests. Use when user wants to add pre-commit hooks, set up Husky, or configure lint-staged.
---

# Skill: setup-pre-commit

## When to Use This Skill

Use this skill when:

- User wants to add pre-commit hooks
- Setting up Husky
- Configuring lint-staged
- Adding commit-time formatting/typechecking/testing

## Steps

### 1. Detect package manager

Check for:

- `package-lock.json` → npm
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → yarn
- `bun.lockb` → bun

Default to npm if unclear.

### 2. Install dependencies

```bash
npm install -D husky lint-staged prettier
```

### 3. Initialize Husky

```bash
npx husky init
```

### 4. Create `.husky/pre-commit`

```
npx lint-staged
npm run typecheck
npm run test
```

Adapt: Replace `npm` with your package manager. If no `typecheck` or `test` script, omit those lines.

### 5. Create `.lintstagedrc`

```json
{
  "*": "prettier --ignore-unknown --write"
}
```

### 6. Create `.prettierrc` (if missing)

```json
{
  "useTabs": false,
  "tabWidth": 2,
  "printWidth": 80,
  "singleQuote": false,
  "trailingComma": "es5",
  "semi": true,
  "arrowParens": "always"
}
```

### 7. Verify

- [ ] `.husky/pre-commit` exists and is executable
- [ ] `.lintstagedrc` exists
- [ ] `prepare` script in package.json is `"husky"`
- [ ] Prettier config exists
- [ ] Run `npx lint-staged` to verify

### 8. Commit

Commit with message: `Add pre-commit hooks (husky + lint-staged + prettier)`

## Notes

- Husky v9+ doesn't need shebangs in hook files
- `prettier --ignore-unknown` skips files Prettier can't parse
