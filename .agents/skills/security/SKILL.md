---
name: security
description: Passive guardrail that enforces a security checklist for full-stack development. Install globally — automatically runs before any feature touching user input, auth, data storage, or API endpoints is marked complete.
---

# Skill: security

## When to Use This Skill

This is a passive guardrail — install it globally and it applies automatically. The agent runs this checklist before marking any feature complete that involves user input, auth, data storage, file uploads, or API endpoints. You do not need to invoke it explicitly.

## Input Validation

Never trust user input. Validate and sanitize at every boundary.

- Use parameterized queries or an ORM — never concatenate user input into SQL strings
- Validate shape and type with Zod (Node.js) or Pydantic (Python) at the API boundary
- Never pass raw user input to `eval()`, `exec()`, shell commands, or file paths
- Strip or encode HTML in any user-supplied content that will be rendered

```typescript
// Bad
db.query(`SELECT * FROM users WHERE email = '${email}'`);

// Good
db.query("SELECT * FROM users WHERE email = $1", [email]);
```

## Authentication & Authorization

- Every protected route must check auth — don't rely on the frontend to hide routes
- Check authorization (can this user access this resource?) separately from authentication (is this user logged in?)
- Never store passwords in plain text — use bcrypt or argon2
- Lock accounts after 5 consecutive failed login attempts
- Set token expiry. Refresh tokens should be rotated on use.
- Set session timeouts — 30 minutes of inactivity is a reasonable default
- Use `httpOnly` and `Secure` flags on auth cookies

```typescript
// Check both: who are you, and can you do this?
const user = await getAuthenticatedUser(req); // authentication
if (user.id !== resource.ownerId) throw new ForbiddenError(); // authorization
```

## Sensitive Data

- Never log passwords, tokens, API keys, or PII
- Never return sensitive fields in API responses — explicitly whitelist what goes out
- Never hardcode secrets in source code — use environment variables
- Check `.env` files are in `.gitignore` before every first commit on a project
- Encrypt PII at rest — don't just avoid logging it, don't store it in plain text either
- Never store raw credit card numbers — use Stripe or equivalent and store only tokens

## API Security

- Rate limit all public endpoints — 100 requests per user per minute is a reasonable default
- Configure CORS to allow only known domains, never `*` in production
- Return generic error messages to clients — never expose stack traces, DB errors, or internal paths

```typescript
// Bad — leaks implementation details
res.status(500).json({ error: err.message, stack: err.stack });

// Good — generic to client, full details in server logs
console.error(err);
res.status(500).json({ error: "Something went wrong" });
```

## Dependencies

- Don't add a package to solve a trivial problem — every dependency is an attack surface
- Run `npm audit` (or equivalent) before shipping. Fix critical and high severity issues.

## Pre-Ship Checklist

Before calling a feature done, ask:

- What happens if a user sends an empty, null, or extremely large input?
- What happens if a user tries to access another user's data by changing an ID in the URL?
- What happens if this endpoint is called 1000 times per second?
- Is there anything in the response that a user shouldn't be able to see?
- Are error messages generic enough that they don't reveal system internals?
