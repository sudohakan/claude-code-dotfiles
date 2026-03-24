# Unified `/team` Command — Design Spec

**Date:** 2026-03-15
**Status:** Draft → Revised (post spec-review)
**Replaces:** `/buildteam`, `/e2eteam`, `/opsteam`, `/growthteam`, `/researchteam`

## Objective

Create a single `/team` custom command that replaces all 5 existing team commands. The command asks the right questions, infers team configuration from the user's goal, presents a detailed proposal, and creates the team upon approval. Brainstorming is embedded — no separate skill invocation required.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Question strategy | Smart hybrid — infer first, ask only unknowns | Minimum questions, maximum automation |
| Team size control | Suggestion-based — system proposes, user approves/modifies | Balance between automation and user control |
| Model selection | Auto-suggest with user approval | Follows CLAUDE.md rules, user can override |
| Custom/hybrid teams | Full flexibility — any combination of 17 active roles | Not limited to 5 predefined templates |
| Worktree isolation | Automatic per role | No user input needed, follows existing rules |
| Confirmation screen | Detailed — roles, models, worktree, workflow, token profile, warnings | User sees full picture before creation |
| Brainstorming | Embedded in command | Single entry point, no pre-requisite skill |
| Old commands | Deleted after `/team` is tested and verified | Clean migration |

## Command Flow

### Phase 0: Pre-flight Check

Before anything else, the command checks:
1. **Active team?** — If a team is already running in this session, halt and inform: "An active team exists. Clean it up first or cancel." Do not proceed to goal collection.
2. **Environment** — Verify tmux is available if `teammateMode: "tmux"` is set.

### Phase 1: Goal Collection

