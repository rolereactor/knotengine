---
name: tdd
description: Test-driven development guidelines. Use when writing tests or practicing TDD.
---

# Skill: tdd

## When to Use This Skill

Use this skill when:

- Writing tests before code
- Setting up testing workflow

## The TDD Cycle

1. **Red** - Write failing test first
2. **Green** - Write minimum code to pass
3. **Refactor** - Improve while keeping tests passing

## Principles

- Test what the code should do, not how
- Keep tests fast and isolated
- Use descriptive test names
- Follow AAA: Arrange, Act, Assert

## Example

```typescript
describe("calculateTotal", () => {
  it("should sum all item prices", () => {
    const items = [{ price: 10 }, { price: 20 }];
    const total = calculateTotal(items);
    expect(total).toBe(30);
  });
});
```
