<!-- last_updated: 2026-03-24 -->
# Decision Table + Integration Matrix

## Main Routing Table

| What Did the User Ask? | GSD Flow | Skill / Tool | Ralph |
|---|---|---|---|
| New project / application | `new-project` → full cycle | brainstorming (required) | — |
| New feature / module | `discuss` → `plan` → `execute` → `verify` | writing-plans | — |
| "Fix/add/change this" | `quick` | verification (required) | — |
| There's a bug, why? | `debug` | systematic-debugging | Optional |
| Write / design UI | UI/UX Pro Max flow | — | — |
| During execute-phase | wave-based execution | TDD + verification | Optional |
| End of each phase | — | requesting-code-review | — |
| Research / explore codebase | — | Agent tool (Explore) | — |
| Research / explore external | — | WebSearch + Context7 | — |
| 2+ independent tasks (outside GSD) | `dispatching-parallel-agents` | — | — |

## Model Selection

| Task Type | Model |
|---|---|
| Read-only research, exploration, file scanning | `haiku` |
| Standard coding, writing, editing | `sonnet` (default) |
| Agent team members | `sonnet`; escalate to opus on request |
| Complex architecture, multi-system reasoning | `opus` |

## Research Tasks

### Codebase (internal)
1. Scan with Agent tool (patterns, file structure, dependencies)
2. Grep/Glob for specific searches
3. Present as structured summary

### External (web/documentation)
1. Fetch docs with Context7
2. Search with WebSearch
3. WebFetch for details if needed
4. Summarize with sources
