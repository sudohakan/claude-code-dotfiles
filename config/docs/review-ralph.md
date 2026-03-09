# Review Tool Selection Table

| Situation | Tool | Reason |
|-----------|------|--------|
| PR created, pre-merge review | `code-review:code-review` | Diff-based review in PR context |
| End-of-phase quality check | `superpowers:requesting-code-review` | Architecture alignment + plan conformance |
| Quick in-wave check (agent output) | `feature-dev:code-reviewer` | Single module, bug/logic focused |
| UI component delivery | `superpowers:requesting-code-review` | Includes design + accessibility |

**Rule:** If one review tool passes, do not run a second one on the same changes — unnecessary repetition.

---

# Ralph Usage Rules

**Trigger Checklist — all 5 conditions must be met:**
1. Success criteria can be expressed in a single sentence → **YES = continue**
2. Verification can be automated (test, lint, build) → **YES = continue**
3. Maximum iterations are predictable (typically 3-5) → **YES = continue**
4. Does it require a design decision? → **NO = continue**, if yes don't use Ralph
5. Does it require user approval? → **NO = continue**, if yes don't use Ralph

**Suitable task examples:** "all tests pass", "lint error-free", "build succeeds", "fix type errors"
**Not suitable:** "improve UI", "refactor architecture", "design new feature"

**Required parameters:**
- `--completion-promise` → what will be achieved (e.g., "all tests pass")
- `--max-iterations` → upper limit (default: 5, max: 10)
