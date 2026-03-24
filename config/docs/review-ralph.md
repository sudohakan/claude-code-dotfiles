<!-- last_updated: 2026-03-24 -->
# Review Tool Selection

| Situation | Tool |
|-----------|------|
| PR created, pre-merge review | `code-review:code-review` |
| End-of-phase quality check | `superpowers:requesting-code-review` |
| Quick in-wave check (agent output) | `feature-dev:code-reviewer` |
| UI component delivery | `superpowers:requesting-code-review` |

If one review tool passes, don't run a second on the same changes.

# Ralph Usage Rules

## Trigger Checklist — all 5 must be true
1. Success criteria expressible in one sentence
2. Verification can be automated (test, lint, build)
3. Max iterations predictable (typically 3-5)
4. No design decision required
5. No user approval required

Suitable: "all tests pass", "lint error-free", "build succeeds", "fix type errors"
Not suitable: "improve UI", "refactor architecture", "design new feature"

## Parameters
- `--completion-promise` — what will be achieved
- `--max-iterations` — upper limit (default: 5, max: 10)

## Invocation
Plugin: `ralph-loop@claude-plugins-official`
Skill: `ralph-loop:ralph-loop`

```
/ralph-loop:ralph-loop --completion-promise "all tests pass" --max-iterations 5
```

Ralph iterates autonomously — runs tests, fixes failures, re-runs — until promise satisfied or max iterations reached.
