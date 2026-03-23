# Create DevOps Item — From Infoset Ticket or Manual Description

Create an Azure DevOps work item (Bug or Task) with full context, assign it, estimate effort, and link to Infoset if applicable.

## Usage

```
/create-devops-item <infoset-id>
/create-devops-item <infoset-id> --type Task
/create-devops-item --manual "TTB banka ekleme validasyonu eksik"
```

- Bare number → fetch Infoset ticket, extract context, create DevOps item
- `--type Bug|Task` → override auto-detection (default: auto-detect from content)
- `--manual "description"` → create without Infoset link

## Arguments

Parse `$ARGUMENTS`:
- First arg is number → Infoset ticket ID
- `--type Bug|Task` → work item type override
- `--manual "text"` → manual description (no Infoset fetch)
- `--sprint SprintN` → override sprint (default: current)
- `--priority 1-4` → override priority (default: auto)
- `--severity "1 - Critical"|"2 - High"|"3 - Medium"|"4 - Low"` → override severity
- `--effort N` → override effort hours (default: auto-estimate)
- `--area "Fin_Dev26\Module"` → override area path (default: Fin_Dev26)

## Execution Flow

### Step 1: Gather Context

**If Infoset ID provided:**
1. Fetch ticket via `mcp__infoset__infoset_get_ticket`
2. Fetch ticket logs via `mcp__infoset__infoset_get_ticket_logs` (last 10)
3. Fetch company via `mcp__infoset__infoset_get_company`
4. Extract: subject, description, customer name, module, conversation summary
5. Analyze ticket content to determine Bug vs Task

**If --manual:**
1. Use provided description as context
2. Ask user for any missing critical info (customer, module)

### Step 2: Analyze & Classify

**Auto-detect work item type:**
- Bug signals: "hata", "çalışmıyor", "bozuk", "yanlış", error reports, regression
- Task signals: "ekle", "geliştir", "yeni", "güncelle", feature request, enhancement

**Auto-detect area path from content:**
- Parse for module keywords: TÖS, POS, B2B, ERP, Panel, Transaction, DBS, Operation, HHS
- Map to area path (e.g., "TÖS" → "Fin_Dev26\TÖS")
- Default: "Fin_Dev26" if no module detected

**Auto-estimate effort:**
- Analyze scope and complexity from ticket content
- Use effort estimation guide from work-sync skill
- Range: 0.5h - 8h

**Auto-detect priority/severity:**
- From Infoset priority + content analysis
- Urgent/ACIL keywords → Priority 1, Severity "1 - Critical"
- Customer blocked → Priority 1, Severity "2 - High"
- Normal bug → Priority 2, Severity "2 - High"
- Enhancement → Priority 3, Severity "3 - Medium"

### Step 3: Build Repro Steps (for Bugs)

Generate HTML repro steps with this structure:

```html
<h3>Sorun</h3>
<p>{Problem description in Turkish}</p>

<h3>Kök Neden</h3>
<p>{Root cause if identified from code analysis, otherwise "İnceleme gerekli"}</p>
<p>Dosya: <code>{file path if known}</code></p>

<h3>Repro Adımları</h3>
<ol>
<li>{Step 1}</li>
<li>{Step 2}</li>
</ol>

<h3>Beklenen Davranış</h3>
<p>{Expected behavior}</p>

<h3>Gerçekleşen Davranış</h3>
<p>{Actual behavior}</p>

<h3>Etki</h3>
<p>{Impact — who is affected, how severe}</p>

<h3>Çözüm Önerisi</h3>
<p>{Proposed fix if known}</p>

<h3>Infoset</h3>
<p><a href="https://dashboard.infoset.app/tickets/{id}">#{id}</a></p>
```

For Tasks, use `System.Description` instead with a similar but simpler structure.

### Step 4: Get Azure DevOps Token

```bash
az account get-access-token --resource "499b84ac-1321-427f-aa17-267ca6975798" --query accessToken -o tsv
```

### Step 5: Get Current Sprint

```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/work/teamsettings/iterations?$timeframe=current&api-version=7.1
```

Extract iteration path (e.g., `Fin_Dev26\Sprint6`).

### Step 6: Create Work Item

```
POST https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/$Bug?api-version=7.1
Authorization: Bearer {token}
Content-Type: application/json-patch+json

[
  {"op":"add","path":"/fields/System.Title","value":"{title}"},
  {"op":"add","path":"/fields/System.AssignedTo","value":"Hakan Topçu"},
  {"op":"add","path":"/fields/System.IterationPath","value":"{sprint}"},
  {"op":"add","path":"/fields/System.AreaPath","value":"{areaPath}"},
  {"op":"add","path":"/fields/System.State","value":"New"},
  {"op":"add","path":"/fields/Microsoft.VSTS.Common.Priority","value":{priority}},
  {"op":"add","path":"/fields/Microsoft.VSTS.Common.Severity","value":"{severity}"},
  {"op":"add","path":"/fields/Custom.EstimateTime","value":{effort}},
  {"op":"add","path":"/fields/Microsoft.VSTS.TCM.ReproSteps","value":"{reproStepsHtml}"}
]
```

For Tasks, use `$Task` instead of `$Bug`, and `System.Description` instead of `ReproSteps`.

**Title format:**
- Bug: `{Customer/Module} - {short problem description}`
- Task: `{Customer/Module} - {short feature description}`

### Step 7: Add Infoset Link as Comment

If Infoset ID was provided, add a comment for work-sync matching:

```
POST https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
Authorization: Bearer {token}
Content-Type: application/json

{"text":"Infoset ticket: https://dashboard.infoset.app/tickets/{infosetId}"}
```

### Step 8: Report

Display created item:

```
DevOps #{id} oluşturuldu
Başlık: {title}
Tip: Bug/Task | Sprint: {sprint} | Öncelik: {priority} | Efor: {effort}s
Atanan: Hakan Topçu
Infoset: #{infosetId} (bağlantılı)
URL: https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id}
```

## Azure DevOps Reference

- **Organization:** `polynomtech.visualstudio.com`
- **Project:** `Fin_Dev26`
- **API Version:** 7.1
- **Auth:** `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798`
- **Work Item URL:** `https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id}`
- **Bug endpoint:** `$Bug` | **Task endpoint:** `$Task`

## Rules

1. Always assign to "Hakan Topçu" unless `--assign` specified
2. Always add Infoset link both in ReproSteps/Description AND as a comment (for work-sync matching)
3. Title in Turkish, concise, starts with customer or module name
4. ReproSteps in Turkish with proper HTML formatting
5. Never create duplicate — check if a DevOps item already exists for this Infoset ticket first (search comments for the Infoset URL)
6. Effort estimation: use DevOps `Custom.EstimateTime` field (hours as decimal)
