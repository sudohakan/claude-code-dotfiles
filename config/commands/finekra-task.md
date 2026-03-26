# Finekra Task — Work Item Investigation & Execution

Fetch a task from Azure DevOps or Infoset, analyze what's needed, find the right project/branch, and execute or report.

## Usage

```
/finekra-task <id>
/finekra-task Task-13473
/finekra-task #12345
/finekra-task 13473
```

- `Task-XXXXX` prefix → Azure DevOps kesin
- `#XXXXX` prefix → Infoset kesin
- Bare number → **her ikisinde de paralel ara**, bulunan kaynağı kullan. İkisinde de bulunursa ikisini de göster.

## Execution Flow

### Step 1: Identify Source & Fetch Work Item

**If source is ambiguous (bare number):**
1. Try Azure DevOps AND Infoset in parallel
2. If found in both → present both to user, ask which one to work on
3. If found in only one → use that source
4. If found in neither → inform user

**Azure DevOps (REST API — NOT CLI, avoids encoding issues):**

First get a Bearer token:
```bash
az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv
```

Then fetch work item with full details:
```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}?$expand=all&api-version=7.1
Authorization: Bearer {token}
```

Also fetch comments for cross-reference:
```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}/comments?$top=200&api-version=7.1-preview.4
Authorization: Bearer {token}
```

Extract: id, title, state, type, description, assignedTo, areaPath, iterationPath, tags, acceptanceCriteria, **reproSteps** (`Microsoft.VSTS.TCM.ReproSteps`), **history** (`System.History`), comments.

**Critical fields to ALWAYS check:**
- `Microsoft.VSTS.TCM.ReproSteps` — Repro Steps (often contains the actual requirement details)
- `System.Description` — Description
- `Microsoft.VSTS.Common.AcceptanceCriteria` — Acceptance Criteria
- `System.History` — Discussion/History entries

**Attachments & inline images (MANDATORY — both DevOps and Infoset):**

DevOps:
- Parse reproSteps, description, and comments for `<img src="...">` tags
- Extract image URLs matching `_apis/wit/attachments/{guid}`
- Download each image with Bearer token: `curl -s -H "Authorization: Bearer {token}" "{url}" -o /tmp/task-{id}-{index}.png`

Infoset:
- Parse ticket description, comments, and logs for image URLs or attachment references
- Download any linked images/screenshots from Infoset ticket content

Both:
- Read and analyze EVERY downloaded image — they often contain screenshots showing the exact bug, expected behavior, or UI reference
- NEVER skip image analysis — visual context is critical for understanding the task

**Infoset:**
Use `infoset_get_ticket` MCP tool with the ticket ID. Extract: subject, description, status, assignee, tags, comments.

**Cross-reference:**
- In DevOps comments, search for `dashboard.infoset.app/tickets/(\d+)` → linked Infoset ticket
- In Infoset ticket, search for `Task-(\d+)` or DevOps URLs → linked DevOps item
- If cross-reference found, fetch the linked item too for full context

### Step 2: Analyze & Classify

Read the work item thoroughly and classify:

| Classification | Signals | Action |
|---------------|---------|--------|
| **Bug fix** | Type=Bug, error reports, "düzelt", "çalışmıyor", "hata" | Find code, diagnose, fix |
| **Feature/Enhancement** | Type=Task/Feature, "ekle", "geliştir", "yeni", "güncelle" | Understand scope, implement |
| **Analysis/Info** | "araştır", "kontrol et", "incele", "neden", "rapor" | Research, report findings to user |
| **Configuration** | "ayarla", "konfigür", "değiştir", deployment-related | Apply config changes |
| **Already done** | Work already completed in a previous session | Verify and inform user |

Present the classification and a brief summary to the user before proceeding.

### Step 3: Find Project & Branch

**Determine which Finekra project(s) are involved:**
- Use `areaPath` from Azure DevOps to map to a project (areaPath format: `Fin_Dev26\<Module>`)
- Parse title/description for project hints (TÖS, POS, B2B, Panel, Operation, ERP, etc.)
- Check all relevant repos for a branch matching `Task-<ID>`

**Area path → Project mapping:**

| Area Path Contains | Primary Repo |
|-------------------|--------------|
| TÖS, Tos | Backend/Paratic-Platinum + Frontend/Paratic-Platinum-React |
| POS, Pos | Backend/Paratic-Pos-Transaction |
| DBS, Dbs | Backend/Paratic-Dbs-Transaction |
| B2B | Frontend/Paratic-B2B-React + Backend/Paratic-Platinum |
| Operation | Frontend/Paratic-Operation-React + Backend/Paratic-Platinum |
| ERP, Mikro, Logo, Netsis | Backend/Paratic-Platinum (ERP modules) or Backend/Finekra-Logo |
| Panel, Platinum, Cloud | Frontend/Paratic-Platinum-React + Backend/Paratic-Platinum |
| Transaction, Hareket | Backend/ParaticTransactionV2 |
| HHS, BKM | Backend/Finekra-HHS |

