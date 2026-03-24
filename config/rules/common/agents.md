# Agent Orchestration

## Available Agents
Located in `~/.claude/agents/`:

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code review | After writing code |
| security-reviewer | Security analysis | Before commits |
| build-error-resolver | Fix build errors | Build fails |
| e2e-runner | E2E testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation | Updating docs |
| rust-reviewer | Rust code review | Rust projects |

## Immediate Agent Usage
No user prompt needed:
- Complex feature → planner
- Code just written/modified → code-reviewer
- Bug fix or new feature → tdd-guide
- Architectural decision → architect

## Parallel Task Execution
Always run independent agent tasks in parallel, not sequentially.

## Multi-Perspective Analysis
For complex problems, use split-role subagents: factual reviewer, senior engineer, security expert, consistency reviewer, redundancy checker.
