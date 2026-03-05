<purpose>
Execute all plans in a phase using eager wave advancement with optional cs-spawn hybrid execution. Orchestrator stays lean — delegates plan execution to subagents via Task() or cs-spawn based on plan size.
</purpose>

<core_principle>
Orchestrator coordinates, not executes. Each subagent loads the full execute-plan context. Orchestrator: discover plans → route executors → fill agent slots eagerly (no wave boundary wait) → handle checkpoints → collect results.
</core_principle>

<required_reading>
Read STATE.md before any operation to load project context.
</required_reading>

<process>

<step name="initialize" priority="first">
Load all context in one call:

```bash
INIT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE_ARG}")
if [[ "$INIT" == @file:* ]]; then INIT=$(cat "${INIT#@file:}"); fi

# Check cs-spawn (Claude Squad) availability
CS_AVAILABLE=$(which cs 2>/dev/null && echo "true" || echo "false")

# Read execution config (cs-spawn thresholds, max concurrent)
CS_TASK_THRESHOLD=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get execution.cs_spawn_threshold.task_count 2>/dev/null || echo "8")
CS_FILES_THRESHOLD=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get execution.cs_spawn_threshold.files_modified 2>/dev/null || echo "15")
MAX_CONCURRENT=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get execution.max_concurrent 2>/dev/null || echo "6")
```

Parse JSON for: `executor_model`, `verifier_model`, `commit_docs`, `parallelization`, `branching_strategy`, `branch_name`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `phase_slug`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`, `state_exists`, `roadmap_exists`, `phase_req_ids`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.
**If `state_exists` is false but `.planning/` exists:** Offer reconstruct or continue.

When `parallelization` is false, plans within a wave execute sequentially.

**Sync chain flag with intent** — if user invoked manually (no `--auto`), clear the ephemeral chain flag from any previous interrupted `--auto` chain. This does NOT touch `workflow.auto_advance` (the user's persistent settings preference). Must happen before any config reads (checkpoint handling also reads auto-advance flags):
```bash
if [[ ! "$ARGUMENTS" =~ --auto ]]; then
  node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-set workflow._auto_chain_active false 2>/dev/null
fi
```
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

<step name="discover_and_route_plans">
Load plan inventory and assign executor routing:

```bash
PLAN_INDEX=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
```

Parse JSON for: `phase`, `plans[]` (each with `id`, `wave`, `autonomous`, `objective`, `files_modified`, `task_count`, `has_summary`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

**Filtering:** Skip plans where `has_summary: true`. If `--gaps-only`: also skip non-gap_closure plans. If all filtered: "No matching incomplete plans" → exit.

**Executor routing (per plan):**

For each incomplete plan, determine executor type:
- If `CS_AVAILABLE` is false: all plans use `task` (fallback)
- If `task_count > CS_TASK_THRESHOLD` OR `files_modified count > CS_FILES_THRESHOLD`: executor = `cs-spawn`
- Otherwise: executor = `task`

When `parallelization` is false: `MAX_CONCURRENT` = 1 (sequential override).

**Initialize eager execution state:**
- `READY` = plans from wave 1 (no unresolved dependencies)
- `ACTIVE` = {} (map: planId → {type, status})
- `COMPLETED` = empty set
- `FAILED` = empty set
- `ALL_PLANS` = full plan list with routing and depends_on metadata

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans, {wave_count} waves, eager advancement enabled

| Wave | Plan | Executor | What it builds |
|------|------|----------|----------------|
| 1 | 01-01 | Task | {objective, 3-8 words} |
| 1 | 01-02 | cs-spawn | {objective, 3-8 words} |
| 2 | 01-03 | Task | {objective, 3-8 words} |

{If CS_AVAILABLE is false:}
Note: Claude Squad not found — all plans routed to Task()
```
</step>

<step name="eager_execution_loop" depends_on="discover_and_route_plans">

Execute plans using eager slot filling. Plans start as soon as their dependencies resolve — no waiting for wave boundaries.

**Executor prompt (shared by Task and cs-spawn):**

