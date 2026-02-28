<purpose>
Execute all plans in a phase using DAG-based dynamic scheduling. Orchestrator stays lean — delegates plan execution to subagents via Task() or cs-spawn.sh based on plan size and file overlap.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-plan context. Orchestrator: discover plans → build DAG → route executors → fill agent slots dynamically → handle checkpoints → collect results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs init execute-phase "${PHASE_ARG}")
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `phase_req_ids`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.
</step>

<step name="handle_branching">
Check `branching_strategy` from init:

**"none":** Skip, continue on current branch.

**"phase" or "milestone":** Use pre-computed `branch_name` from init:
```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

All subsequent commits go to this branch. User handles merging.
</step>

<step name="validate_phase">
From init JSON: `phase_dir`, `plan_count`, `incomplete_count`.

Report: "Found {plan_count} plans in {phase_dir} ({incomplete_count} incomplete)"
</step>

<step name="discover_and_analyze_plans" depends_on="validate_phase">

Run both commands to get DAG structure and routing recommendations:

```bash
PLAN_DAG=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs phase-plan-dag ${PHASE_NUMBER} --raw)
PLAN_ROUTING=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs analyze-plan-routing ${PHASE_NUMBER} --raw)
```

From PLAN_DAG extract:
- `ready` — plans that can start immediately (no unresolved dependencies)
- `blocked` — plans waiting on specific other plans
- `graph` — full dependency map
- `plan_meta` — task_count, files_modified, autonomous flag per plan
- `has_cycle` — if true, STOP and report cycle error

From PLAN_ROUTING extract:
- `routing` — per-plan executor recommendation (`task` or `cs-spawn`)

If `--gaps-only` flag: filter to plans with `gap_closure: true` in frontmatter.

Display Execution Plan:
```
╔══════════════════════════════════════╗
║  GSD EXECUTING PHASE {PHASE_NUMBER} ║
╚══════════════════════════════════════╝

Ready to execute: {ready.length} plans
Blocked: {Object.keys(blocked).length} plans
Executor routing:
  Task() tool: {count of task-routed plans}
  cs-spawn.sh: {count of cs-spawn-routed plans}

Dependency Graph:
  {planId} → [{deps}] via {executor}
  ...
```

</step>

<step name="dag_execution_loop" depends_on="discover_and_analyze_plans">

Execute plans dynamically based on dependency resolution. Plans start as soon as their dependencies complete — no waiting for entire waves.

**Variables:**
- `ACTIVE_AGENTS` = {} — map of planId → {type: 'task'|'cs-spawn', status: 'running'}
- `COMPLETED` = set of completed plan IDs
- `FAILED` = set of failed plan IDs
- `READY_QUEUE` = initial `ready` set from DAG
- `MAX_CONCURRENT` = read from config parallelization.max_concurrent_agents (default: 6)

**Executor prompt (shared by both Task and cs-spawn agents):**

```
<objective>
Execute plan {plan_number} of phase {phase_number}-{phase_name}.
Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
@./.claude/get-shit-done/references/checkpoints.md
@./.claude/get-shit-done/references/tdd.md
</execution_context>

