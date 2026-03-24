# Mesh Workflow Design Spec

**Status:** Approved by Team Leader
**Date:** 2026-03-15
**Approach:** Hybrid Mesh (Yaklaşım B)
**Scope:** All teams (global standard)

---

## Problem

Teams operated in hub-and-spoke mode: all communication routed through team leader. Result:
- Only one teammate worked while others idled
- PM analysis was bypassed — work went directly to engineering
- Launch Ops was not briefed until after development completed
- Task list was not used — work was invisible and untracked
- Teammates never communicated directly with each other

## Goal

A mesh model where all teammates communicate directly, follow standardized transfer formats, and every role actively participates in every goal.

---

## Workflow by Task Type

### Type 1: Analysis / Research
```
User → Team Leader → PM (scope + questions)
PM → Tech Lead (if technical dimension exists) [peer]
PM consolidates → Team Leader → User
```

### Type 2: Development
```
User → Team Leader → PM
PM writes requirements doc + ops brief (simultaneously):
  → Tech Lead: requirements document [peer]
  → Launch Ops: ops brief [peer]
Tech Lead: architecture decision → assigns tasks via TaskCreate → Fullstack Dev
Fullstack Dev: implements → Tech Lead (review) [peer]
Tech Lead: approved → Launch Ops (handoff) [peer]
Launch Ops: verify → Team Leader → User
```

### Type 3: Emergency Ops Fix
```
User → Team Leader → Tech Lead (PM notified, not blocking)
Tech Lead → Fullstack Dev (if code change needed)
Launch Ops: informed by Team Leader
Team Leader → User
```

---

## PM First-Filter Rule

Every Type 1 and Type 2 goal passes through PM before any technical work begins.

PM delivers a requirements document containing:
1. **Objective** — one sentence: what and why
2. **Scope boundary** — in / out list
3. **Acceptance criteria** — measurable, testable
4. **Constraints** — performance, security, compatibility
5. **Priority** — this sprint or next

**No technical work begins until PM delivers this document.**
Exception: Type 3 emergency ops fixes only.

---

## Concurrent Ops Brief

When PM sends requirements to Tech Lead, PM simultaneously sends an ops brief to Launch Ops:

```
[OPS BRIEF] <task name>
Scope: <what will be installed/changed>
Success criteria: <measurable — command output or observable signal>
Rollback: <reversal steps or "idempotent">
Estimated timing: <when dev is expected to finish>
```

Launch Ops immediately begins drafting the verification checklist — without waiting for development to complete.

---

## Transfer Formats

### Dev → Launch Ops: Handoff
```
[HANDOFF] <task name>
Setup: <what was done, which file/path>
Verify: <how to test — command or steps>
Rollback: <reversal steps>
Notes: <edge cases or caveats>
```

### Tech Lead → Launch Ops: Technical Handoff
```
[TECH HANDOFF] <task name>
What changed: <1-2 sentences>
Where: <file path or service name>
How to verify: <single command or check step>
Rollback: <revert step or "N/A">
User approval needed: <yes/no + reason>
```

### Launch Ops → Team Leader: Verify Result
```
[VERIFY] <task name>
Status: SUCCESS / FAILURE / USER APPROVAL NEEDED
Done: <verification steps performed>
Next step: <closed / escalation / waiting>
```

---

## Task System Rule

All implementation work goes through TaskCreate — not message-only assignment:
- Tech Lead creates tasks with: objective / constraints / acceptance criteria / file scope
- Fullstack Dev claims and executes tasks from the shared task list
- Ensures visibility, tracking, and prevents invisible work

---

## Peer Communication Channels

Direct SendMessage (no team leader relay required):
- PM ↔ Tech Lead: requirements, feasibility questions
- Tech Lead ↔ Fullstack Dev: implementation details, review
- Fullstack Dev → Launch Ops: handoff after tech lead approval
- PM ↔ Launch Ops: ops brief, scope changes
- Tech Lead → Launch Ops: technical handoff

Team leader intervenes only for:
- Cross-role conflicts
- User-approval items (git commit/push, deploy, architectural decisions)
- Quality verification before reporting to user

---

## Blocker Escalation Path

When a teammate is blocked:
1. First: message the teammate whose work is blocking you [peer]
2. If unresolved: message tech-lead (for technical) or PM (for scope) [peer]
3. If still unresolved: message team-lead for cross-role resolution

---

## User Approval Required

- git commit / git push
- Production deploy
- External service changes (MCP server add, config export)
- Irreversible architectural decisions (new database, breaking API change)

---

## Anti-Patterns (Prohibited)

- Team leader relaying all messages between teammates (hub-and-spoke)
- Only one teammate working while others idle
- Sending work directly to engineering without PM analysis (Type 1/2)
- Fullstack Dev receiving work via message instead of TaskCreate
- Launch Ops briefed only after development is complete
- Tech Lead doing implementation instead of delegating to Fullstack Dev
- Verify step skipped before reporting "done"
- Rollback plan undefined before deployment

---

## Implementation Checklist

Files to update:

1. `product-manager.md` — add concurrent ops brief rule, 5-item format in Default Workflow, commit/push rule
2. `tech-lead.md` — add TaskCreate requirement in Peer Communication
3. `fullstack-dev.md` — add TaskCreate requirement, reporting format, blocker escalation, handoff format
4. `launch-ops.md` — add ops brief acceptance format, handoff acceptance format, verify procedure
5. `devops.md` — fix "Operations Lead" → "team-lead"
6. `CLAUDE.md §4` — add concurrent ops brief to task flow, PM first-filter mandatory sentence
7. 9 compact role files — add commit/push rule
8. `agent-teams.md` — add handoff format standard reference
9. Active team inline prompts contain stale "CEO" references from spawn time. This resolves automatically when the team is next spawned with updated role files. No inline prompt override is needed — just ensure new spawns use role files, not inline prompts.

---

## Acceptance Criteria

- [ ] PM is the first to receive every Type 1 and Type 2 goal
- [ ] PM requirements document contains all 5 items before tech work starts
- [ ] Launch Ops receives ops brief at the same time Tech Lead receives requirements
- [ ] Implementation tasks appear in the shared task list via TaskCreate
- [ ] At least 3 peer-to-peer message exchanges occur per development cycle
- [ ] All handoffs use standard transfer formats
- [ ] Blocker escalation follows the defined 3-step path