The command opens with a single open-ended question (in the user's language per CLAUDE.md rule "Respond in the user's language"):

> "What is your goal? Briefly describe your objective, project, and expected outcome."

This is the only mandatory question. Everything else is inferred or asked only if needed.

**Minimum viable goal:** The goal must contain at least an action and a subject (e.g., "refactor auth module"). If the goal is too vague to infer even a team type (e.g., "help me"), ask one clarifying question before proceeding.

### Phase 2: Analysis & Smart Inference

The system analyzes the goal text and infers:

#### Team Type Inference

| Signal Keywords | Inferred Type |
|---|---|
| feature, bug, refactor, test, API, endpoint, migration, fix, implement | **build** |
| MVP, product, launch, release, end-to-end, from scratch, new project | **e2e** |
| deploy, CI/CD, pipeline, monitoring, incident, infra, docker, k8s | **ops** |
| landing page, content, social media, campaign, SEO, marketing, launch copy | **growth** |
| research, comparison, evaluate, discover, analysis, validate, benchmark | **research** |
| Multiple categories or none match clearly | **custom** — ask follow-up |

#### Role Inference

| Concept in Goal | Suggested Role |
|---|---|
| backend, API, service architecture, microservice | `backend-architect` |
| frontend, UI, React, Vue, component, page | `fullstack-dev` |
| test, QA, coverage, regression | `qa-tester` |
| deploy, pipeline, docker, CI/CD, automation | `devops` |
| security, auth, OWASP, vulnerability | `security-engineer` |
| monitoring, logging, trace, observability | `observability-engineer` |
| cloud, infra, terraform, AWS, Azure | `cloud-architect` |
| UX, design, wireframe, mockup, user flow | `ui-ux-designer` |
| requirements, scope, priority, acceptance criteria | `product-manager` |
| review, architecture, coordination, code review | `tech-lead` |
| research, benchmark, evaluation, comparison | `research-lead` |
| analytics, KPI, metrics, A/B test | `analytics-optimizer` or `business-analyst` |
| content, copy, messaging, documentation | `content-strategist` |
| social, campaign, distribution, channel | `social-media-operator` |
| launch, release ops, rollout, deploy verification | `launch-ops` |
| growth strategy, channel optimization | `growth-lead` |

#### Model Inference

| Role Category | Default Model | Rationale |
|---|---|---|
| Team leader (orchestrator) | `opus` | CLAUDE.md rule — complex coordination requires strongest model |
| Code-writing roles (fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer) | `sonnet` | Implementation quality |
| Read-only / analysis roles (research-lead, business-analyst, analytics-optimizer, content-strategist, social-media-operator, growth-lead) | `haiku` | Token efficiency per CLAUDE.md |
| Coordination roles (tech-lead, product-manager, launch-ops) | `sonnet` | Require reasoning but not max capability |

#### Worktree Inference

Automatic, based on role — no user input:

| Isolation | Roles |
|---|---|
| **worktree** | fullstack-dev, backend-architect, devops, cloud-architect, security-engineer, qa-tester, observability-engineer, ui-ux-designer (when coding) |
| **shared workspace** | product-manager, tech-lead, launch-ops, growth-lead, content-strategist, analytics-optimizer, social-media-operator, business-analyst, research-lead |

#### Plan Approval Inference

| Default | Roles |
|---|---|
| `planModeRequired: true` | fullstack-dev (always — unconditional default per agent-teams.md) |
| `planModeRequired: false` | All other roles |

Note: `fullstack-dev` always starts with `planModeRequired: true`. This is an unconditional default, not conditional on detecting DB migrations or security-critical work. The user can toggle it off via the modify flow.

#### ui-ux-designer Isolation Rule

`ui-ux-designer` defaults to **worktree** when the team includes code-writing roles (build, e2e, ops types). Defaults to **shared workspace** when the team is purely non-coding (growth, research types). The user can override via the modify flow.

#### Role File Sync Rule

The role inference table must stay in sync with `~/.claude/teams/ACTIVE_AGENTS.md`. If a role is referenced that has no matching file in `~/.claude/teams/agents/`, the command falls back to the closest existing role by primary responsibility category (matching the Role Inference table) and shows a warning in the proposal: "No exact role file for X — using Y instead." If multiple roles are equally close, prefer the one that appears first in ACTIVE_AGENTS.md.

### Phase 3: Follow-up Questions (0-3, only if needed)

Questions are drawn from this pool — only asked when the goal doesn't provide enough signal:

| Question | Trigger Condition |
|---|---|
| Project directory / codebase path? | Not mentioned in goal AND not derivable from cwd |
| Scope boundary (what's in, what's out)? | Goal is broad or ambiguous |
| Acceptance criteria / definition of done? | No measurable criteria in goal |
| Constraints (tech stack, deadline, security)? | Goal involves critical/sensitive work |
| Want to customize the roster? | System inferred `custom` type |

**Rule:** If it can be inferred, it is NOT asked. A goal like "Add dark mode to the React frontend in src/app" provides: type=build, path=src/app, tech=React. Zero follow-up questions needed.

### Phase 4: Detailed Proposal Screen

The system presents a comprehensive proposal:

```
+------------------------------------------------------+
|                    TEAM PROPOSAL                      |
+------------------------------------------------------+
| Type: Build Team (Software Delivery)                  |
| Goal: Add dark mode support to React frontend         |
+------------------------------------------------------+
| ROSTER                                                |
| #  Role              Model   Isolation  Plan Approval |
| 1  product-manager   sonnet  shared     no            |
| 2  tech-lead         sonnet  shared     no            |
| 3  fullstack-dev     sonnet  worktree   yes           |
| 4  qa-tester         sonnet  worktree   no            |
+------------------------------------------------------+
| WORKFLOW                                              |
| - PM: requirements & acceptance criteria (first)       |
| - Tech Lead: task breakdown via TaskCreate             |
| - Fullstack Dev: implementation in isolated worktree   |
| - QA Tester: test writing and verification             |
| - Mesh communication: direct SendMessage               |
| - Completion: verification-before-completion           |
+------------------------------------------------------+
| PLATFORM CONSTRAINTS                                  |
| - One team per session (clean up existing team first)  |
| - Lead is fixed: this session = team leader            |
| - Permissions: inherited from lead's mode              |
| - Display: tmux split-pane                             |
+------------------------------------------------------+
| TOKEN PROFILE                                         |
| - 4 teammates x separate context = moderate cost      |
| - Target: 5-6 tasks per teammate                      |
+------------------------------------------------------+
| SUGGESTIONS                                           |
| - If ops/launch needed: consider adding launch-ops    |
+------------------------------------------------------+

Approve? (yes / modify / cancel)
```

**PM inclusion rule:** When the inferred type is `build` or `e2e`, `product-manager` is always included in the roster. The PM first-filter rule requires PM to produce requirements before technical work begins. The user can remove PM via the modify flow, but a warning is shown: "Removing PM disables the PM first-filter workflow — Tech Lead will handle requirements directly."

### Phase 5: Modify Flow

If the user says "modify":

> "What would you like to change? (add/remove role, change model, toggle plan approval, or free text)"

Changes are applied and the proposal screen is re-presented. This loops until the user approves or cancels.

Supported modifications:
- **Add role:** "Add security-engineer" → role added with auto-inferred model/worktree
- **Remove role:** "Remove qa-tester" → role removed
- **Change model:** "Use opus for backend-architect" → model updated
- **Toggle plan approval:** "Enable plan approval for backend-architect" → toggled
- **Change isolation:** "Make qa-tester shared workspace" → isolation updated
- **Free text:** Any other change request is interpreted and applied

### Phase 6: Team Creation & Kickoff

After approval:

1. **Create team** — establish shared team config and task list
2. **Spawn teammates** — each with:
   - Explicit `model` parameter
   - `isolation: "worktree"` where applicable
   - Role file loaded from `~/.claude/teams/agents/<role>.md`
   - Spawn prompt including: goal, their role, team context, workflow expectations
3. **Create initial tasks** — via TaskCreate with:
   - Role tags (`[ROLE: <role>]`)
   - Dependencies (`[DEPENDS: ...]` + `TaskUpdate addBlockedBy`)
   - Acceptance criteria
4. **Notify all teammates** — simultaneously, not sequentially
5. **Start workflow** — based on team type and roster:
   - **build/e2e (PM present):** PM first-filter → parallel kickoff (requirements to tech-lead + ops brief to launch-ops if present)
   - **build/e2e (PM removed by user):** Tech Lead handles requirements directly → implementation tasks
   - **ops:** systematic-debugging if incident, then parallel investigation
   - **growth:** parallel content/analytics work
   - **research:** parallel discovery streams
   - **custom:** adapted mesh workflow based on roles present — if PM exists, PM first-filter applies; concurrent ops brief applies only if both PM and launch-ops are present (PM is the sender). If launch-ops exists without PM, tech-lead sends a simplified ops brief.

## Workflow Rules (Applied to All Teams)

These rules are enforced by the `/team` command regardless of team type:

1. **Mesh communication** — teammates talk directly via SendMessage, not through leader
2. **Task-based coordination** — all work through TaskCreate/TaskUpdate, not verbal-only
3. **Self-claiming protocol** — teammates claim unblocked tasks matching their role
4. **PM first-filter** — if PM is on the team, all goals pass through PM first
5. **Concurrent ops brief** — if both PM and launch-ops are present, parallel kickoff
6. **Verification before completion** — `superpowers:verification-before-completion` before marking done
7. **No duplicate work** — each task has exactly one owner
8. **Graceful shutdown** — shutdown_request/shutdown_response protocol
9. **Lead never implements** — only delegates and verifies

## Platform Constraints (Documented in Team Context)

Every team created by `/team` includes these constraints in the spawn context:

1. **One team per session** — clean up existing team before creating new one
2. **No nested teams** — teammates cannot spawn their own teams
3. **Lead is fixed** — the creating session is lead for the team's lifetime
4. **Permission inheritance** — all teammates inherit lead's permission mode
5. **No session resumption** — `/resume` and `/rewind` do not restore in-process teammates
6. **Team cleanup** — only the lead runs cleanup, after all teammates are shut down

## Changes to `agent-teams.md`

The following sections are added to `~/.claude/docs/agent-teams.md`:

### New Section: Platform Constraints

Added after the "Worktree Isolation Rule" section:

```markdown
## Platform Constraints
- **One team per session:** Only one team can be active at a time. Clean up the
  current team before starting a new one.
- **No nested teams:** Teammates cannot spawn their own teams. Only the lead
  manages the team.
- **Lead is fixed:** The session that creates the team is the lead for its
  lifetime. Leadership cannot be transferred or promoted.
- **Permission inheritance:** All teammates start with the lead's permission
  mode. Per-teammate permissions cannot be set at spawn time — only changed
  after spawning.
- **No session resumption for in-process teammates:** `/resume` and `/rewind`
  do not restore in-process teammates. After resuming, the lead should spawn
  new replacements if needed.
```

### New Section: Team Cleanup

Added after the "Graceful Shutdown" section:

```markdown
### Team Cleanup
After all teammates are shut down, the lead must clean up shared team resources:
1. Verify all teammates are stopped (no active sessions).
2. Lead runs cleanup — removes shared team config and task list.
3. **Only the lead runs cleanup.** Teammates must never run cleanup — their
   team context may not resolve correctly, leaving resources inconsistent.
4. If cleanup fails due to active teammates, shut them down first.
```

### Extended Section: Display Modes

Appended to existing Display Modes section:

```markdown
### Direct Teammate Interaction
- **In-process mode:** Press Shift+Down to cycle through teammates. Type to
  message them directly. Press Enter to view a teammate's session, Escape to
  interrupt their turn. Press Ctrl+T to toggle the task list.
- **Split-pane mode (tmux):** Click into a teammate's pane to interact with
  their session directly. Each pane is a full independent Claude Code session.
- After the last teammate, Shift+Down wraps back to the lead.
```

## Changes to `settings.json`

```json
"teammateMode": "tmux"
```

Changed from `"auto"` to `"tmux"` — user confirmed tmux split-pane usage.

## Changes to `CLAUDE.md`

### Team Creation Rule Update

Replace:
```markdown
### Team Creation Rule
When the user asks to create/set up a team → **always run `superpowers:brainstorming` first**.
There are multiple team skills and brainstorming is required to understand the goal, scope,
and pick the right one. Never skip brainstorming and never substitute it with ad-hoc questions.
```

With:
```markdown
### Team Creation Rule
When the user asks to create/set up a team → **use `/team`**. This unified command embeds
brainstorming, asks the right questions, infers team configuration, and creates the team.
The user initiates `/team` explicitly — Claude never auto-creates teams without user request.
Individual team commands (`/buildteam`, `/e2eteam`, etc.) are deprecated.
```

### Section 4 "Ask user before creating a team" Update

The existing rule in Section 4 ("Ask the user before creating a team") is preserved but reworded:

Replace:
```markdown
- Ask the user before creating a team.
```

With:
```markdown
- Teams are created only when the user explicitly invokes `/team`. Never auto-create teams.
```

This applies to both `agent-teams.md` Local Rules and CLAUDE.md Section 4.

### Canonical Team Commands Update

Replace references to 5 separate commands with single `/team` command across CLAUDE.md and agent-teams.md.

## Migration Plan

1. Create `/team` command file at `~/.claude/commands/team.md`
2. Update `agent-teams.md` with gap-closing additions (Platform Constraints, Team Cleanup, Direct Teammate Interaction)
3. Update `settings.json` — `teammateMode: "tmux"`
4. Test `/team` command with a real scenario
5. After successful test: move old command files to `~/.claude/commands/deprecated/` (`buildteam.md`, `e2eteam.md`, `opsteam.md`, `growthteam.md`, `researchteam.md`)
6. Update `CLAUDE.md` team creation rule
7. Update `agent-teams.md` canonical commands section

## Edge Case Handling

| Edge Case | Handling |
|---|---|
| Goal completely ambiguous | Ask one clarifying question. If still ambiguous after 2 attempts, suggest `/team` with a more specific goal. |
| User reduces roster below 2 teammates | Block: "A team requires at least 2 teammates for meaningful coordination. Add roles or cancel." Triggers at < 2, not only at 0. |
| User wants 10+ teammates | Show warning in proposal: "Large teams (10+) have high token costs and coordination overhead. Recommended: 3-5. Proceed anyway?" |
| No matching role file exists | Fall back to closest existing role from ACTIVE_AGENTS.md. Show warning: "No exact role file for X — using Y instead." |
| Team already active in session | Phase 0 blocks: "An active team exists. Clean it up first or cancel." |
| Custom type with unclear roles | Propose a minimal roster based on detected concepts + ask "Want to customize the roster?" with the 17 available roles listed. |
| `--dangerously-skip-permissions` | Explicitly noted in spawn context: all teammates inherit this flag from the lead automatically. No explicit passing needed — this is Claude Code native behavior. |
| tmux not available | If `teammateMode: "tmux"` but tmux is not installed, warn and fall back to in-process mode. |

## Migration Rollback

Old command files are moved to `~/.claude/commands/deprecated/` rather than hard-deleted. They remain available for rollback until `/team` has been verified in production use across at least 3 different team types. After that, the deprecated directory can be removed.

## Out of Scope

- New role files — existing 17 roles are sufficient
- Changes to role file content — roles work as-is
- GSD workflow changes — GSD integration remains the same
- Hook script changes — existing TeammateIdle and TaskCompleted hooks work as-is
