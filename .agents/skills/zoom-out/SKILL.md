---
name: zoom-out
description: Tell the agent to zoom out and give broader context or a higher-level perspective. Use when you're unfamiliar with a section of code or need to understand how it fits into the bigger picture.
---

# Skill: zoom-out

## When to Use This Skill

Use this skill when:

- You're unfamiliar with a section of code
- Need to understand how code fits into the bigger picture
- Asking "how does this work?"

## What It Does

The AI should say: "I don't know this area well. Let me go up a layer of abstraction."

Then provide:

- A map of all relevant modules and callers
- Use the project's domain vocabulary
- Explain how the code fits into the larger system

## When to Invoke

- Exploring unfamiliar code paths
- Before making changes to understand impact
- When code seems complex and you need context
- Onboarding to a new part of the codebase

## Tips

- Use this early, not after you've already gone down the wrong path
- Ask for the "10,000 foot view" before diving into details
- Request a diagram or flowchart if helpful
