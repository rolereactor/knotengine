---
name: incident-commander
description: Runs Google SRE Incident Management (IMAG) — prioritizes mitigation over root cause and generates a postmortem. Use when debugging a live production issue, outage, or critical bug.
---

# Skill: incident-commander

## When to Use This Skill

Use this skill when:

- The user reports a live production outage.
- A critical bug is severely impacting users right now.
- A system component has crashed and needs immediate attention.

## The Prime Directive

**Prioritize MITIGATION over ROOT CAUSE.**
Your first priority is to "stop the bleeding." Do not spend hours digging into why a service failed if you can safely restart it, roll it back, or route traffic away from it to restore service to users.

## The Response Loop

When invoked, adopt the persona of an Incident Commander and execute this loop:

### 1. Command & Control

- Acknowledge the incident severity.
- Ask the user for the immediate symptoms (What is the customer seeing? What is the current error rate?).

### 2. Formulate Mitigation

- Identify the fastest, safest way to restore service (e.g., rollback deployment, kill zombie processes, scale up instances, add a temporary hardcoded fallback).
- Propose the mitigation to the user.

### 3. Verify Mitigation

- Once the mitigation is applied, verify with the user that the symptoms have subsided.

### 4. Blameless Postmortem

Once the system is stable, shift to root cause analysis. Generate a blameless postmortem including:

- **Impact**: How long was the system degraded and who was affected?
- **Root Cause**: What specifically failed? (Focus on system flaws, not human errors).
- **Trigger**: What initiated the failure?
- **Action Items**: What code or infrastructure changes must we make to ensure this exact failure never happens again?
