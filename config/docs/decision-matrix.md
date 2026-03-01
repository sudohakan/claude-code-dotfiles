# Decision Table + Integration Matrix

## Main Routing Table

| What Did the User Ask? | GSD Flow | Superpowers | Ralph |
|---|---|---|---|
| New project / application | `new-project` → full cycle | brainstorming (REQUIRED) | — |
| New feature / module | `discuss` → `plan` → `execute` → `verify` | writing-plans | — |
| "Fix/add/change this" | `quick` | verification (REQUIRED) | — |
| There's a bug, why? | `debug` | systematic-debugging | Optional |
| Write / design UI | UI/UX Pro Max flow | — | — |
| During execute-phase | wave-based execution | TDD + verification | Optional |
| End of each phase | — | requesting-code-review | — |
| Research / learn / explore (codebase) | — | Explore agent | — |
| Research / learn / explore (external source) | — | WebSearch + Context7 | — |
| 2+ independent tasks (outside GSD) | `dispatching-parallel-agents` skill | — | — |

## Research Task

GSD and commit are not required. Two types of research flows:

### Codebase research (internal)
1. Scan codebase with Explore agent (patterns, file structure, dependencies)
2. Use Grep/Glob for specific searches if needed
3. Present result as a structured summary

### External research (web/documentation)
1. Fetch library/framework documentation with Context7
2. Search for current information with WebSearch
3. Get details with WebFetch if needed
4. Summarize result along with sources