**Branch search:**
```bash
# Check each relevant repo for task branch
cd <repo> && git.exe fetch --all && git.exe branch -r | grep -i "Task-<ID>"
```

If task branch found → checkout. If not → determine environment before creating:

**Environment detection (critical for branch strategy):**
- Check work item title, description, reproSteps, tags, and areaPath for any customer name, company name, or environment identifier
- Search existing remote branches for customer-specific branches: `git.exe branch -r` — look for branches that match any entity mentioned in the work item
- **No customer/environment mentioned** → cloud, create `Task-<DevOpsID>` from master
- **Branch naming:** ALWAYS use DevOps task ID (`Task-XXXXX`), never Infoset ticket ID. If work item originated from Infoset, a DevOps task must be created first and its ID used for the branch name.
- **Customer/environment mentioned** → find that customer's most recent branch and work there
- **Ambiguous** → ASK user which environment before proceeding
- NEVER assume cloud by default — wrong branch = wrong deployment target

### Step 4: Execute

Based on classification:

**Bug fix / Feature:**
1. Set DevOps task state to **Active** before starting work
2. Read related code files based on work item description
3. Understand the problem or requirement
4. Present findings and proposed approach to user
5. Wait for user confirmation
6. Implement the fix/feature
6. Verify the change (build, review)
7. Run `/code-review:code-review` to review the changes
8. Fix any critical/high findings
9. Inform user — do NOT commit unless asked
10. If testable: deploy to test, set state to **Test**, add discussion comment with:
    - Plain Turkish explanation of what was done (no technical jargon)
    - Test environment URL
    - Which screen/module to test (NOT step-by-step instructions — tester decides how to test)

**Analysis / Info:**
1. Research the topic in the codebase
2. Check logs, configs, database schemas if relevant
3. Present findings to user with evidence
4. Suggest next steps if applicable

**Already done:**
1. Show evidence (commit, code state)
2. Confirm with user

### Step 4.5: PR (after commit & push)

After commit and push, if work is on a separate task branch, create a PR:

**IMPORTANT:** Do NOT use `az repos pr create` CLI — it corrupts Turkish characters (ö→o, ş→s, ü→u, etc.). Always use REST API:

```bash
# Step 1: Create PR via REST API (preserves Turkish chars)
TOKEN=$(az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv)
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "https://polynomtech.visualstudio.com/<project>/_apis/git/repositories/<repo>/pullrequests?api-version=7.1" \
  -d '{"sourceRefName":"refs/heads/Task-<ID>","targetRefName":"refs/heads/<target>","title":"<Turkish title>","description":"<Turkish desc>","workItemRefs":[{"id":"<DevOpsID>"}],"labels":[{"name":"<project-tag>"}]}'
```

**PR Rules:**
- **Target branch:** master for cloud, customer branch for on-premise
- **Title:** Same as commit message (Turkish, single sentence)
- **Work Items:** Link the DevOps task ID
- **Tags/Labels:** Project name (e.g., "Finekra-Logo", "Paratic-Platinum", "Paratic-Platinum-React")
- **Required reviewers (3):** Add via PUT `_apis/git/repositories/{repo}/pullRequests/{id}/reviewers/{userId}` with `{"vote":0,"isRequired":true}`
  - Anıl Karayurt: `a96c7024-4d8c-6b52-8603-6206f8ae2261`
  - Hüseyin Keskin: `7c958b17-0556-6788-9de1-a00e7b687616`
  - Koray Kavruk: `69f508e4-e635-6ba2-9e29-42b96e4db4aa`
- **Optional reviewers** (not all projects accessible to them, add with `"isRequired":false`):
  - Burak Biçkioğlu: `793f1d07-a40d-4951-a188-a6f2947443f4`
  - Kemal Erol: `f657daa6-8400-4b21-9c5c-c3416ffa770c`
- **PR is optional** — user decides whether to create one. Some work goes directly to the target branch.
- **After PR:** Add a comment to the DevOps work item discussion explaining what was done in plain Turkish — no technical jargon, understandable by non-technical people (analysts, testers, managers). Use REST API with `-d` and single-quoted JSON to preserve Turkish chars:
  ```bash
  curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4" \
    -d '{"text":"<Türkçe açıklama>"}'
  ```
