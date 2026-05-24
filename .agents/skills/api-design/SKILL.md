---
name: api-design
description: Enforces Stripe API design principles for consistency, idempotency, and backwards compatibility. Use when designing endpoints, defining data models, or building REST/GraphQL interfaces.
---

# Skill: api-design

## When to Use This Skill

Use this skill when:

- Designing a new REST or GraphQL API.
- Defining the request/response payloads for endpoints.
- Building SDKs or client libraries.

## The Core Philosophy

**APIs are products.** They must be intuitive, predictable, and heavily documented. Your goal is to provide a world-class Developer Experience (DX).

## Stripe's API Pillars

When generating API routes or controllers, you must strictly adhere to the following rules:

### 1. Predictability & Consistency

- **Naming**: Use standard REST verbs (GET, POST, PUT, DELETE). Pluralize resource names (e.g., `/users`, not `/user`).
- **Shapes**: Every response must follow a consistent shape. If an object is returned, its structure must be identical across all endpoints that return it.
- **IDs**: Prefix IDs with an identifier string to make them self-documenting (e.g., `cus_123` for Customer, `ch_456` for Charge).

### 2. Idempotency

- Any operation that mutates state (POST, PUT, DELETE) must support idempotency keys.
- If a user submits the exact same request twice (due to network retry), the system must guarantee it is only processed once and the same result is returned. Do not charge the customer twice.

### 3. Backwards Compatibility

- You must never introduce a breaking change to an existing endpoint.
- If you need to change a payload significantly, version the API. Additions to a payload are fine; removals or type changes are strictly forbidden.

### 4. Descriptive Errors

- Never return a raw stack trace or a generic "500 Internal Server Error" without a body.
- Errors must contain a readable `message`, a programmatic `code`, and a link to documentation (if applicable).