```
<objective>
Execute plan {plan_number} of phase {phase_number}-{phase_name}.
Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
@$HOME/.claude/get-shit-done/references/checkpoints.md
@$HOME/.claude/get-shit-done/references/tdd.md
</execution_context>

<files_to_read>
Read these files at execution start using the Read tool:
- {phase_dir}/{plan_file} (Plan)
- .planning/STATE.md (State)
- .planning/config.json (Config, if exists)
- ./CLAUDE.md (Project instructions, if exists — follow project-specific guidelines and coding conventions)
- .claude/skills/ or .agents/skills/ (Project skills, if either exists — list skills, read SKILL.md for each, follow relevant rules during implementation)
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
WHILE READY is not empty OR ACTIVE is not empty:

  1. FILL SLOTS — While ACTIVE.size < MAX_CONCURRENT AND READY is not empty:
     plan = READY.next()
     routing = ALL_PLANS[plan].executor

     Describe what's being built (BEFORE spawning):
     Read plan's <objective>. Display:
     ---
     **{Plan ID}: {Plan Name}**
     {2-3 sentences: what this builds, technical approach, why it matters}
     Spawning via {routing}...
     ---

     - Bad: "Executing terrain generation plan"
     - Good: "Procedural terrain generator using Perlin noise — creates height maps, biome zones, and collision meshes. Required before vehicle physics can interact with ground."

     IF routing == "cs-spawn":
       Spawn via Claude Squad:
       ```bash
       cs spawn --name "gsd-${PHASE_NUMBER}-${PLAN_ID}" \
         --prompt "<executor_prompt>" \
         --dir "$(pwd)"
       ```
       Add to ACTIVE as {type: 'cs-spawn', status: 'running'}

     IF routing == "task":
       Spawn via Task:
       ```
       Task(
         subagent_type="gsd-executor",
         model="{executor_model}",
         prompt="<executor_prompt>"
       )
       ```
       Add to ACTIVE as {type: 'task', status: 'running'}

     NOTE: Task() agents in the same fill cycle are spawned as parallel Task() calls in a single message.
     cs-spawn agents are spawned via sequential Bash calls (they return immediately).

  2. WAIT FOR COMPLETION:

     For Task() agents: they block until completion (Claude Code handles this natively).

     For cs-spawn agents: poll for SUMMARY.md existence:
       ```bash
       # Find worktree path
       CS_INFO=$(cs list --json 2>/dev/null)
       WORKTREE=$(printf '%s\n' "$CS_INFO" | jq -r '.[] | select(.name=="gsd-'${PHASE_NUMBER}'-'${PLAN_ID}'") | .worktree')
       # Check completion
       test -f "${WORKTREE}/${PHASE_DIR}/${PLAN_ID}-SUMMARY.md"
       ```
       Poll interval: 5 seconds. Timeout: 30 minutes.

     When mixing both types: Task() agents complete first (blocking), then poll cs-spawn agents.

  3. ON PLAN COMPLETION (planId):

     a. Spot-check:
        - SUMMARY.md exists in plan directory?
        - `git log --oneline --all --grep="{phase}-{plan}"` returns >= 1 commit?
        - No "## Self-Check: FAILED" marker?

     b. classifyHandoffIfNeeded false-failure workaround:
        If agent reports failure with "classifyHandoffIfNeeded" error → run spot-checks anyway.
        If spot-checks PASS → treat as successful.

     c. IF cs-spawn agent: MERGE and CLEANUP
        ```bash
        git merge --no-ff "gsd-${PHASE_NUMBER}-${PLAN_ID}"
        ```
        IF merge conflict → present conflict to user via AskUserQuestion:
          - "Resolve manually and continue"
          - "Skip this plan"
          - "Stop execution"
        IF merge success:
        ```bash
        cs kill "gsd-${PHASE_NUMBER}-${PLAN_ID}"
        ```

     d. Report completion:
        ---
        **{Plan ID}: {Plan Name}** — Complete {via Task/cs-spawn}
        {What was built — from SUMMARY.md}
        {Notable deviations, if any}
        {Newly unblocked plans, if any}
        ---

        - Bad: "Plan complete. Proceeding."
        - Good: "Terrain system complete — 3 biome types, height-based texturing, physics collision meshes. Vehicle physics (plans 01-03, 01-04) now unblocked."

     e. IF spot-check PASS:
        Add planId to COMPLETED.
        Check ALL_PLANS for plans whose depends_on are now fully in COMPLETED.
        Add newly unblocked plans to READY (regardless of wave number — eager advancement).

     f. IF spot-check FAIL:
        Add planId to FAILED.
        Mark plans that ONLY depend on this failed plan as blocked-by-failure.
        Ask user via AskUserQuestion:
          - "Retry this plan"
          - "Skip and continue"
          - "Stop execution"
        Retry → add back to READY.
        Skip → continue loop.
        Stop → exit loop.

  4. TERMINATION:
     All plans in COMPLETED or FAILED → exit loop.
     READY empty AND ACTIVE empty AND blocked plans remain → deadlock:
       Report: "Deadlock: plans {X} blocked by failed plans {Y}"
       Ask user what to do.
```

