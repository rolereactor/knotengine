---
name: working-backwards
description: Applies Amazon's Working Backwards method by writing a PR/FAQ before any code is written. Use when proposing or designing a new feature or product to ensure customer value before coding.
---

# Skill: working-backwards

## When to Use This Skill

Use this skill when:

- Designing a new feature or product.
- Discussing architectural changes that impact the user experience.
- The user asks you to "build X" without explaining _why_ it is valuable.

## The Rule

**You are not allowed to write any code or propose any architecture until the customer value is crystal clear.**

Before implementing any new feature, you must first write a PR/FAQ (Press Release and Frequently Asked Questions) document.

## The Process

### Step 1: The Press Release

Draft a short press release (max 1 page) pretending the feature just launched.
It must include:

- **Headline**: Catchy, customer-centric name and main benefit.
- **Subheading**: One sentence describing who the customer is and what they get.
- **Summary**: The problem being solved and the solution.
- **Customer Experience**: A short narrative showing how the customer's life improves.

_Rule: Do not use technical jargon in the Press Release. Write it for the end user._

### Step 2: The FAQ

Write an FAQ section addressing the hard questions.

- **External FAQs**: What will the customer ask? (e.g., "How much does it cost?", "How is this different from existing solutions?")
- **Internal FAQs**: What will engineering/leadership ask? (e.g., "What are the technical risks?", "How does this scale?", "What data do we need?")

### Step 3: Stop and Ask

Present the PR/FAQ to the user and ask: **"Does this accurately capture the value we want to deliver? Should we refine the narrative before I write the code?"**
