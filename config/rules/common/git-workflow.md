# Git Workflow

## Commit Message Format
```
<type>: <description>

<optional body>
```
Types: feat, fix, refactor, docs, test, chore, perf, ci

Attribution disabled globally via `~/.claude/settings.json`.

## Pull Request Workflow
1. Analyze full commit history (not just latest commit)
2. `git diff [base-branch]...HEAD` to see all changes
3. Draft PR using the standard format below
4. Push with `-u` flag if new branch

### Finekra PR Format (reference: ParaticTransactionV2 PR #4024)

Applies only to repos under `source/repos/Finekra/`.

Title: `Task-{DevOpsId}: {short Turkish description}`
Branch: `Task-{DevOpsId}`

Body (markdown):
```
## Sorun
{Problem description}

## Çözüm
{What changed — file:line, approach}

## Test
{How verified}

## DevOps
[#{id}](https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id})
```

For features: "Sorun" -> "Amaç", "Çözüm" -> "Değişiklikler".

### Other Projects — Standard PR Format

Use generic summary + test plan format (GitHub style).

For the full development process before git operations, see `development-workflow.md`.
