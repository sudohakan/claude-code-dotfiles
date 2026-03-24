---
name: gsd:auto-phase
description: Automated plan + execute + verify cycle for one or more phases
argument-hint: "<phase> or <start-end> (e.g., 4 or 4-9)"
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - Task
  - TodoWrite
  - AskUserQuestion
  - WebFetch
  - mcp__context7__*
---
<objective>
Run the full GSD cycle (plan -> execute -> verify) automatically for one or more phases.

Supports:
- Single phase: `/gsd:auto-phase 4` — runs plan, execute, verify for phase 4
- Range: `/gsd:auto-phase 4-9` — runs the full cycle for each phase sequentially (4, then 5, then ... 9)

After each phase completes, moves to the next. No manual intervention needed between steps.
If verify finds issues, automatically runs gap closure (plan --gaps -> execute --gaps-only) before moving on.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/plan-phase.md
@./.claude/get-shit-done/workflows/execute-phase.md
@./.claude/get-shit-done/workflows/verify-work.md
@./.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Input: $ARGUMENTS

Parse the input:
- Single number (e.g., `4`) -> run cycle for that phase only
- Range (e.g., `4-9`) -> run cycle for phases 4, 5, 6, 7, 8, 9 sequentially

**State files:**
- `.planning/ROADMAP.md` — phase definitions
- `.planning/STATE.md` — current project state
- `.planning/config.json` — workflow config
</context>

<process>
## Step 1: Parse Input

Parse `$ARGUMENTS` to determine phase(s):
- If format is `N` (single number): phases = [N]
- If format is `N-M` (range): phases = [N, N+1, ..., M]
- Validate all phase numbers exist in ROADMAP.md

Read `.planning/ROADMAP.md` and `.planning/STATE.md` for context.

## Step 2: Phase Loop

For each phase in the list:

### 2a: Check if already complete
- Read `.planning/STATE.md`
- If phase is already marked complete, skip it and print: `Phase {N} already complete, skipping.`

### 2b: Plan
- Check if `.planning/phases/{phase_dir}/` already has PLAN.md files
- If no plans exist: invoke the plan-phase workflow from @./.claude/get-shit-done/workflows/plan-phase.md for this phase
- If plans already exist: skip planning, print: `Phase {N} already planned, skipping to execute.`

### 2c: Execute
- Check if all plans have corresponding SUMMARY.md files (indicating completion)
- If not all executed: invoke the execute-phase workflow from @./.claude/get-shit-done/workflows/execute-phase.md for this phase
- If all already executed: skip, print: `Phase {N} already executed, skipping to verify.`

### 2d: Verify
- Invoke the verify-work workflow from @./.claude/get-shit-done/workflows/verify-work.md for this phase
- If verification passes: mark phase complete, continue to next phase
- If verification finds issues:
  1. Run plan-phase with `--gaps` flag to create fix plans
  2. Run execute-phase with `--gaps-only` flag to execute fixes
  3. Re-verify (max 2 gap closure iterations)
  4. If still failing after 2 iterations: report issues and stop

### 2e: Phase Complete
- Print phase completion summary
- If more phases remain: continue loop
- If this was the last phase: print final summary

## Step 3: Final Summary

Print a summary table showing all phases processed:
```
Phase | Plan | Execute | Verify | Status
------|------|---------|--------|-------
  4   | done |  done   |  pass  | complete
  5   | done |  done   |  pass  | complete
  ...
```

Update `.planning/STATE.md` with final state.
</process>
