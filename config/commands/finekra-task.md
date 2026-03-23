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
- **No customer/environment mentioned** → cloud, create `Task-<ID>` from master
- **Customer/environment mentioned** → find that customer's most recent branch and work there
- **Ambiguous** → ASK user which environment before proceeding
- NEVER assume cloud by default — wrong branch = wrong deployment target

### Step 4: Execute

Based on classification:

**Bug fix / Feature:**
1. Read related code files based on work item description
2. Understand the problem or requirement
3. Present findings and proposed approach to user
4. Wait for user confirmation
5. Implement the fix/feature
6. Verify the change (build, review)
7. Inform user — do NOT commit unless asked

**Analysis / Info:**
1. Research the topic in the codebase
2. Check logs, configs, database schemas if relevant
3. Present findings to user with evidence
4. Suggest next steps if applicable

**Already done:**
1. Show evidence (commit, code state)
2. Confirm with user

### Step 5: Status Update (optional)

If user asks, update the work item status via REST API:
```
PATCH https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}?api-version=7.1
Authorization: Bearer {token}
Content-Type: application/json-patch+json

[{"op": "replace", "path": "/fields/System.State", "value": "<new-state>"}]
```

## Critical Rules

1. **Always present findings before acting** — don't start coding without user alignment
2. **Never commit or push** without explicit user request
3. **Never create branches** without user request — only find and checkout existing ones
4. **Cross-reference always** — check DevOps comments for Infoset links and vice versa
5. **Stay in contact** — report progress, ask when uncertain, don't assume scope
6. **Minimal changes** — fix what's asked, nothing more
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