<files_to_read>
Read these files at execution start using the Read tool:
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
- .agents/skills/ (Project skills, if exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
</files_to_read>

<success_criteria>
- [ ] All tasks executed
- [ ] Each task committed individually
- [ ] SUMMARY.md created in plan directory
- [ ] STATE.md updated with position and decisions
- [ ] ROADMAP.md updated with plan progress (via `roadmap update-plan-progress`)
</success_criteria>
```

**Loop:**

```
WHILE READY_QUEUE is not empty OR ACTIVE_AGENTS is not empty:

  1. FILL SLOTS — While ACTIVE_AGENTS.size < MAX_CONCURRENT AND READY_QUEUE is not empty:
     - Pick next plan from READY_QUEUE
     - Check routing recommendation for this plan

     Describe what's being built (BEFORE spawning):
     Read plan's <objective>. Display:
     ---
     **{Plan ID}: {Plan Name}**
     {2-3 sentences: what this builds, technical approach, why it matters}
     Spawning via {executor type}...
     ---

     IF executor = "cs-spawn":
       - Run: cs-spawn.sh --name "gsd-{PHASE}-{PLAN}" --prompt "<executor prompt>" --dir {PROJECT_PATH} --autoyes
       - Add to ACTIVE_AGENTS as {type: 'cs-spawn', status: 'running'}

     IF executor = "task":
       - Spawn: Task(subagent_type="gsd-executor", model="{executor_model}", prompt="<executor prompt>")
       - Add to ACTIVE_AGENTS as {type: 'task', status: 'running'}

     NOTE: Task() agents in the same fill cycle are spawned as parallel Task() calls in a single message.
     cs-spawn agents are spawned via sequential Bash calls (they return immediately).

  2. WAIT FOR ANY COMPLETION:

     For Task() agents: they block until completion (Claude Code handles this natively).

     For cs-spawn agents: poll for SUMMARY.md existence:
       WORKTREE="~/.claude-squad/worktrees/gsd-{PHASE}-{PLAN}"
       Check: does {WORKTREE}/{PHASE_DIR}/{PLAN}-SUMMARY.md exist?
       Poll interval: 5 seconds
       Timeout: 30 minutes

     When mixing both types: Task() agents complete first (blocking), then poll cs-spawn agents.

  3. ON PLAN COMPLETION (planId):
     a. Run spot-check:
        - SUMMARY.md exists?
        - git log --grep="{PHASE}-{PLAN}" returns commits?
        - No "## Self-Check: FAILED" marker?

     b. Handle classifyHandoffIfNeeded false-failure:
        If agent reports failure with "classifyHandoffIfNeeded" error → run spot-checks anyway
        If spot-checks PASS → treat as successful

     c. IF cs-spawn agent: MERGE
        - git merge --no-ff agent/gsd-{PHASE}-{PLAN}
        - IF conflict → add to FAILED, present conflict to user, ask: "Resolve manually?" or "Skip this plan?"
        - IF success → cs-spawn.sh --kill "gsd-{PHASE}-{PLAN}"

     d. Report completion:
        ---
        **{Plan ID}: {Plan Name}** — Complete
        {What was built — from SUMMARY.md}
        {Notable deviations, if any}
        {Newly unblocked plans, if any}
        ---

     e. IF spot-check PASS:
        - Add planId to COMPLETED
        - Recalculate ready plans:
          Run: gsd-tools.cjs phase-plan-dag {PHASE_NUMBER} --raw
          New ready plans (not in COMPLETED, not in ACTIVE_AGENTS, not in FAILED) → add to READY_QUEUE

     f. IF spot-check FAIL:
        - Add planId to FAILED
        - Check if any blocked plans ONLY depend on this failed plan → mark those as blocked-by-failure
        - Ask user: "Plan {planId} failed. Retry? / Skip and continue? / Stop execution?"
        - "Retry" → add back to READY_QUEUE
        - "Skip" → continue, dependent plans may fail
        - "Stop" → exit loop

  4. CHECK TERMINATION:
     - All plans in COMPLETED or FAILED → exit loop
     - READY_QUEUE empty AND ACTIVE_AGENTS empty AND blocked plans remain → deadlock
       → Report: "Deadlock: plans {X} blocked by failed plans {Y}"
       → Ask user what to do
```

**PARALLELIZATION=false override:** If config parallelization is false, set MAX_CONCURRENT=1. This ensures fully sequential execution (backward compatible).

**Checkpoint plans (autonomous=false):** Handled the same as before — when a checkpoint agent returns structured state, present to user and spawn fresh continuation agent. See `<checkpoint_handling>`.

</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Auto-mode checkpoint handling:**

Read auto-advance config:
```bash
AUTO_CFG=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs config-get workflow.auto_advance 2>/dev/null || echo "false")
```

When executor returns a checkpoint AND `AUTO_CFG` is `"true"`:
- **human-verify** → Auto-spawn continuation agent with `{user_response}` = `"approved"`. Log `⚡ Auto-approved checkpoint`.
- **decision** → Auto-spawn continuation agent with `{user_response}` = first option from checkpoint details. Log `⚡ Auto-selected: [option]`.
- **human-action** → Present to user (existing behavior below). Auth gates cannot be automated.

**Standard flow (not auto-mode, or human-action type):**

1. Spawn agent for checkpoint plan
2. Agent runs until checkpoint task or auth gate → returns structured state
3. Agent return includes: completed tasks table, current task + blocker, checkpoint type/details, what's awaited
4. **Present to user:**
   ```
   ## Checkpoint: [Type]

   **Plan:** 03-03 Dashboard Layout
   **Progress:** 2/3 tasks complete

   [Checkpoint Details from agent return]
   [Awaiting section from agent return]
   ```
5. User responds: "approved"/"done" | issue description | decision selection
6. **Spawn continuation agent (NOT resume)** using continuation-prompt.md template:
   - `{completed_tasks_table}`: From checkpoint return
   - `{resume_task_number}` + `{resume_task_name}`: Current task
   - `{user_response}`: What user provided
   - `{resume_instructions}`: Based on checkpoint type
7. Continuation agent verifies previous commits, continues from resume point
8. Repeat until plan completes or user stops

**Why fresh agent, not resume:** Resume relies on internal serialization that breaks with parallel tool calls. Fresh agents with explicit state are more reliable.

**Checkpoints in parallel waves:** Agent pauses and returns while other parallel agents may complete. Present checkpoint, spawn continuation, wait for all before next wave.
</step>

<step name="aggregate_results">
After all waves:

```markdown
## Phase {X}: {Name} Execution Complete