- **Turkish character rule:** NEVER use `az` CLI for creating PRs, comments, or any text content — it corrupts Turkish characters. Always use REST API with `curl` and single-quoted JSON body.

### Step 5: DevOps Task Management

Every task MUST have a corresponding DevOps work item with all fields properly filled. If one doesn't exist, create it (see Step 1). Throughout the workflow, keep the work item updated.

**Required fields on every DevOps task:**

| Field | API Path | How to determine |
|-------|----------|-----------------|
| Title | `System.Title` | Clear Turkish description of the work |
| Area Path | `System.AreaPath` | Module (TÖS, ERP, POS, etc.) |
| Iteration Path | `System.IterationPath` | Current sprint (e.g., `Fin_Dev26\Sprint6`) |
| Assigned To | `System.AssignedTo` | Hakan Topçu |
| State | `System.State` | See state transitions below |
| Priority | `Microsoft.VSTS.Common.Priority` | 1=Critical, 2=High, 3=Medium, 4=Low |
| Severity | `Microsoft.VSTS.Common.Severity` | For bugs: 1-Critical, 2-High, 3-Medium, 4-Low |
| Repro Steps | `Microsoft.VSTS.TCM.ReproSteps` | Detailed problem description, steps to reproduce |
| Estimate Time | `Custom.EstimateTime` | Estimated effort in hours (double) — how long a human developer would take WITHOUT AI assistance (analysis + coding + testing). NOT how long AI took. |
| Development Time | `Custom.DevelopmentTime` | Should reflect realistic human effort — close to estimate. Minor variance OK, large deviation not. |
| Tester | `Custom.Tester` | Usually the analyst who created the task. Ask user if unclear. Known testers: Hilal Arslankaya, Gülnihal Çetinkaya |
| Estimate Complete Date | TBD | Expected completion date |
| Work Item Type | `System.WorkItemType` | Bug or Task based on nature of work |

**State transitions — update as work progresses:**

| Action | Set State To |
|--------|-------------|
| Starting work | Active |
| Waiting/blocked | On Hold |
| Code done, deploying to test | Test |
| Sending to tester | Test |
| PR created | Review |
| Deploy needed | Deployment |
| Completed, in prod test | Prod Test |

**Discussion/Comments:**
- If user confirmation is needed (from Infoset), reply in the DevOps discussion
- If tester asks a question, respond in discussion
- Always keep discussion updated with progress

**Update via REST API:**
```
PATCH https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}?api-version=7.1
Authorization: Bearer {token}
Content-Type: application/json-patch+json

[
  {"op": "replace", "path": "/fields/System.State", "value": "<state>"},
  {"op": "replace", "path": "/fields/Custom.EstimateTime", "value": <hours>},
  {"op": "replace", "path": "/fields/Custom.DevelopmentTime", "value": <hours>}
]
```

## Critical Rules

1. **Always present findings before acting** — don't start coding without user alignment
2. **Never commit or push** without explicit user request
3. **Never create branches** without user request — only find and checkout existing ones
4. **Cross-reference always** — check DevOps comments for Infoset links and vice versa
5. **Stay in contact** — report progress, ask when uncertain, don't assume scope
6. **Minimal changes** — fix what's asked, nothing more
9. **Commit messages** — Finekra projects: always Turkish, single sentence, plain (no conventional commit prefixes like feat/fix)
7. **Strict scope** — NEVER make changes beyond what the work item describes. No "while I'm here" improvements, no related fixes, no refactoring. If a related issue is noticed, inform the user but do NOT fix it unless asked.
8. **Continuous improvement** — when user feedback reveals a gap in this skill (missing fields, wrong flow, etc.), update the skill file immediately, then verify the fix works before continuing the task

## Azure DevOps Reference

- **Organization:** `polynomtech.visualstudio.com`
- **Project:** `Fin_Dev26`
- **Team:** `Fin_Dev26 Team`
- **Work Item URL:** `https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id}`
- **API Base:** `https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/`
- **Use REST API** (not `az boards` CLI) to avoid Turkish encoding issues

## Infoset Reference

- Access via MCP tools: `infoset_get_ticket`, `infoset_search_tickets`, `infoset_list_tickets`
- Stage 91133 = Yazılım kolonu (user's responsibility)
- Cross-ref regex in DevOps comments: `dashboard\.infoset\.app/tickets/(\d+)`

## Notes

- Repo base path: `C:\Users\Hakan\source\repos\Finekra\`
- All DevOps REST calls need Bearer token from `az account get-access-token`
- If `az` token fetch fails → inform user to run `az login`