**Checkpoint plans (autonomous=false):** Handled via `<checkpoint_handling>` step (unchanged). When a checkpoint agent returns structured state, present to user and spawn fresh continuation agent.

</step>

<step name="checkpoint_handling">
Plans with `autonomous: false` require user interaction.

**Auto-mode checkpoint handling:**

Read auto-advance config (chain flag + user preference):
```bash
AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
```

When executor returns a checkpoint AND (`AUTO_CHAIN` is `"true"` OR `AUTO_CFG` is `"true"`):
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
PARENT_INFO=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" find-phase "${PARENT_PHASE}" --raw)
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
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-${PARENT_PHASE}): resolve UAT gaps and debug sessions after ${PHASE_NUMBER} gap closure" --files .planning/phases/*${PARENT_PHASE}*/*-UAT.md .planning/debug/resolved/*.md
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
COMPLETION=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" phase complete "${PHASE_NUMBER}")
```

The CLI handles:
- Marking phase checkbox `[x]` with completion date
- Updating Progress table (Status → Complete, date)
- Updating plan count to final
- Advancing STATE.md to next phase
- Updating REQUIREMENTS.md traceability

Extract from result: `next_phase`, `next_phase_name`, `is_last_phase`.

```bash
node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" commit "docs(phase-{X}): complete phase execution" --files .planning/ROADMAP.md .planning/STATE.md .planning/REQUIREMENTS.md {phase_dir}/*-VERIFICATION.md
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
2. Read both the chain flag and user preference (chain flag already synced in init step):
   ```bash
   AUTO_CHAIN=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow._auto_chain_active 2>/dev/null || echo "false")
   AUTO_CFG=$(node "$HOME/.claude/get-shit-done/bin/gsd-tools.cjs" config-get workflow.auto_advance 2>/dev/null || echo "false")
   ```

**If `--auto` flag present OR `AUTO_CHAIN` is true OR `AUTO_CFG` is true (AND verification passed with no gaps):**

```
╔══════════════════════════════════════════╗
║  AUTO-ADVANCING → TRANSITION             ║
║  Phase {X} verified, continuing chain    ║
╚══════════════════════════════════════════╝
```

Execute the transition workflow inline (do NOT use Task — orchestrator context is ~10-15%, transition needs phase completion data already in context):

Read and follow `$HOME/.claude/get-shit-done/workflows/transition.md`, passing through the `--auto` flag so it propagates to the next phase invocation.

**If neither `--auto` nor `AUTO_CFG` is true:**

The workflow ends. The user runs `/gsd:progress` or invokes the transition workflow manually.
</step>

</process>

<context_efficiency>
Orchestrator: ~10-15% context. Subagents: fresh 200k each. Task() agents block natively. cs-spawn agents polled via SUMMARY.md existence (5s interval). No context bleed. Eager advancement minimizes idle wait between waves.
</context_efficiency>

<failure_handling>
- **classifyHandoffIfNeeded false failure:** Agent reports "failed" but error is `classifyHandoffIfNeeded is not defined` → Claude Code bug, not GSD. Spot-check (SUMMARY exists, commits present) → if pass, treat as success
- **Agent fails mid-plan:** Missing SUMMARY.md → report, ask user how to proceed
- **cs-spawn merge conflict:** Present conflict details to user, offer manual resolve / skip / stop
- **cs-spawn not found:** Fallback all plans to Task() with warning at start
- **cs-spawn timeout (30min):** Report plan as potentially hung, offer: wait longer / kill and retry / skip
- **Dependency chain breaks:** Failed plan → dependent plans blocked → user chooses attempt or skip
- **All agents fail:** Systemic issue → stop, report for investigation
- **Deadlock detected:** READY empty, ACTIVE empty, blocked plans remain → report blocked plan graph, ask user
- **Checkpoint unresolvable:** "Skip this plan?" or "Abort phase execution?" → record partial progress in STATE.md
</failure_handling>

<resumption>
Re-run `/gsd:execute-phase {phase}` → discover_plans finds completed SUMMARYs → skips them → resumes from first incomplete plan → continues wave execution.

STATE.md tracks: last completed plan, current wave, pending checkpoints.
</resumption>
