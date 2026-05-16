# Contributing to KnotEngine

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

### Prerequisites

- **Node.js** v20 or later
- **pnpm** (`npm install -g pnpm`)
- **Docker** (for MongoDB and Redis)

### Quick Start

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/knotengine.git
cd knotengine

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env

# 4. Start infrastructure
pnpm docker:up

# 5. Start all services
pnpm dev
```

### Running Services Individually

| Command              | Service     | Port |
| -------------------- | ----------- | ---- |
| `pnpm dev:api`       | API Engine  | 5050 |
| `pnpm dev:checkout`  | Checkout UI | 5051 |
| `pnpm dev:dashboard` | Dashboard   | 5052 |

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/) for all commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                                      |
| ---------- | ------------------------------------------------ |
| `feat`     | New feature                                      |
| `fix`      | Bug fix                                          |
| `docs`     | Documentation changes                            |
| `style`    | Code style changes (formatting, no logic change) |
| `refactor` | Code refactoring (no feature change or bug fix)  |
| `test`     | Adding or updating tests                         |
| `chore`    | Maintenance tasks, dependencies, CI              |

### Examples

```bash
feat(api): add webhook delivery logging
fix(sdk): handle rate limit retry-after header
docs: update API reference with missing endpoints
test(api): add e2e tests for invoice creation
chore(deps): update pnpm to v9
```

## Pull Request Process

1. **Create a branch** from `main` with a descriptive name:

   ```bash
   git checkout -b feat/webhook-delivery-logs
   ```

2. **Make your changes** and ensure:
   - All tests pass: `pnpm test`
   - Build succeeds: `pnpm build`
   - No lint errors: `pnpm lint`

3. **Commit your changes** using the conventional commit format.

4. **Push to your fork** and open a Pull Request:

   ```bash
   git push origin feat/webhook-delivery-logs
   ```

5. **Fill out the PR template** with:
   - Description of changes
   - Testing performed
   - Related issues (if any)

## Project Structure

```
knotengine/
├── apps/
│   ├── api/          # Fastify payment engine (Port 5050)
│   ├── checkout/     # Next.js customer payment UI (Port 5051)
│   └── dashboard/    # Next.js merchant console (Port 5052)
├── packages/
│   ├── crypto/       # BIP32/BIP44 HD wallet derivation
│   ├── database/     # Mongoose models with TTL
│   ├── types/        # Shared TypeScript definitions
│   └── sdk/          # @qodinger/knot-sdk
├── docs/             # Documentation
├── scripts/          # Utility scripts
└── .github/          # Workflows and templates
```

## Testing

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter @qodinger/knot-sdk test
pnpm --filter api test

# Run E2E tests (requires running server)
KNOT_API_URL=http://localhost:5050 KNOT_API_KEY=knot_sk_test_... pnpm test:e2e
```

## Documentation

When adding or changing features, please update the relevant documentation:

- **API changes** → `docs/API_REFERENCE.md`
- **Integration changes** → `docs/INTEGRATION_GUIDE.md`
- **SDK changes** → `packages/sdk/README.md`
- **General changes** → `README.md` or `CHANGELOG.md`

## Reporting Issues

- **Bug reports**: Use the [Bug Report](https://github.com/qodinger/knotengine/issues/new?template=bug_report.md) template
- **Feature requests**: Use the [Feature Request](https://github.com/qodinger/knotengine/issues/new?template=feature_request.md) template

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0](LICENSE) license.
