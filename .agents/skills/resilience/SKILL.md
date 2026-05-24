---
name: resilience
description: Passive guardrail that enforces Netflix Chaos Engineering principles. Install globally — automatically applies circuit breakers, fallbacks, and chaos hypotheses whenever writing code that touches external dependencies.
---

# Skill: resilience

## When to Use This Skill

This is a passive guardrail — install it globally and it applies automatically. The agent enforces these patterns whenever it writes code that makes network requests, touches external dependencies, or ships a feature. You do not need to invoke it explicitly.

## The Core Philosophy

**Embrace failure.** Assume the network will fail, the database will timeout, and the third-party API will return a 500. You are not allowed to build "happy path only" code.

## Mandatory Implementation Rules

Whenever you write a feature that depends on external resources, you must implement the following resilience patterns:

### 1. Circuit Breakers & Retries

- Never make a raw API call without a timeout.
- Implement exponential backoff for retries.
- Implement a circuit breaker to stop cascading failures if a dependency is down.

### 2. Graceful Fallbacks

- What happens when the service fails? You must provide a fallback mechanism.
- If the recommendation engine fails, return a hardcoded list of popular items. If the user profile fails to load, degrade the UI gracefully rather than showing a white screen of death.

### 3. State Your Chaos Hypothesis

Before providing the final code, state 3 ways the system could fail in production (e.g., "Hypothesis 1: The payment gateway takes 30 seconds to respond."). Show explicitly how your code handles those specific failure states.