**Waves:** {N} | **Plans:** {M}/{total} complete

| Wave | Plans | Status |
|------|-------|--------|
| 1 | plan-01, plan-02 | ✓ Complete |
| CP | plan-03 | ✓ Verified |
| 2 | plan-04 | ✓ Complete |

### Plan Details
1. **03-01**: [one-liner from SUMMARY.md]
2. **03-02**: [one-liner from SUMMARY.md]

### Issues Encountered
[Aggregate from SUMMARYs, or "None"]
```
</step>

<step name="close_parent_artifacts">
**For decimal/polish phases only (X.Y pattern):** Close the feedback loop by resolving parent UAT and debug artifacts.

**Skip if** phase number has no decimal (e.g., `3`, `04`) — only applies to gap-closure phases like `4.1`, `03.1`.

**1. Detect decimal phase and derive parent:**
```bash
# Check if phase_number contains a decimal
if [[ "$PHASE_NUMBER" == *.* ]]; then
  PARENT_PHASE="${PHASE_NUMBER%%.*}"
fi
```

**2. Find parent UAT file:**
```bash
PARENT_INFO=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs find-phase "${PARENT_PHASE}" --raw)
# Extract directory from PARENT_INFO JSON, then find UAT file in that directory
```

**If no parent UAT found:** Skip this step (gap-closure may have been triggered by VERIFICATION.md instead).

**3. Update UAT gap statuses:**

Read the parent UAT file's `## Gaps` section. For each gap entry with `status: failed`:
- Update to `status: resolved`

**4. Update UAT frontmatter:**

If all gaps now have `status: resolved`:
- Update frontmatter `status: diagnosed` → `status: resolved`
- Update frontmatter `updated:` timestamp

**5. Resolve referenced debug sessions:**

For each gap that has a `debug_session:` field:
- Read the debug session file
- Update frontmatter `status:` → `resolved`
- Update frontmatter `updated:` timestamp
- Move to resolved directory:
```bash
mkdir -p .planning/debug/resolved
mv .planning/debug/{slug}.md .planning/debug/resolved/
```

**6. Commit updated artifacts:**
```bash
node ./.claude/get-shit-done/bin/gsd-tools.cjs commit "docs(phase-${PARENT_PHASE}): resolve UAT gaps and debug sessions after ${PHASE_NUMBER} gap closure" --files .planning/phases/*${PARENT_PHASE}*/*-UAT.md .planning/debug/resolved/*.md
```
</step>

<step name="verify_phase_goal">
Verify phase achieved its GOAL, not just completed tasks.

