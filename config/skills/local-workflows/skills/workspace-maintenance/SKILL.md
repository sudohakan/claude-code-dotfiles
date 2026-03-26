---
name: Workspace Maintenance
description: Review and maintain Claude or Codex workspace growth, generated artifacts, and local workflow hygiene.
when_to_use: when auditing local agent workspace growth, stale generated artifacts, or configuration sprawl
version: 1.0.0
languages: all
---

# Workspace Maintenance

Use this skill for recurring Claude workspace cleanup and maintenance tasks.

## Use Cases
- Reviewing `~/.claude` growth and retention behavior
- Checking project memory sprawl under `~/.claude/projects`
- Auditing hook, profile, and command sprawl
- Cleaning up obvious generated artifacts or stale local workspace data

## Workflow
1. Inspect current growth points first
2. Prefer reversible cleanup steps
3. Record every applied maintenance change in the workspace memory log
4. Keep security-related findings separate from routine maintenance

## Output
- Short maintenance summary
- What was cleaned, archived, or standardized
- What still needs manual confirmation
