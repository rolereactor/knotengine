# Contributing to KnotEngine

Thank you for your interest in contributing! This guide will help you get started.

## Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **pnpm** (`npm install -g pnpm`)
- **Docker** (for MongoDB & Redis)

### Setup

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/knotengine.git
cd knotengine

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env.local

# 4. Start Docker + all apps
pnpm docker:up && pnpm dev
```

Press `Ctrl+C` to stop apps. Run `pnpm docker:down` to stop infrastructure.

### Useful Commands

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `pnpm start`         | Start Docker + all apps          |
| `pnpm dev:api`       | Start API only (port 5050)       |
| `pnpm dev:dashboard` | Start Dashboard only (port 5052) |
| `pnpm test`          | Run all tests                    |
| `pnpm lint`          | Run linter                       |
| `pnpm build`         | Build all packages               |
| `pnpm docker:down`   | Stop Docker containers           |

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/). Enforced via `commitlint`.

```
<type>(<scope>): <description>
```

### Types

| Type       | Description                            |
| ---------- | -------------------------------------- |
| `feat`     | New feature                            |
| `fix`      | Bug fix                                |
| `docs`     | Documentation only                     |
| `style`    | Formatting, no logic change            |
| `refactor` | Code restructuring, no behavior change |
| `test`     | Adding or updating tests               |
| `chore`    | Maintenance, dependencies, CI          |

### Examples

```bash
feat(api): add webhook delivery logging
fix(sdk): handle rate limit retry-after header
docs: update API reference with missing endpoints
test(api): add e2e tests for invoice creation
chore(deps): update pnpm to v9
```

---

## Pull Request Process

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feat/webhook-delivery-logs
   ```

2. **Make your changes** and verify:

   ```bash
   pnpm test    # All tests pass
   pnpm build   # Build succeeds
   pnpm lint    # No errors
   ```

3. **Commit** with conventional format:

   ```bash
   git commit -m "feat(api): add webhook delivery logs"
   ```

4. **Push and open a PR**:

   ```bash
   git push origin feat/webhook-delivery-logs
   ```

5. **Fill out the PR template** with:
   - What changed and why
   - Testing performed
   - Related issues

---

## Project Structure

```
knotengine/
├── apps/
│   ├── api/          # Fastify payment engine (5050)
│   ├── checkout/     # Next.js customer UI (5051)
│   └── dashboard/    # Next.js merchant console (5052)
├── packages/
│   ├── crypto/       # BIP32/BIP44 HD wallet derivation
│   ├── database/     # Mongoose models + TTL
│   ├── types/        # Shared TypeScript definitions
│   └── sdk/          # @qodinger/knot-sdk
├── docs/             # API reference & guides
├── scripts/          # Deploy & utility scripts
└── .github/          # CI/CD, Dependabot, templates
```

---

## Testing

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter @qodinger/knot-sdk test
pnpm --filter api test

# Run E2E tests (requires running server)
KNOT_API_URL=http://localhost:5050 KNOT_API_KEY=knot_sk_test_... pnpm test:e2e
```

---

## Documentation

Update docs when changing features:

| Change           | Update                        |
| ---------------- | ----------------------------- |
| API endpoints    | `docs/API_REFERENCE.md`       |
| Integration flow | `docs/INTEGRATION_GUIDE.md`   |
| SDK methods      | `packages/sdk/README.md`      |
| General          | `README.md` or `CHANGELOG.md` |

---

## Reporting Issues

- **Bug reports**: [Bug Report Template](https://github.com/qodinger/knotengine/issues/new?template=bug_report.md)
- **Security issues**: See [SECURITY.md](https://github.com/qodinger/knotengine/blob/main/SECURITY.md)

---

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](LICENSE) license.
