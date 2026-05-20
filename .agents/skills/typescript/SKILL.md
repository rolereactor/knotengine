---
name: typescript
description: TypeScript conventions and best practices. Use when writing TypeScript code.
---

# Skill: typescript

## When to Use This Skill

Use this skill when:

- Writing TypeScript code
- Setting up TS projects
- Reviewing TS code

## Naming

- Interfaces: PascalCase, no I prefix (`User` not `IUser`)
- Types: PascalCase
- Functions: camelCase

## Use `unknown` not `any`

```typescript
// Bad
function bad(x: any): any {}

// Good
function good(x: unknown): void {}
```

## Strict Mode

Enable in tsconfig:

```json
{
  "strict": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true
}
```

## Interface vs Type

- Interface: object shapes that may extend
- Type: unions, intersections, primitives
