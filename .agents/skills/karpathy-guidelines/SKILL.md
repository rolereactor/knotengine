---
name: karpathy-guidelines
description: Passive guardrail that reduces common LLM coding mistakes. Install globally — enforces think-before-coding, simplicity, and surgical changes automatically whenever writing or reviewing code.
---

# Skill: karpathy-guidelines

## When to Use This Skill

This is a passive guardrail — install it globally and it applies automatically. The agent follows these rules whenever it writes, reviews, or refactors code. You do not need to invoke it explicitly.

## 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If something is unclear, stop. Ask.

## 2. Simplicity First

- Minimum code that solves the problem.
- No features beyond what was asked.
- No abstractions for single-use code.
- If 200 lines could be 50, rewrite it.

## 3. Surgical Changes

- Touch only what you must.
- Don't "improve" adjacent code.
- Don't refactor things that aren't broken.
- Remove imports YOUR changes made unused.

## 4. Goal-Driven Execution

Define success criteria:

- "Add validation" → "Write tests, then make them pass"
- "Fix the bug" → "Write test that reproduces it, then fix"