```
Task(
  prompt="Verify phase {phase_number} goal achievement.
Phase directory: {phase_dir}
Phase goal: {goal from ROADMAP.md}
Phase requirement IDs: {phase_req_ids}
Check must_haves against actual codebase.
Cross-reference requirement IDs from PLAN frontmatter against REQUIREMENTS.md — every ID MUST be accounted for.
Create VERIFICATION.md.",
  subagent_type="gsd-verifier",
  model="{verifier_model}"
)
```

Read status:
```bash
grep "^status:" "$PHASE_DIR"/*-VERIFICATION.md | cut -d: -f2 | tr -d ' '
```

| Status | Action |
|--------|--------|
| `passed` | → update_roadmap |
| `human_needed` | Present items for human testing, get approval or feedback |
| `gaps_found` | Present gap summary, offer `/gsd:plan-phase {phase} --gaps` |

**If human_needed:**
```
## ✓ Phase {X}: {Name} — Human Verification Required

All automated checks passed. {N} items need human testing:

{From VERIFICATION.md human_verification section}

"approved" → continue | Report issues → gap closure
```

**If gaps_found:**
```
## ⚠ Phase {X}: {Name} — Gaps Found

**Score:** {N}/{M} must-haves verified
**Report:** {phase_dir}/{phase_num}-VERIFICATION.md

### What's Missing
{Gap summaries from VERIFICATION.md}

---
## ▶ Next Up

`/gsd:plan-phase {X} --gaps`

<sub>`/clear` first → fresh context window</sub>

Also: `cat {phase_dir}/{phase_num}-VERIFICATION.md` — full report
Also: `/gsd:verify-work {X}` — manual testing first
```

Gap closure cycle: `/gsd:plan-phase {X} --gaps` reads VERIFICATION.md → creates gap plans with `gap_closure: true` → user runs `/gsd:execute-phase {X} --gaps-only` → verifier re-runs.
</step>

<step name="update_roadmap">
**Mark phase complete and update all tracking files:**

```bash
COMPLETION=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs phase complete "${PHASE_NUMBER}")
```

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`.

```bash
node ./.claude/get-shit-done/bin/gsd-tools.cjs commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
```
</step>

<step name="offer_next">

**Exception:** If `gaps_found`, the `verify_phase_goal` step already presents the gap-closure path (`/gsd:plan-phase {X} --gaps`). No additional routing needed — skip auto-advance.

**No-transition check (spawned by auto-advance chain):**

Parse `--no-transition` flag from $ARGUMENTS.

**If `--no-transition` flag present:**

Execute-phase was spawned by plan-phase's auto-advance. Do NOT run transition.md.
After verification passes and roadmap is updated, return completion status to parent:

```
## PHASE COMPLETE

Phase: ${PHASE_NUMBER} - ${PHASE_NAME}
Plans: ${completed_count}/${total_count}
Verification: {Passed | Gaps Found}

[Include aggregate_results output]
```

STOP. Do not proceed to auto-advance or transition.

**If `--no-transition` flag is NOT present:**

**Auto-advance detection:**

1. Parse `--auto` flag from $ARGUMENTS
2. Read `workflow.auto_advance` from config:
   ```bash
   AUTO_CFG=$(node ./.claude/get-shit-done/bin/gsd-tools.cjs config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `./.claude/get-shit-done/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If neither `--auto` nor `AUTO_CFG` is true:**

The workflow ends. The user runs `/gsd:progress` or invokes the transition workflow manually.
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Subagents: fresh 200k each. Task() agents block natively. cs-spawn agents polled via SUMMARY.md existence (5s interval). No context bleed.
</context_efficiency>

<failure_handling>
- **classifyHandoffIfNeeded false failure:** Agent reports "failed" but error is `classifyHandoffIfNeeded is not defined` → Claude Code bug, not GSD. Spot-check (SUMMARY exists, commits present) → if pass, treat as success
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **Dependency chain breaks:** Wave 1 fails → Wave 2 dependents likely fail → user chooses attempt or skip
- **All agents in wave fail:** Systemic issue → stop, report for investigation
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/gsd:execute-phase {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>
