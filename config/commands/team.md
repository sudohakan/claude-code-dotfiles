# Team

Unified command to create an agent team. Embeds brainstorming — no separate skill needed.

## Pre-flight Check (Phase 0)

Before anything else:
1. **Active team?** Check if a team is already running. If yes, stop: "An active team exists. Clean it up first, or cancel."
2. **Environment:** If `teammateMode` is `"tmux"`, verify tmux is available. If not, warn and fall back to in-process mode.

## Goal Collection (Phase 1)

Ask the user one open-ended question (in the user's language):

> "What is your goal? Briefly describe your objective, project, and expected outcome."

If too vague to infer even a team type, ask one clarifying question. Max 2 attempts.

## Analysis & Smart Inference (Phase 2)

### Team Type Inference

| Signal Keywords | Inferred Type |
|---|---|
| feature, bug, refactor, test, API, endpoint, migration, fix, implement | **build** |
| MVP, product, launch, release, end-to-end, from scratch, new project | **e2e** |
| deploy, CI/CD, pipeline, monitoring, incident, infra, docker, k8s | **ops** |
| landing page, content, social media, campaign, SEO, marketing | **growth** |
| research, comparison, evaluate, discover, analysis, benchmark | **research** |
| Multiple categories or none match | **custom** — ask follow-up |

### Role Inference

| Concept in Goal | Suggested Role |
|---|---|
| backend, API, service, microservice | `backend-architect` |
| frontend, UI, React, component | `fullstack-dev` |
| test, QA, coverage, regression | `qa-tester` |
| deploy, pipeline, docker, CI/CD | `devops` |
| security, auth, OWASP, vulnerability | `security-engineer` |
| monitoring, logging, trace | `observability-engineer` |
| cloud, infra, terraform, AWS, Azure | `cloud-architect` |
| UX, design, wireframe, user flow | `ui-ux-designer` |
| requirements, scope, priority | `product-manager` |
| review, architecture, coordination | `tech-lead` |
| research, benchmark, evaluation | `research-lead` |
| analytics, KPI, metrics | `analytics-optimizer` or `business-analyst` |
| content, copy, messaging | `content-strategist` |
| social, campaign, distribution | `social-media-operator` |
| launch, release ops, rollout | `launch-ops` |
| growth strategy, channel | `growth-lead` |

### Type-based Default Rosters

| Type | Default Roster |
|---|---|
| **build** | product-manager, tech-lead, fullstack-dev, qa-tester |
| **e2e** | product-manager, tech-lead, fullstack-dev, launch-ops |
| **ops** | devops, cloud-architect, observability-engineer, security-engineer |
| **growth** | growth-lead, content-strategist, social-media-operator, analytics-optimizer |
| **research** | research-lead, product-manager, business-analyst, ui-ux-designer |
| **custom** | Inferred from keywords — propose minimal roster + ask user |

### Model Inference

| Role Category | Default Model | Rationale |
|---|---|---|
| Team leader (orchestrator) | `opus` | Complex coordination |
| Code-writing roles (fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer) | `sonnet` | Implementation quality |
| Read-only / analysis roles (research-lead, business-analyst, analytics-optimizer, content-strategist, social-media-operator, growth-lead) | `haiku` | Token efficiency |
| Coordination roles (tech-lead, product-manager, launch-ops) | `sonnet` | Reasoning needed |

### Worktree Inference

| Isolation | Roles |
|---|---|
| **worktree** | fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer |
| **shared workspace** | product-manager, tech-lead, launch-ops, growth-lead, content-strategist, analytics-optimizer, social-media-operator, business-analyst, research-lead |

**ui-ux-designer:** worktree when coding teams (build, e2e, ops), shared workspace otherwise.

## Follow-up Questions (Phase 3)

Only ask what cannot be inferred (0-3 questions max):

| Question | Trigger |
|---|---|
| Project directory? | Not derivable from cwd |
| Scope boundary? | Goal is broad |
| Done definition? | No measurable criteria |
| Constraints? | Critical/sensitive work |
| Customize roster? | Inferred `custom` type |

## Proposal Screen (Phase 4)

Present:
```
+------------------------------------------------------+
|                    TEAM PROPOSAL                      |
+------------------------------------------------------+
| Type: [type]   Goal: [goal]                          |
+------------------------------------------------------+
| ROSTER                                                |
| #  Role              Model   Isolation               |
| [numbered list]                                       |
+------------------------------------------------------+
| WORKFLOW                                              |
| [steps based on team type]                            |
+------------------------------------------------------+
| TOKEN PROFILE                                         |
| N teammates x separate context                        |
+------------------------------------------------------+
```

Warnings when applicable:
- 6+ teammates: "Consider reducing — 3-5 is optimal."
- PM removed from build/e2e: "Tech Lead handles requirements directly."

Ask: **"Approve? (yes / modify / cancel)"**

## Modify Flow (Phase 5)

If "modify": allow add/remove role, change model, change isolation. Re-present proposal. Guard: minimum 2 teammates.

## Team Creation & Kickoff (Phase 6)

After approval:

1. **Create team** — establish shared config and task list.
2. **Spawn teammates** — each with:
   - Explicit `model` parameter
   - `isolation: "worktree"` where applicable
   - **Short spawn prompt:** goal summary + role file reference + team context. Do NOT embed full workflow rules.
3. **Create initial tasks** — via TaskCreate with descriptions, acceptance criteria, and dependencies (analyze real data flow, not sequential order). **Always expand scope proactively:** beyond the user's explicit requirements, add tasks for edge cases, failure scenarios, race conditions, data integrity, error propagation, and any area the user likely didn't think of but would expect to be covered. The user prefers comprehensive coverage over minimal scope.
4. **Notify all teammates** simultaneously.
5. **Start workflow:**
   - **build/e2e (PM present):** PM scopes → requirements to tech-lead (+ brief to launch-ops if present)
   - **build/e2e (PM removed):** Tech Lead handles requirements → implementation
   - **ops:** parallel investigation
   - **growth:** parallel content/analytics work
   - **research:** parallel discovery streams
   - **custom:** adapted workflow based on roster

## Workflow Rules (All Teams)

1. **Direct communication** — teammates talk via SendMessage, not through leader
2. **Task-based coordination** — all work through TaskCreate/TaskUpdate
3. **Verification before completion** — verify output before marking done
4. **No duplicate work** — each task has exactly one owner
5. **Graceful shutdown** — ask teammates to shut down in natural language
6. **Lead delegates** — lead coordinates and verifies, delegates implementation

## Platform Constraints

1. One team per session
2. No nested teams
3. Lead is fixed
4. Permission inheritance
5. No session resumption for in-process teammates
6. Only the lead runs cleanup

## Reference

- Role files: `~/.claude/teams/agents/<role>.md`
- Active roles catalog: `~/.claude/teams/ACTIVE_AGENTS.md`
- Full guide: `~/.claude/docs/agent-teams.md`
