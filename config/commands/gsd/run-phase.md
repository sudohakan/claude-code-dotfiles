---
name: gsd:run-phase
description: Plan + execute a phase in one step (no verify)
argument-hint: "<phase-number>"
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
Run plan + execute for a single phase without verification. Use when you want to quickly build a phase and verify manually later.

`/gsd:run-phase 4` is equivalent to running `/gsd:plan-phase 4` followed by `/gsd:execute-phase 4`, but in a single command.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/plan-phase.md
@./.claude/get-shit-done/workflows/execute-phase.md
@./.claude/get-shit-done/references/ui-brand.md
</execution_context>

<context>
Phase: $ARGUMENTS

**State files:**
- `.planning/ROADMAP.md` — phase definitions
- `.planning/STATE.md` — current project state
- `.planning/config.json` — workflow config
</context>

<process>
## Step 1: Validate

- Parse `$ARGUMENTS` as a single phase number
- Read `.planning/ROADMAP.md` — validate phase exists
- Read `.planning/STATE.md` — check phase is not already complete
- If already complete: inform user and stop

## Step 2: Plan

- Check if `.planning/phases/{phase_dir}/` already has PLAN.md files
- If no plans exist: invoke the plan-phase workflow from @./.claude/get-shit-done/workflows/plan-phase.md
- If plans already exist: skip planning, print: `Phase {N} already planned, skipping to execute.`

## Step 3: Execute

- Check if all plans have corresponding SUMMARY.md files
- If not all executed: invoke the execute-phase workflow from @./.claude/get-shit-done/workflows/execute-phase.md
- If all already executed: inform user everything is already built

## Step 4: Summary

Print completion summary:
- Plans created/skipped
- Execution results
- Remind user: `Run /gsd:verify-work {N} to validate the build.`

Update `.planning/STATE.md` with current state.
</process>
