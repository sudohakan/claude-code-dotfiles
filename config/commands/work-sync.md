---
description: "Work Sync — unified work synchronization: fetch Infoset CRM tickets + Azure DevOps tasks, cross-match, analyze, sync to Google Tasks (3 lists) + Calendar, generate DOCX report"
---

# Work Sync

Unified work synchronization command that fetches tasks from both Infoset CRM and Azure DevOps, performs cross-source matching and deep analysis, and syncs to Google Tasks + Calendar. Generates a DOCX report.

**Project dir:** `/mnt/c/dev/infoset-mcp`

## Modes / Aliases

Parse `$ARGUMENTS`:

| Flag | Alias | Behavior |
|------|-------|----------|
| (none) | — | Full sync: Infoset + DevOps + Analysis + Google writes + DOCX report |
| `-d` | `--devops-only` | DevOps only: skip Infoset fetch, analyze + sync DevOps tasks only |
| `-i` | `--infoset-only` | Infoset only: behaves exactly like old `/infoset-sync` (4 canonical slots) |
| `-r` | `--report-only` | Full pipeline, generate DOCX report, but skip ALL Google writes (Tasks + Calendar). For analysis without side effects. |
| `-h` | `--help` | Show usage help and alias descriptions |
| `--status` | — | Show last sync status from status.json |
| `--clean` | — | Clean mode: remove orphaned tasks/events from all 3 lists |
| `--dry-run` | — | Full pipeline + Google writes, but show diff table first (NEW/UPDATED/CLOSED counts per source) and ask for confirmation before writing. Unlike `-r`, this DOES write if confirmed. |

If `$ARGUMENTS` matches `-h` or `--help` → jump to **Help Mode**.
If `$ARGUMENTS` matches `--status` → jump to **Status Mode**.
If `$ARGUMENTS` matches `--clean` → jump to **Clean Mode**.
Otherwise → **Full Sync Pipeline** (with flag modifiers applied).

---

## Status Mode

1. Read `/mnt/c/dev/infoset-mcp/data/status.json` via Read tool.
2. Display formatted:
   ```
   === Work Sync Status ===
   Last Sync:      {lastSync}
   Status:         {lastSyncStatus}
   Infoset:        {infosetTickets} ticket
   DevOps:         {devopsTasks} task
   Matched:        {matched} eşleşen
   Work Plan:      {workPlanItems} iş
   Total Syncs:    {totalSyncs}
   ========================
   ```
3. Done — stop here.

---

## Help Mode

Display:
```
=== Work Sync — Kullanım ===

/work-sync              Full sync: Infoset + DevOps + Analysis + Google writes + DOCX rapor
/work-sync -d           Sadece DevOps: Infoset fetch atla, DevOps task'ları analiz et ve sync et
/work-sync -i           Sadece Infoset: eski /infoset-sync davranışı (4 canonical slot)
/work-sync -r           Report only: tam pipeline ama Google write yok (Tasks + Calendar atlanır)
/work-sync -h           Bu yardım mesajı
/work-sync --status     Son sync durumunu göster
/work-sync --clean      Orphan task/event temizliği (3 liste + calendar)
/work-sync --dry-run    Tam pipeline, diff tablosu göster, onay sonrası yaz

Veri kaynakları: Infoset CRM + Azure DevOps (Fin_Dev26)
Çıktılar: Google Tasks (3 liste) + Google Calendar + DOCX rapor
=============================
```
Done — stop here.

---

## Full Sync Pipeline

### Step 1a: Fetch Infoset Tickets

**Skip this step if `-d` / `--devops-only` flag is set.**

Auth is handled automatically by the Infoset MCP server — no login step needed.

```
mcp__infoset__infoset_list_tickets:
  status: [1, 2]
  itemsPerPage: 100
```

If `totalItems > 100`, paginate with `page: 2`, `page: 3`, etc.

**Stage filter:** Only include tickets with `stageId: 91133` (Yazılım kolonu). Discard tickets in other stages (77519=Üzerinde Çalışılıyor, 83548, etc.) — they are not the user's responsibility.

Save filtered tickets as `currentInfosetTickets`.

### Step 1b: Fetch Azure DevOps Work Items

**Skip this step if `-i` / `--infoset-only` flag is set.**

**Run Step 1a and Step 1b in PARALLEL when both are active (full sync mode).**

#### Authentication

Get a Bearer token via Azure CLI:
```bash
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798
```
Extract `accessToken` from the JSON output. Use it as `Authorization: Bearer {accessToken}` header on all DevOps REST calls.

If `az` command fails (not logged in, expired), inform user: "Azure CLI login gerekli: `az login` çalıştır" and stop.

#### WIQL Query — All open items assigned to @me

```
POST https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/wiql?api-version=7.1

{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [System.IterationPath] UNDER 'Fin_Dev26' AND [System.AssignedTo] = @me AND [System.State] <> 'Closed' AND [System.State] <> 'Prod Test' AND [System.State] <> 'Test' AND [System.State] <> 'Review' ORDER BY [System.ChangedDate] DESC"
}
```

This returns a list of work item IDs.

#### Fetch work item details (batch, max 200 per call)

```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems?ids={comma-separated-ids}&$expand=all&api-version=7.1
```

If more than 200 IDs, split into batches and fetch sequentially.

**Fields to extract from each work item:**

| Field | Usage |
|-------|-------|
| `System.Id` | Work item ID |
| `System.Title` | Title |
| `System.State` | Status (New, Active, On Hold, Test, Review, Deployment, Prod Test, Closed) |
| `System.WorkItemType` | Task or Bug |
| `System.IterationPath` | Sprint (e.g., `Fin_Dev26\Sprint6`) |
| `System.AreaPath` | Module (e.g., `Fin_Dev26\TÖS`) |
| `System.CreatedDate` | Age calculation |
| `System.ChangedDate` | Last activity |
| `System.CreatedBy` | Creator |
| `System.Description` | Description |
| `Microsoft.VSTS.Common.Priority` | Priority (0, 1, 2, 3, 4) |
| `Microsoft.VSTS.Common.Severity` | Severity (1-Critical, 2-High, 3-Medium, 4-Low) |
| `Microsoft.VSTS.TCM.ReproSteps` | Bug repro steps |
| `Microsoft.VSTS.Scheduling.CompletedWork` | Hours completed |
| `Custom.EstimateTime` | Estimated hours (USE THIS over Claude estimate when available) |
| `Custom.DevelopmentTime` | Dev hours |
| `Custom.TestTime` | Test hours |
| `Custom.Tester` | Tester assigned |
| `Custom.IsOldBug` | Carried from old sprint |
| `Custom.IsUnplanned` | Unplanned work |
| `System.Parent` | Parent work item ID |
| `System.CommentCount` | Discussion count |
| Relations | Related/parent work items (from `$expand=all`) |

Save as `currentDevOpsItems`.

#### Attachment & inline image analysis (DevOps + Infoset)

For both DevOps and Infoset items, parse all text fields for inline images and attachments. Download and analyze each image — they often contain screenshots showing the exact bug, expected behavior, or UI context. This visual context is critical for accurate task categorization and description generation.

**DevOps:** Parse `ReproSteps`, `Description`, and comment text for `<img src=".../_apis/wit/attachments/...">`.
```bash
curl -s -H "Authorization: Bearer {token}" "{attachment_url}" -o /tmp/work-sync-{id}-{index}.png
```

**Infoset:** Parse ticket description, comments, and logs for image URLs or attachment references. Download any linked images/screenshots.

#### Discussion/Comments fetch (for matching)

For each work item where `CommentCount > 0`, fetch comments:

```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}/comments?$top=200&api-version=7.1-preview.4
```

If response contains `continuationToken`, follow pagination — Infoset URLs may be in older comments.

Store all comment text per work item for use in Step 2 matching.

---

### Step 2: Match Infoset ↔ DevOps

**Skip this step if `-d` or `-i` flag is set (only one source active).**

**Method:** Search DevOps work item comments/discussion for Infoset ticket URLs.

**Regex:** `dashboard\.infoset\.app/tickets/(\d+)`

Scan ALL fetched comment text for each DevOps work item. Extract Infoset ticket IDs from matched URLs.

**Edge cases:**

| Case | Behavior |
|------|----------|
| Multiple Infoset URLs in one DevOps item | Create separate match entry for each Infoset ID. Work Plan: one entry per Infoset ticket, each linking to the same DevOps item. All linked IDs noted in notes. |
| One Infoset ticket in multiple DevOps items | One Work Plan entry per Infoset ticket. All linked DevOps IDs listed in notes. Primary DevOps ID = highest priority or most recently changed. |
| No Infoset URL found | DevOps-only item, no matching attempted. |

**Output classifications:**

| Result | Meaning |
|--------|---------|
| Match found | Infoset ticket #{id} ↔ DevOps work item #{id} |
| Infoset only | Ticket has no DevOps counterpart |
| DevOps only | Work item has no Infoset ticket |

**Match change detection (for re-plan trigger):** Compare current match results against `state.matching`. New pair found, existing pair dissolved, or pair changed → trigger full re-plan.

**Matching report** — include in terminal output:
```
=== Eşleştirme Raporu ===
Eşleşen: {n} iş (Infoset ↔ DevOps)
Sadece Infoset: {n} ticket (DevOps karşılığı yok)
Sadece DevOps: {n} task
```

---

### Step 3: Load State + Detect Changes

Read `/mnt/c/dev/infoset-mcp/data/state.json` via Read tool.
If file doesn't exist → first run, all items are NEW.

For each item in the current dataset (Infoset tickets, DevOps items, or both), compare against `state.workItems[workPlanId]`:

| Condition | Classification |
|-----------|---------------|
| Not in state | **NEW** |
| In state, status/priority/subject/devopsState changed | **UPDATED** |
| In state, but no longer in any source (ticket closed or work item closed) | **CLOSED** |
| In state, was completed but now active again | **REOPENED** |
| No changes | **SKIP** |

Report counts: `NEW={n}, UPDATED={n}, CLOSED={n}, REOPENED={n}, SKIP={n}`

If `--dry-run` and no NEW/UPDATED/CLOSED → report "No changes" and stop.

**`--dry-run` diff table format (show before asking confirmation):**
```
=== Work Sync Dry Run ===

| Kaynak          | NEW | UPDATED | CLOSED | SKIP |
|-----------------|-----|---------|--------|------|
| Infoset         |   3 |       2 |      1 |    8 |
| DevOps          |   5 |       4 |      0 |   12 |
| Work Plan       |   7 |       4 |      1 |   —  |

Toplam Google Tasks yazımı: {n} create, {n} update, {n} complete
Toplam Calendar yazımı: {n} create, {n} update, {n} delete

Devam edilsin mi? (y/n)
```

If user confirms → proceed with Google writes (Steps 7-8).
If user declines → skip Google writes, still generate DOCX report and terminal summary.

---

### Step 4: Unified Analysis (2-Pass)

**DO NOT use Claude CLI or any external process.** Analyze directly in THIS session.

#### Step 4a: Enrich Data

**For Infoset tickets (NEW + UPDATED):**

Fetch in parallel where possible:

**Detail:**
```
mcp__infoset__infoset_get_ticket:
  ticketId: {ticketId}
```

**Logs:**
```
mcp__infoset__infoset_get_ticket_logs:
  ticketId: {ticketId}
  itemsPerPage: 15
```

**Contact** (cache per contactId — don't re-fetch same contact):
```
mcp__infoset__infoset_get_contact:
  contactId: {contactId}
```

**Company** (cache per companyId — don't re-fetch same company):
```
mcp__infoset__infoset_get_company:
  companyId: {companyId}
```

Build enriched ticket with: id, subject, status, priority, companyName, contactName, content, source, createdDate, activities (last 3), slaStats.

**For DevOps items:** Already enriched from Step 1b (all fields fetched). No additional enrichment needed.

#### Step 4b: Pass 1 — Analyze

For EVERY work item (from both sources), produce:

| Field | Description |
|-------|-------------|
| `workPlanId` | `wp-M{infosetId}` for matched, `wp-I{infosetId}` for Infoset-only, `wp-D{devopsId}` for DevOps-only |
| `source` | `"infoset"`, `"devops"`, `"both"` |
| `category` | Infoset: from content analysis (Odeme Hatasi, Entegrasyon Sorunu, Fatura Talebi, Teknik Ariza, Modul Hatasi, API Sorunu, Kullanici Yonetimi, Raporlama, Performans, Guvenlik, Genel Destek, Diger). DevOps: from AreaPath + content |
| `priorityScore` | 1-100, unified scoring (see below) |
| `effortHours` | DevOps `Custom.EstimateTime` if available, else Claude estimate (see Effort Estimation Guide below) |
| `actionSummary` | What needs to be done (Turkish, 2-3 sentences) |
| `title` | `{emoji} [{score}] {company_or_module} - {subject} (#{primary_id})` |
| `tier` | 1 (Acil), 2 (Bu hafta), 3 (Backlog) |
| `waitingParty` | Combined assessment from Infoset activity + DevOps state |
| `customer` | Company name (from Infoset or DevOps title/AreaPath) |
| `devopsState` | DevOps state if available |
| `sprint` | Sprint name if available (from `System.IterationPath`) |
| `infosetId` | Infoset ticket ID if available |
| `devopsId` | Primary DevOps work item ID if available |
| `devopsIds` | All linked DevOps IDs (array) |
| `ageDays` | Days since creation (earliest creation date if matched) |
| `sprintsCarried` | Derived from current sprint number minus item's sprint number. E.g., item in Sprint3, current Sprint6 → carried 3 sprints. Uses `System.IterationPath` only. Items without sprint → 0. |
| `needsCodebaseCheck` | true/false (from content analysis) |

**Title format:**
```
{emoji} [{score}] {company_or_module} - {subject} (#{primary_id})
```
- `primary_id` → Infoset varsa Infoset ID, sadece DevOps ise DevOps ID
- `company_or_module` → Infoset varsa company, sadece DevOps ise AreaPath son segment veya title'dan çıkar

#### Waiting Party Analysis

**For Infoset tickets:**
**DO NOT simply check `isAgent` on the last log entry.** Read the full conversation flow (all fetched activities) and determine who actually needs to take the next action. Consider:

- Agent may have sent the last message but asked the customer a question → **Müşteride bekliyor**
- Agent may have sent the last message saying "we're working on it" → **Bizde bekliyor**
- Customer may have replied "teşekkürler" or "tamam" but the issue is not resolved → **Bizde bekliyor**
- Customer may have sent new information/request that needs action → **Bizde bekliyor**
- Agent resolved the issue and customer hasn't confirmed → **Müşteride bekliyor**

**For DevOps items:**
Derive from `System.State`:
- New → "Bizde bekliyor" (yeni gelmiş iş)
- Active → "Üzerinde çalışılıyor" (aktif geliştirme)
- On Hold → "Bloke" (add reason from description if available)
- Test → listeye dahil edilmez (sorumluluğumda değil, tester farklı kişi)
- Review → listeye dahil edilmez (sorumluluğumda değil, PR açılmış)
- Deployment → "Deploy bekliyor" (taşınması gerekiyor)
- Prod Test → listeye dahil edilmez (benden çıkmış, sorun olursa tekrar açılır)
- Closed → listeye dahil edilmez (tamamlanmış)

**For matched items:** Combine both waiting parties into a single coherent assessment. If Infoset says "Müşteride bekliyor" but DevOps says "Bizde bekliyor" (e.g., code side still needs work), use "Bizde bekliyor" (take the more actionable one).

Output one of:
- `"Bizde bekliyor"` — We need to take action
- `"Müşteride bekliyor"` — Customer needs to respond/confirm
- `"Deploy bekliyor"` — Code ready, waiting for deployment
- `"Code review bekliyor"` — Waiting for code review
- `"Müşteri testi bekliyor"` — Deployed, waiting for customer verification
- `"Bloke"` — Blocked (add reason)
- `"Belirsiz"` — Cannot determine from available context

#### Unified Priority Score

All weights are additive. Cap at 100.

**Infoset weights (preserved exactly from infoset-sync):**

*Core weights:*
- **Ball is with us (Bizde bekliyor): +15** — we owe the customer a response/action
- SLA breach <4 hours remaining: +30
- SLA breach <24 hours remaining: +20
- Customer urgency keyword (ACIL/URGENT in subject/content): +20
- Infoset priority Urgent(4): +15, High(3): +10, Medium(2): +5
- Open >30 days: +15, >14 days: +10, >7 days: +5 (highest matching only, NOT cumulative)
- Customer awaiting response >2 days: +10

*Company priority (from Infoset company record):*
- Fetch company priority via `mcp__infoset__infoset_get_company` (cache per companyId)
- VIP/Enterprise tier company: +20
- High priority company: +10

*Impact severity (analyze from ticket content/logs):*
- **Total outage** — no data flowing at all, entire bank integration down, all transactions blocked: +25
- **Partial issue** — some accounts/transactions affected, intermittent errors: +10
- **Cosmetic/reporting** — display issues, report formatting, non-blocking: +0

*Module criticality (dynamic — assess from context):*
- Ödeme işlemleri (payment processing) blocked: +15
- Entegrasyon — zero data flow (hiçbir hareket gelmiyor): +20
- Entegrasyon — partial data flow issues: +10
- Raporlama/dashboard sorunları: +5
- Genel destek/eğitim: +0

*Repeat complaints:*
- Same specific issue reported 2nd time (follow-up, merge ticket, or customer re-opened): +10
- Same specific issue reported 3+ times: +20
- Check ticket logs for merge events ("Bu talep kapatıldı ve #X ile birleştirildi") and customer follow-ups on same topic

*Multi-ticket company:*
- Same company has >1 active ticket in this sync: +10 (indicates systemic issues)

**DevOps-specific weights (NEW):**
- DevOps Priority 0 (Critical): +15
- DevOps Priority 1 (High): +10
- DevOps Severity 1-Critical: +20, 2-High: +10
- State = New (yeni iş, aksiyon gerekiyor): +10
- State = Active (üzerinde çalışılıyor): +5
- State = Deployment (code ready, needs deploy): +20
- State = On Hold (blocked): +5
- Sprint overdue (task in older sprint than current): +15
- Has deadline/termin (from description parsing): +20 if <5 days, +10 if <10 days
- IsOldBug = true: +10
- IsUnplanned = true: +5
- No EstimateTime set: +0 (no penalty, just note it in analysis)

**Combined scoring for matched items:**
When Infoset ticket AND DevOps task are matched, take the HIGHER score from each weight category (don't double-count). Cap at 100.

**Score → Emoji:** 80-100 🔴, 60-79 🟠, 40-59 🟡, 20-39 🔵, 1-19 ⚪

**Score → Tier:**
- 70+ → Tier 1 (Acil)
- 50-69 → Tier 2 (Bu hafta)
- <50 → Tier 3 (Backlog)

#### Effort Estimation Guide

**Priority:** DevOps `Custom.EstimateTime` ALWAYS takes precedence over Claude estimates. If available, use the DevOps value directly. Only estimate when `Custom.EstimateTime` is null/0.

**Claude estimation approach (when no DevOps estimate exists):**

DO NOT use a fixed category→hours lookup table. Instead, analyze each item individually by following this process:

**Step 1 — Understand what needs to be done:**
- Read the ticket/task description, repro steps, and comments carefully
- Identify the specific technical change required (which files, modules, services)
- If the Finekra codebase is accessible, check the relevant code to understand scope
- Determine if this is a fix (changing existing behavior) or new work (adding behavior)

**Step 2 — Assess complexity factors (consider ALL of these):**
- **Familiarity:** Is this a known pattern in the codebase, or first-time territory? First encounters with unfamiliar modules/APIs take longer.
- **Scope:** How many files/modules/services are affected? Single-file fix vs cross-module change.
- **Customer-specific config:** Does the customer have special configuration, custom mappings, or unique setup that needs investigation?
- **Environment:** Is this a prod-only issue (requires careful testing, staged rollout) or reproducible in dev?
- **Dependencies:** Does the fix depend on external parties (bank API, ERP vendor, customer IT)?
- **Testing effort:** Can this be tested with unit tests, or does it require end-to-end verification with real data?
- **Investigation needed:** Is the root cause known, or does it require debugging/log analysis first?
- **Risk level:** Could the fix break other things? High-risk changes need more testing time.

**Step 3 — Reference previous similar work:**
- Check `state.json` for previously estimated items with similar characteristics
- If a similar task was estimated at X hours before, use that as baseline
- DevOps `Custom.EstimateTime` from related work items is a strong signal

**Step 4 — Produce estimate:**
- Estimate total hours including: investigation + implementation + testing + deployment preparation
- Round UP to nearest 0.5h
- Range: 0.5h (trivial config change) to 8h (major feature/integration)
- When uncertain, estimate higher — finishing early is better than overrunning

**Estimation signals (not rules, just signals to inform judgment):**
- Config/constant change with known location → likely 0.5-1h
- Single-file bug fix with clear repro → likely 1-2h
- Multi-file fix or new validation logic → likely 2-3h
- New integration or API endpoint → likely 3-5h
- Full module/screen development → likely 5-8h
- Lokal kurulum/taşıma (environment setup) → likely 6-8h
- But ALWAYS override these with actual analysis of the specific item

**Mapping effort to calendar slots:**

| Effort | Slot usage |
|--------|-----------|
| 0.5h | Partial slot — 30 min of current slot, remainder available |
| 1h | Slot 1 (09:30-10:30) fully, or partial of a larger slot |
| 2h | Slot 2 (10:50-12:30) fully, or Slot 3 partially |
| 3h | Slot 2 (100 min) + part of Slot 3 (80 min) |
| 4h | Slot 2 (100 min) + Slot 3 (140 min) |
| 5-6h | Slots 2+3+4 (355 min) |
| 7-8h | Full day (415 min) + overflow to next day |

**Rules:**
- Round UP to nearest 0.5h (no 45-minute estimates)
- Always write effort source in notes: "(DevOps)" or "(tahmini)"
- If DevOps estimate exists but differs from Claude estimate by >50%, use DevOps estimate and note the discrepancy in analysis
- The estimate must reflect the TOTAL time including investigation, not just coding

#### Step 4b-extra: Write Effort Estimates Back to DevOps

After effort estimation is complete, for each DevOps work item where `Custom.EstimateTime` is null/0, write the Claude estimate back to DevOps:

```
PATCH https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems/{id}?api-version=7.1
Content-Type: application/json-patch+json
Authorization: Bearer {accessToken}

[
  {
    "op": "add",
    "path": "/fields/Custom.EstimateTime",
    "value": {effortHours}
  }
]
```

**Rules:**
- Only write when `Custom.EstimateTime` is null or 0 — NEVER overwrite existing estimates
- Use the same Bearer token from Step 1b authentication
- Log each update: "DevOps #{id} EstimateTime → {effortHours}s (tahmini)"
- If the PATCH fails (403, 404, etc.), log warning and continue — do not stop the sync
- Track updated IDs in terminal summary: "{n} DevOps iş için efor tahmini yazıldı"
- This step runs AFTER analysis Pass 1 but BEFORE Pass 2 (so Pass 2 sees consistent data)

#### Step 4c: Pass 2 — Self-Review

After initial analysis, perform verification pass:

1. **Score consistency** — similar items should have similar scores. If two bugs with nearly identical severity/state have scores differing by >20, investigate and correct.
2. **Tier assignment validation** — verify every tier assignment matches its score range (70+ = T1, 50-69 = T2, <50 = T3). Fix any mismatches.
3. **Duplicate detection** — look for similar titles across sources that were NOT caught by URL matching. Flag potential duplicates. Check:
   - Same company + similar subject keywords
   - Same error description in both Infoset content and DevOps description
   - Same module mentioned in both
4. **Effort validation** — compare Claude effort estimates with DevOps `Custom.EstimateTime` where available. If Claude estimate differs from DevOps estimate by >50%, use the DevOps estimate and note the discrepancy.
5. **Matched item coherence** — for matched pairs, ensure the combined score makes sense. The matched item should not score lower than either individual source would score alone.
6. **Fix any inconsistencies found** before proceeding.

---

### Step 5: Build Work Plan

Merge all items into a single deduplicated list:

1. Start with matched pairs → single entry per pair (keyed as `wp-M{infosetId}`)
2. Add unmatched Infoset tickets (keyed as `wp-I{infosetId}`)
3. Add unmatched DevOps items (keyed as `wp-D{devopsId}`)
4. Sort by `priorityScore` descending

This is the **Work Plan** — single source of truth for calendar planning and capacity calculation.

---

### Step 6: Plan Calendar Slots

**All rules preserved from infoset-sync, extended for unified Work Plan.**

**Working hours:** 09:00-18:00 Mon-Fri, Europe/Istanbul
**Recurring blocks:** Morning standup 09:00-09:30, Evening wrap-up 17:45-18:00
**Breaks:** 10:30-10:50, 12:30-13:10 (lunch), 15:30-15:50
**4 canonical slots per day:**
1. 09:30-10:30 (60 min)
2. 10:50-12:30 (100 min)
3. 13:10-15:30 (140 min)
4. 15:50-17:45 (115 min)
**Net work per day:** 415 min (6h 55min)

**Planning horizon:** 20 business days (4 weeks / 2 sprints) from NOW (current date AND time). All items MUST be scheduled — never leave items unplanned due to horizon limit.

**Current time awareness:**
When planning slots, check the current time in Europe/Istanbul:
- If today is a business day and current time is BEFORE 17:45 → start planning from the NEXT available slot today (skip already-passed slots)
- If today is a business day and current time is AFTER 17:45 → start planning from tomorrow
- If today is a weekend/holiday → start planning from the next business day
- Example: if it's 14:30 on Monday, skip slots 09:30-10:30, 10:50-12:30, and 13:10-14:30. First available slot starts at 14:30 (remaining portion of slot 3: 14:30-15:30) then slot 4 (15:50-17:45)
- Never schedule events in the past

**Public holidays (Turkey — NEVER schedule on these days):**

Fixed holidays (same every year):
- 1 Ocak — Yılbaşı
- 23 Nisan — Ulusal Egemenlik ve Çocuk Bayramı
- 1 Mayıs — Emek ve Dayanışma Günü
- 19 Mayıs — Atatürk'ü Anma, Gençlik ve Spor Bayramı
- 15 Temmuz — Demokrasi ve Milli Birlik Günü
- 30 Ağustos — Zafer Bayramı
- 29 Ekim — Cumhuriyet Bayramı

Dini bayramlar (her yıl değişir — Ramazan Bayramı 3 gün + arife yarım gün, Kurban Bayramı 4 gün + arife yarım gün):

**2026 dini bayram tarihleri:**
- Ramazan Bayramı Arife: 19 Mart (yarım gün — sadece 09:30-12:30)
- Ramazan Bayramı: 20-22 Mart (tam tatil)
- Kurban Bayramı Arife: 26 Mayıs (yarım gün — sadece 09:30-12:30)
- Kurban Bayramı: 27-30 Mayıs (tam tatil)

**Yıl değiştiğinde:** Yeni yılın ilk sync'inde web'den "{yıl} Türkiye Ramazan Bayramı Kurban Bayramı tarihleri" araştır ve bu listeyi güncelle.

**Rules:**
- Arife günleri: sadece sabah çalışılır (09:30-12:30), öğleden sonra tatil
- Bayram günleri: TAM TATİL, hiçbir şey planlanmaz
- Check EVERY candidate date against both fixed and dini bayram tarihleri before scheduling

**Fetch existing events (must cover full 20 business day horizon = ~30 calendar days):**
```
mcp__claude_ai_Google_Calendar__gcal_list_events:
  calendarId: "primary"
  timeMin: "{today}T00:00:00"
  timeMax: "{today+30days}T23:59:59"
  timeZone: "Europe/Istanbul"
  maxResults: 250
```

**Algorithm:**
1. Build free slots per day (canonical slots minus non-sync existing events)
2. **Company grouping:** Before slot assignment, group items by `customer` (company name). When multiple items share the same company, treat them as a single scheduling block:
   - Block priority = highest `priorityScore` among the group
   - Block effort = sum of all item efforts in the group
   - Within the block, order items by `priorityScore` descending
   - **DevOps-only items with no extractable company** are treated as individual items (no grouping), NOT grouped under a null bucket
3. Sort ALL blocks/items by priorityScore descending
4. For each block/item: place into earliest free slot(s), ensuring all items in a company group are scheduled in **adjacent slots on the same day**
5. If a company block's total effort doesn't fit in the remaining day slots, schedule as many as possible together and overflow the rest to the next available day — but always keep same-company items adjacent
6. If effort > single slot → split across multiple slots
7. If no free slot → try bumping lowest-priority sync event (only events created by this sync, identified by state)

**Calendar feeds from Work Plan list ONLY** — not from raw DevOps Tasks or Infoset Tickets lists.

**Full re-plan trigger conditions:**
A FULL re-plan (delete all sync events, re-assign from scratch) is triggered when ANY of these are true:
1. **UPDATED items** — an item's `priorityScore` or `effortHours` changed compared to state
2. **Past-due events** — any sync event in state has `scheduledDate` before today AND the item is still active (not CLOSED)
3. **NEW items** — new items were found that need to be scheduled among existing ones
4. **CLOSED items** — closed item events freed up slots that should be reclaimed
5. **DevOps state changed** — e.g., New → Deployment (affects priority and waiting party)
6. **New matching discovered** — Infoset↔DevOps pair merged that was previously separate

When a full re-plan triggers:
1. Delete ALL sync calendar events (past and future) for active items
2. Delete ALL sync calendar events for CLOSED items (free their slots)
3. **Clean up ALL old Google Tasks in all 3 lists** — before creating new tasks:
   a. List ALL tasks in each list ("DevOps Tasks", "Infoset Tickets", "Work Plan") via `mcp__gtasks-mcp__list`
   b. Delete EVERY existing task in each list via `mcp__gtasks-mcp__delete` — this is a HARD CLEANUP
   c. The task lists should contain ONLY the tasks created in the current sync run, nothing else
   d. **NEVER delete or recreate the task LISTS themselves** — only delete the TASKS inside them. Deleting and recreating lists changes their order in Google Tasks UI. Use `mcp__gtasks-mcp__delete` for individual tasks, NEVER `mcp__gtasks-mcp__delete-tasklist`.
4. Re-plan ALL active Work Plan items from scratch — sort by priorityScore descending, assign to earliest available slots starting from NOW (never schedule in the past)
5. Create new calendar events for ALL active items
6. **Create ALL Google Tasks from scratch** in all 3 lists — for EVERY active item:
   - Always use `mcp__gtasks-mcp__create` (not update) — since old tasks were deleted
   - Task `due` date MUST equal the new calendar event's start date (YYYY-MM-DD)
   - Task `title` and `notes` MUST reflect the latest analysis (score, effort, waiting party, calendar slot)
7. Only re-schedule sync-created events (identified by state `createdBySync: true`) — never move non-sync events

**Calendar and Tasks are ALWAYS in sync — every re-plan updates BOTH. Never update one without the other.**

This ensures:
- Past-due work gets rescheduled to current dates automatically
- New urgent items push lower-priority ones to later slots
- Freed slots from CLOSED items are reclaimed by remaining active items
- Google Tasks always show the correct due date matching the calendar event

**CRITICAL — Calendar ↔ Tasks sync:**
Google Tasks `due` dates MUST always match the calendar event date. When ANY of these change, update BOTH the calendar event AND the task:
- Priority score changes → new slot position → update task due date + title + notes
- Effort hours change → new slot duration → update calendar event end time + task notes
- Subject/topic changes → update both calendar summary + task title + notes
- Waiting party changes → update task notes + calendar summary
- Item status changes → update task status + calendar event

**Rule: Every `gcal_update_event` that changes start/end MUST be followed by a `mcp__gtasks-mcp__update` with the matching `due` date (YYYY-MM-DD of the event start).** Never update calendar without updating the corresponding task.

---

### Step 7: Execute — Google Tasks (3 Lists)

**Skip ALL Google Tasks writes if `-r` / `--report-only` flag is set.**
**If `--dry-run`:** Show diff table first, ask for confirmation. Skip if not confirmed.

#### 7a: Find or Create Task Lists

```
mcp__gtasks-mcp__list-tasklists
```

Find task list IDs for:
- **"DevOps Tasks"** — if not found, create it: `mcp__gtasks-mcp__create-tasklist` with title "DevOps Tasks"
- **"Infoset Tickets"** — if not found, create it: `mcp__gtasks-mcp__create-tasklist` with title "Infoset Tickets"
- **"Work Plan"** — if not found, create it: `mcp__gtasks-mcp__create-tasklist` with title "Work Plan"

Save all three `taskListId` values.

#### 7b: DevOps Tasks List

**Skip if `-i` / `--infoset-only` flag is set.**

Hard cleanup: delete all existing tasks in "DevOps Tasks" list, then recreate from scratch.

For each DevOps work item in `currentDevOpsItems`:
```
mcp__gtasks-mcp__create:
  taskListId: "{devopsTaskListId}"
  title: "{analysis.title}"
  notes: (see unified notes template below — REAL newlines)
  due: "{scheduledDate}"
```

Save returned task `id` as `googleTaskId_devops` in state.

#### 7c: Infoset Tickets List

**Skip if `-d` / `--devops-only` flag is set.**

Hard cleanup: delete all existing tasks in "Infoset Tickets" list, then recreate from scratch.

For each Infoset ticket in `currentInfosetTickets`:
```
mcp__gtasks-mcp__create:
  taskListId: "{infosetTaskListId}"
  title: "{analysis.title}"
  notes: (see unified notes template below — REAL newlines)
  due: "{scheduledDate}"
```

Save returned task `id` as `googleTaskId_infoset` in state.

#### 7d: Work Plan List

Hard cleanup: delete all existing tasks in "Work Plan" list, then recreate from scratch.

For each item in the Work Plan (deduplicated, sorted by priority):
```
mcp__gtasks-mcp__create:
  taskListId: "{workPlanTaskListId}"
  title: "{analysis.title}"
  notes: (see unified notes template below — REAL newlines)
  due: "{scheduledDate}"
```

Save returned task `id` as `googleTaskId_workPlan` in state.

Construct `uri` for each as: `https://www.googleapis.com/tasks/v1/lists/{taskListId}/tasks/{taskId}`

#### For CLOSED items (that have googleTaskId in state):
Mark as completed in Work Plan list:
```
mcp__gtasks-mcp__update:
  id: "{state.workItems[wpId].googleTaskId_workPlan}"
  uri: "{state.workItems[wpId].googleTaskUri_workPlan}"
  taskListId: "{workPlanTaskListId}"
  status: "completed"
```

Also mark as completed in the source-specific list (DevOps Tasks or Infoset Tickets) if applicable.

#### For REOPENED items (that have googleTaskId in state with completedAt set):
```
mcp__gtasks-mcp__update:
  id: "{state.workItems[wpId].googleTaskId_workPlan}"
  uri: "{state.workItems[wpId].googleTaskUri_workPlan}"
  taskListId: "{workPlanTaskListId}"
  title: "{analysis.title}"
  notes: (see unified notes template — REAL newlines)
  status: "needsAction"
  due: "{new scheduledDate}"
```
Clear `completedAt` in state after reactivation.

#### Unified Notes Template

**CRITICAL — Notes formatting:**
The `notes` parameter must use REAL newlines, not `\n` literals. When calling `mcp__gtasks-mcp__create` or `mcp__gtasks-mcp__update`, write the notes value as a multi-line string with actual line breaks. The MCP tool sends `\n` as literal text if you escape it.

**Template (use real line breaks between each line):**

```
{Claude analiz notu — 2-3 cümle: ne yapılmalı, bağlam, dikkat edilecekler. Turkish.}

Kaynak: {Infoset + DevOps | Infoset | DevOps}
Müşteri: {şirket} ({kişi})
Durum: {DevOps state varsa o, yoksa Infoset status — "Açık"/"Beklemede"}
Bekleyen: {Bizde / Müşteride / Deploy / Code Review / Müşteri Testi / Bloke / Belirsiz}
Açık: {X} gündür

Kategori: {category}
Tip: {Bug / Task / Ticket}
Sprint: {sprint adı veya "—"}
Öncelik: {skor}/100 | Tier {1-3}
Efor: {saat} ({kaynak: DevOps estimate / Claude tahmini})

Notlar:
- {esnek alan — Claude analiz bulguları}
- {uyarılar, terminler, blokajlar}
- {teknik ipucu, ilişkili iş, müşteri davranışı}

Takvim: {DD.MM HH:MM-HH:MM}

{Infoset URL — varsa: https://dashboard.infoset.app/tickets/{id}}
{DevOps URL — varsa: https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id}}
```

**Field rules:**
- **Kaynak** → always write
- **Müşteri** → from Infoset company/contact. If DevOps-only, extract from title if possible; otherwise omit the line entirely
- **Durum** → if DevOps state available use it (more granular); if Infoset-only use "Açık" or "Beklemede"
- **Sprint** → if DevOps available write sprint name; if Infoset-only omit the line
- **Tip** → DevOps: Bug/Task; Infoset: Ticket; matched: use DevOps type
- **Efor** → DevOps `Custom.EstimateTime` if available, write source as "(DevOps)"; otherwise Claude estimate, write source as "(tahmini)"
- **Notlar** → if no useful info, omit the entire Notlar section. Never write empty bullets.
- **URLs** → at the very end. For matched items, include both Infoset and DevOps URLs.

---

### Step 8: Execute — Google Calendar

**Skip ALL Google Calendar writes if `-r` / `--report-only` flag is set.**
**If `--dry-run`:** Show diff table first, ask for confirmation. Skip if not confirmed.

**Color mapping:**
- Score 80-100 → colorId "11" (Tomato)
- Score 60-79 → colorId "6" (Tangerine)
- Score 40-59 → colorId "5" (Banana)
- Score 20-39 → colorId "7" (Peacock)
- Score 1-19 → colorId "2" (Sage)

**For NEW items with planned slots:**
```
mcp__claude_ai_Google_Calendar__gcal_create_event:
  calendarId: "primary"
  sendUpdates: "none"
  event:
    summary: "{emoji} [{score}] {company_or_module} - {subject} (#{primary_id})"
    description: "{actionSummary}\n\n{Infoset URL if available}\n{DevOps URL if available}"
    start: {dateTime: "{slot.start}", timeZone: "Europe/Istanbul"}
    end: {dateTime: "{slot.end}", timeZone: "Europe/Istanbul"}
    colorId: "{colorId}"
```
Save returned event `id` as `calendarEventId`.
If effort splits into multiple slots, create additional events for each slot.

**For UPDATED items** (with calendarEventId in state):
```
mcp__claude_ai_Google_Calendar__gcal_update_event:
  calendarId: "primary"
  eventId: "{state.workItems[wpId].calendarEventId}"
  sendUpdates: "none"
  event:
    summary: "{updated summary}"
    description: "{updated description}"
    colorId: "{updated colorId}"
```

**For CLOSED items** (with calendarEventId in state):
DELETE the calendar event to free the slot for replanning:
```
mcp__claude_ai_Google_Calendar__gcal_delete_event:
  calendarId: "primary"
  eventId: "{state.workItems[wpId].calendarEventId}"
  sendUpdates: "none"
```
Set `calendarEventId: null` in state after deletion. The freed slot will be available for other items during replanning.

**IMPORTANT — CLOSED event exclusion:** Before running the slot planning algorithm (Step 6), exclude calendar events belonging to CLOSED items from the existing events list. This ensures freed slots are immediately available for NEW/UPDATED item planning.

**For REOPENED items** (that had calendarEventId but it was deleted when CLOSED):
Create a NEW calendar event with planned slot:
```
mcp__claude_ai_Google_Calendar__gcal_create_event:
  calendarId: "primary"
  sendUpdates: "none"
  event:
    summary: "{emoji} [{score}] {company_or_module} - {subject} (#{primary_id})"
    description: "{actionSummary}\n\n{URLs}"
    start: {dateTime: "{slot.start}", timeZone: "Europe/Istanbul"}
    end: {dateTime: "{slot.end}", timeZone: "Europe/Istanbul"}
    colorId: "{colorId}"
```
Save new `calendarEventId` in state. Clear `completedAt`.

---

### Step 9: Save State

Write updated state to `/mnt/c/dev/infoset-mcp/data/state.json` via Write tool.

**workPlanId generation:**
- Infoset-only: `wp-I{infosetId}` (e.g., `wp-I8912273`)
- DevOps-only: `wp-D{devopsId}` (e.g., `wp-D13351`)
- Matched: `wp-M{infosetId}` (e.g., `wp-M8915760`) — keyed on Infoset ID to avoid collision

**State schema:**

```json
{
  "workItems": {
    "wp-M8915760": {
      "workPlanId": "wp-M8915760",
      "source": "both",
      "infosetId": 8915760,
      "devopsId": 13435,
      "devopsIds": [13435],
      "subject": "...",
      "status": "...",
      "devopsState": "On Hold",
      "sprint": "Sprint6",
      "priorityScore": 92,
      "effortHours": 4,
      "tier": 1,
      "category": "...",
      "actionSummary": "...",
      "waitingParty": "...",
      "customer": "Özçete",
      "ageDays": 15,
      "sprintsCarried": 2,
      "needsCodebaseCheck": false,
      "googleTaskId_workPlan": "...",
      "googleTaskUri_workPlan": "...",
      "googleTaskId_infoset": "...",
      "googleTaskUri_infoset": "...",
      "googleTaskId_devops": "...",
      "googleTaskUri_devops": "...",
      "calendarEventId": "...",
      "scheduledDate": "2026-03-24",
      "scheduledStart": "...",
      "scheduledEnd": "...",
      "createdBySync": true,
      "completedAt": null,
      "syncedAt": "..."
    },
    "wp-I8912273": {
      "workPlanId": "wp-I8912273",
      "source": "infoset",
      "infosetId": 8912273,
      "devopsId": null,
      "devopsIds": [],
      "subject": "...",
      "status": "...",
      "devopsState": null,
      "sprint": null,
      "priorityScore": 55,
      "effortHours": 2,
      "tier": 2,
      "category": "...",
      "actionSummary": "...",
      "waitingParty": "...",
      "customer": "...",
      "ageDays": 8,
      "sprintsCarried": 0,
      "needsCodebaseCheck": true,
      "googleTaskId_workPlan": "...",
      "googleTaskUri_workPlan": "...",
      "googleTaskId_infoset": "...",
      "googleTaskUri_infoset": "...",
      "googleTaskId_devops": null,
      "googleTaskUri_devops": null,
      "calendarEventId": "...",
      "scheduledDate": "2026-03-25",
      "scheduledStart": "...",
      "scheduledEnd": "...",
      "createdBySync": true,
      "completedAt": null,
      "syncedAt": "..."
    },
    "wp-D13351": {
      "workPlanId": "wp-D13351",
      "source": "devops",
      "infosetId": null,
      "devopsId": 13351,
      "devopsIds": [13351],
      "subject": "...",
      "status": "...",
      "devopsState": "New",
      "sprint": "Sprint6",
      "priorityScore": 40,
      "effortHours": 3,
      "tier": 3,
      "category": "...",
      "actionSummary": "...",
      "waitingParty": "Bizde bekliyor",
      "customer": null,
      "ageDays": 22,
      "sprintsCarried": 1,
      "needsCodebaseCheck": false,
      "googleTaskId_workPlan": "...",
      "googleTaskUri_workPlan": "...",
      "googleTaskId_infoset": null,
      "googleTaskUri_infoset": null,
      "googleTaskId_devops": "...",
      "googleTaskUri_devops": "...",
      "calendarEventId": "...",
      "scheduledDate": "2026-03-26",
      "scheduledStart": "...",
      "scheduledEnd": "...",
      "createdBySync": true,
      "completedAt": null,
      "syncedAt": "..."
    }
  },
  "matching": {
    "matched": [
      {"infosetId": 8915760, "devopsIds": [13435]}
    ],
    "infosetOnly": [8912273, 8814847],
    "devopsOnly": [13351, 13355]
  }
}
```

**CLOSED items state update:**
- Set `completedAt: "{now ISO}"`, `calendarEventId: null` (event was deleted)
- Keep `googleTaskId_workPlan` (task is marked completed, not deleted)

**REOPENED items state update:**
- Clear `completedAt: null`
- Set new `calendarEventId` from newly created event
- Update all analysis fields (score, effort, category, etc.)

**Also write status.json** to `/mnt/c/dev/infoset-mcp/data/status.json`:
```json
{
  "lastSync": "{now ISO}",
  "lastSyncStatus": "success",
  "infosetTickets": 23,
  "devopsTasks": 29,
  "matched": 5,
  "workPlanItems": 47,
  "totalSyncs": 12
}
```
Increment `totalSyncs` from previous value. Set `lastSyncStatus` to `"success"` on completion, `"failed"` on error (with partial state saved).

---

### Step 10: Generate DOCX Report

**Skip if `-i` / `--infoset-only` flag is set (use old report format instead).**

**DOCX generation method:**

Prepare a JSON payload with all analysis data and pipe it to the Python report generator:

```bash
python3 /mnt/c/dev/infoset-mcp/scripts/generate-report.py "/mnt/c/Users/Hakan/Documents/WorkSync/work-sync-{YYYY-MM-DD}.docx" <<'JSONEOF'
{full analysis JSON payload}
JSONEOF
```

The script reads JSON from stdin and writes the DOCX to the path given as the first positional argument. Create the output directory first if it does not exist:
```bash
mkdir -p "/mnt/c/Users/Hakan/Documents/WorkSync"
```

**CRITICAL — JSON payload MUST contain ALL fields with REAL data. The DOCX script renders empty sections if any field is missing or contains empty arrays/objects. Build the payload AFTER analysis is complete, using the actual analysis results — never use placeholder values.**

**JSON payload construction — use this Python template to build from state/analysis data:**

```python
import json
from datetime import datetime, timedelta
from collections import defaultdict

# Inputs — these are the actual objects from the sync session:
# state = loaded state.json after analysis (dict)
# items = state['workItems'] (dict of workPlanId → item)
# matching = state['matching'] (dict with 'matched', 'infosetOnly', 'devopsOnly')
# sync_date = datetime.now().strftime('%Y-%m-%d')  (str)
# change_counts = {'new_infoset': N, 'new_devops': N, ...}  (dict — from Step 3)
# duplicates_found = [...]  (list — from Pass 2 duplicate detection)

# Count sources
infoset_count = sum(1 for v in items.values() if v.get('source') in ('infoset', 'both'))
devops_count = sum(1 for v in items.values() if v.get('source') in ('devops', 'both'))
matched_count = len(matching.get('matched', []))

# Build tier lists — EVERY item must be in exactly one tier
tiers = {1: [], 2: [], 3: []}
for wpid, v in items.items():
    tier = v.get('tier', 3)
    item_score = v.get('priorityScore', 0)
    emoji = '🔴' if item_score>=80 else '🟠' if item_score>=60 else '🟡' if item_score>=40 else '🔵' if item_score>=20 else '⚪'
    tiers[tier].append({
        'id': wpid,
        'title': f"{v.get('customer','') or ''} - {v.get('subject','')}",
        'source': v.get('source',''),
        'state': v.get('devopsState','') or v.get('status',''),
        'score': item_score,
        'effort': v.get('effortHours', 1),
        'customer': v.get('customer',''),
        'sprint': v.get('sprint','—') or '—',
        'waiting': v.get('waitingParty',''),
        'emoji': emoji,
        'actionSummary': v.get('actionSummary', ''),
        'ageDays': v.get('ageDays', 0),
        'sprintsCarried': v.get('sprintsCarried', 0)
    })

# Build customer cross-view — group ALL items by customer
cust_view = defaultdict(lambda: {'infoset': [], 'devops': [], 'totalEffort': 0, 'highestScore': 0})
for wpid, v in items.items():
    cust = v.get('customer') or 'Bilinmeyen'
    src = v.get('source', '')
    item_score = v.get('priorityScore', 0)
    entry = {
        'id': v.get('infosetId') or v.get('devopsId') or wpid,
        'subject': v.get('subject',''),
        'category': v.get('category',''),
        'ageDays': v.get('ageDays', 0),
        'state': v.get('devopsState','') or v.get('status',''),
        'sprint': v.get('sprint','—') or '—',
        'actionSummary': v.get('actionSummary', '')
    }
    if src in ('infoset', 'both'):
        cust_view[cust]['infoset'].append(entry)
    if src in ('devops', 'both'):
        cust_view[cust]['devops'].append(entry)
    cust_view[cust]['totalEffort'] += v.get('effortHours', 1)
    cust_view[cust]['highestScore'] = max(cust_view[cust]['highestScore'], item_score)

# Build capacity weeks — 4 weeks covering the 20 business day planning horizon
total_effort = sum(v.get('effortHours', 1) for v in items.values())
weekly_cap = 34.5  # 5 days x 6h55m

# Group scheduled items by week
from collections import Counter
week_effort = Counter()
for v in items.values():
    sd = v.get('scheduledDate')
    if sd:
        d = datetime.strptime(sd, '%Y-%m-%d')
        week_num = d.isocalendar()[1]
        week_effort[week_num] += v.get('effortHours', 1)

# Build week labels for the next 4 weeks starting from sync_date
today = datetime.strptime(sync_date, '%Y-%m-%d')
capacity_weeks = []
for w in range(4):
    week_start = today + timedelta(days=7 * w - today.weekday())  # Monday of each week
    week_end = week_start + timedelta(days=4)  # Friday
    wn = week_start.isocalendar()[1]
    planned = round(week_effort.get(wn, 0), 1)
    util = round((planned / weekly_cap) * 100) if weekly_cap > 0 else 0
    capacity_weeks.append({
        'label': f"Hafta {wn} ({week_start.strftime('%d.%m')}-{week_end.strftime('%d.%m')})",
        'available': weekly_cap,
        'planned': planned,
        'utilization': f"{util}%"
    })

capacity_this_week = capacity_weeks[0]['utilization'] if capacity_weeks else '0%'
capacity_next_week = capacity_weeks[1]['utilization'] if len(capacity_weeks) > 1 else '0%'

# Determine current sprint dynamically from IterationPath values
current_sprint = None
for v in items.values():
    sprint = v.get('sprint', '') or ''
    if 'Sprint' in sprint:
        sprint_num = int(''.join(c for c in sprint if c.isdigit()) or '0')
        if current_sprint is None or sprint_num > current_sprint:
            current_sprint = sprint_num
current_sprint_name = f"Sprint{current_sprint}" if current_sprint else None

# Build sprint carry-over
sprint_carry = defaultdict(lambda: {'count': 0, 'note': ''})
for v in items.values():
    sprint = v.get('sprint','') or ''
    if 'Sprint' in sprint and sprint != current_sprint_name:
        sprint_carry[sprint]['count'] += 1

# Build age distribution
age_dist = {'over60': 0, '30to60': 0, '14to30': 0, 'under14': 0}
for v in items.values():
    age = v.get('ageDays', 0)
    if age > 60: age_dist['over60'] += 1
    elif age > 30: age_dist['30to60'] += 1
    elif age > 14: age_dist['14to30'] += 1
    else: age_dist['under14'] += 1

# Build top actions — Tier 1 items sorted by score, top 5
sorted_items = sorted(items.values(), key=lambda x: x.get('priorityScore', 0), reverse=True)
actions = []
for v in sorted_items[:5]:
    if v.get('tier', 3) <= 2:  # Include Tier 1 and Tier 2 if no Tier 1
        primary_id = v.get('infosetId') or v.get('devopsId') or ''
        actions.append({
            'id': f"#{primary_id}",
            'description': v.get('actionSummary', ''),
            'score': v.get('priorityScore', 0),
            'tier': v.get('tier', 3)
        })

payload = {
    'date': sync_date,
    'summary': {
        'infosetTickets': infoset_count,
        'devopsTasks': devops_count,
        'matched': matched_count,
        'workPlanItems': len(items),
        'capacityThisWeek': capacity_this_week,
        'capacityNextWeek': capacity_next_week
    },
    'matching': {
        'matched': [{'infosetId': m['infosetId'], 'devopsIds': m['devopsIds'],
                      'customer': items.get(f"wp-M{m['infosetId']}", {}).get('customer', ''),
                      'infosetSubject': items.get(f"wp-M{m['infosetId']}", {}).get('subject', ''),
                      'devopsTitle': items.get(f"wp-M{m['infosetId']}", {}).get('subject', '')}
                     for m in matching.get('matched', [])],
        'infosetOnly': [{'id': v['infosetId'], 'customer': v.get('customer',''), 'subject': v.get('subject','')}
                         for v in items.values() if v.get('source')=='infoset'],
        'devopsOnly': [{'id': v['devopsId'], 'title': v.get('subject',''), 'sprint': v.get('sprint','—'), 'state': v.get('devopsState','')}
                        for v in items.values() if v.get('source')=='devops']
    },
    'tiers': {'tier1': tiers[1], 'tier2': tiers[2], 'tier3': tiers[3]},
    'customerView': dict(cust_view),
    'capacity': {
        'weeks': capacity_weeks,
        'totalWork': round(total_effort, 1),
        'weeklyCapacity': weekly_cap
    },
    'aging': {
        'sprintCarry': [{'sprint': k, 'count': v['count'], 'note': v['note']} for k, v in sorted(sprint_carry.items())],
        'distribution': age_dist
    },
    'duplicates': duplicates_found,
    'actions': actions,
    'syncResults': {
        'new': {'infoset': change_counts.get('new_infoset', 0), 'devops': change_counts.get('new_devops', 0),
                'workPlan': change_counts.get('new_workplan', 0), 'calendar': change_counts.get('new_calendar', 0)},
        'updated': {'infoset': change_counts.get('updated_infoset', 0), 'devops': change_counts.get('updated_devops', 0),
                    'workPlan': change_counts.get('updated_workplan', 0), 'calendar': change_counts.get('updated_calendar', 0)},
        'closed': {'infoset': change_counts.get('closed_infoset', 0), 'devops': change_counts.get('closed_devops', 0),
                   'workPlan': change_counts.get('closed_workplan', 0), 'calendar': change_counts.get('closed_calendar', 0)}
    }
}
```

**Validation before sending to script:**
- `tiers.tier1` + `tiers.tier2` + `tiers.tier3` item count MUST equal `summary.workPlanItems`
- `customerView` MUST have at least one entry
- `capacity.weeks` MUST have at least 2 entries
- `actions` MUST have at least 1 entry
- `syncResults` counts MUST be non-negative integers
- Every tier item MUST have non-empty `actionSummary` — if empty, the DOCX section will show blank analysis
- Every customerView item MUST have `ageDays` > 0 — calculate from `createdDate` if not in state
- If any validation fails, log warning but still generate the report with available data

**ageDays calculation (MANDATORY for every item):**
Calculate `ageDays` from the item's `createdDate` (Infoset) or `System.CreatedDate` (DevOps):
```python
from datetime import datetime, timezone
age_days = (datetime.now(timezone.utc) - datetime.fromisoformat(created_date.replace('Z', '+00:00'))).days
```
For matched items, use the EARLIEST creation date between Infoset and DevOps. Never leave `ageDays` as 0 or null.

**File output:** `C:\Users\Hakan\Documents\WorkSync\work-sync-{YYYY-MM-DD}.docx`
(Create the directory if it doesn't exist)

**DOCX structure and content:**

**Cover:**
- Title: "Work Sync Raporu"
- Date: {sync date}
- Summary: {total items, capacity status}

**Section 1: Genel Bakış**
- Source distribution table (Infoset / DevOps / Matched count)
- Status distribution table
- Type distribution (Bug / Task / Ticket)

**Section 2: Eşleştirme Raporu**
- Matched items table (Infoset ID ↔ DevOps ID ↔ Customer)
- Infoset-only list (no DevOps counterpart)
- DevOps-only list

**Section 3: Öncelik Analizi**
- Tier 1 table (Acil — score 70+)
- Tier 2 table (Bu hafta — score 50-69)
- Tier 3 table (Backlog — score <50)
- Table columns: #, Title, Source, Status, Score, Effort, Customer, Sprint, Waiting Party

**Section 4: Müşteri Bazlı Çapraz Görünüm**
- For each customer: all Infoset tickets + DevOps tasks side by side
- Total effort, highest score
- Warnings (multiple tickets, SLA breach, etc.)

**Section 5: Haftalık Kapasite Planı**
- Week-by-week capacity vs planned table
- Occupancy percentage
- Capacity overflow warnings

**Section 6: Trend / Aging Raporu**
- Sprint carry table (how many items carried from each sprint)
- Age distribution table (>60, 30-60, 14-30, <14 days)
- Old items requiring decision

**Section 7: Duplicate / İlişkili İşler**
- Detected duplicates
- DevOps relations info
- Recommended actions

**Section 8: Aksiyon Önerileri**
- Items to do today
- Items to do this week
- Capacity recommendations
- Missing matchings

**Section 9: Sync Sonuçları**
- Operation table (New / Updated / Closed / Skipped)
- Source-level breakdown
- Google Tasks + Calendar sync status

**DOCX style rules:**
- Font: Calibri 11pt
- Headings: Heading 1-3 styles
- Tables: Table Grid style, header row bold
- Color coding: Tier 1 rows red background, Tier 2 orange, Tier 3 default
- Emojis: score emojis used in tables (🔴🟠🟡🔵⚪)
- Page size: A4, landscape (tables are wide)
- Each section starts on a new page

**Fallback:** If `python-docx` is not installed, try `pip install --user python-docx` or `pip install --break-system-packages python-docx`. If it still fails, generate a Markdown file (`work-sync-{date}.md` in the same directory) instead. Warn in terminal: "python-docx bulunamadı, rapor .md olarak oluşturuldu"

**IMPORTANT:** The sync pipeline MUST NOT fail because of DOCX generation errors. Google writes (Steps 7-8) are always completed regardless of DOCX success. If DOCX fails, log the error and continue to terminal summary.

---

### Step 11: Terminal Summary

Always print a short summary to the terminal at the end:

```
=== Work Sync Tamamlandı ===
Tarih: {YYYY-MM-DD HH:MM}
Infoset: {n} ticket | DevOps: {n} task | Eşleşen: {n}
Work Plan: {n} iş (Tier1: {n}, Tier2: {n}, Tier3: {n})

Kapasite: Bu hafta %{n} | Gelecek hafta %{n} {⚠️ if >100%}
Toplam efor: ~{n} saat

🔴 Acil Aksiyonlar:
  1. #{id} {action description}
  2. #{id} {action description}
  3. #{id} {action description}
  ...

📝 DevOps efor tahmini: {n} iş güncellendi (EstimateTime boş olanlara yazıldı)
📄 Detaylı rapor: C:\Users\Hakan\Documents\WorkSync\work-sync-{YYYY-MM-DD}.docx
```

**Acil Aksiyonlar** — list the top 3-5 Tier 1 items that need immediate attention, with a brief action description. Examples:
- `#13478 review onayla (güvenlik)`
- `#13351 deploy tetikle`
- `#13435 terminli (25 Mart) — On Hold'dan çıkar`
- `#13473 duplicate — kapat`

If no Tier 1 items exist, show the top 3 Tier 2 items instead.

If `--infoset-only`, show the old infoset-sync report format (table with ID/Firma/Islem/Oncelik/Efor/Takvim columns) instead of this unified summary.

---

## Clean Mode

1. Read `/mnt/c/dev/infoset-mcp/data/state.json` — identify work items that are active
2. Fetch current data from BOTH sources:
   - Infoset: `mcp__infoset__infoset_list_tickets` with status [1, 2]
   - DevOps: WIQL query (same as Step 1b) for current open items
3. Build current active set: items that still exist in their source system
4. Identify orphans: items in state but no longer in any source
5. List task lists via `mcp__gtasks-mcp__list-tasklists` → find IDs for "DevOps Tasks", "Infoset Tickets", "Work Plan"
6. List all tasks in each list via `mcp__gtasks-mcp__list`
7. List calendar events via `gcal_list_events` (next 30 days)
8. For each orphaned item in state:
   - Delete task from "Work Plan" list via `mcp__gtasks-mcp__delete` (if `googleTaskId_workPlan` exists)
   - Delete task from "Infoset Tickets" list via `mcp__gtasks-mcp__delete` (if `googleTaskId_infoset` exists)
   - Delete task from "DevOps Tasks" list via `mcp__gtasks-mcp__delete` (if `googleTaskId_devops` exists)
   - DELETE calendar event via `gcal_delete_event` (if `calendarEventId` exists)
9. Update state for cleaned items:
   - Set `googleTaskId_workPlan: null`, `googleTaskId_infoset: null`, `googleTaskId_devops: null`, `calendarEventId: null`, `completedAt: "{now ISO}"`
10. Remove orphan state entries: items not in any source AND without `completedAt`
11. Save updated state.json
12. Report: "{n} Work Plan tasks deleted, {m} Infoset tasks deleted, {k} DevOps tasks deleted, {j} events deleted, {p} orphan state entries removed"

---

## Important Rules

**Preserved from infoset-sync:**
- **All ticket/work item analysis happens in THIS session** — never shell out to `claude` CLI
- **All Google writes use MCP tools** — never use Node.js scripts or external tools for Google API
- **State is the source of truth** for mapping workPlanId ↔ googleTaskId/calendarEventId
- **sendUpdates: "none"** on all calendar writes — no email notifications
- **Europe/Istanbul timezone** for all datetime operations
- **Turkish** for all user-facing text (actionSummary, titles, report, terminal output)
- **Real newlines in Google Tasks notes** — not `\n` literals. The MCP tool sends `\n` as literal text if you escape it.
- **Company grouping** in calendar — same company tickets in adjacent slots
- **DevOps-only items with no extractable company** are treated as individual items (no grouping), NOT grouped under a null bucket
- **Turkey public holidays** — check both fixed and dini bayram dates before scheduling
- **Google Tasks `update` needs `taskListId`** — always include it
- **Google Tasks `due` dates MUST match calendar event dates** — never let them diverge
- **NEVER delete task LISTS (`delete-tasklist`)** — only delete individual TASKS inside them. Recreating lists changes their order in Google Tasks UI.
- **DOCX payload must contain ALL fields with real data** — build payload from actual analysis results using the Python template in Step 10. Validate before sending: tier counts must sum to workPlanItems, customerView must be non-empty, capacity.weeks must have entries.

**New rules:**
- **DevOps auth via `az account get-access-token`** (Bearer token, not PAT). Resource: `499b84ac-1321-427f-aa17-267ca6975798`
- **DevOps REST API always returns UTF-8** — no encoding issues expected
- **Work Plan is single source of truth** — calendar planning and capacity calculation only from Work Plan list
- **Matched items = single Work Plan entry** with both URLs in notes
- **`Custom.EstimateTime` takes precedence** over Claude effort estimate when available
- **Full analysis report on EVERY run** — no summary-only mode
- **Self-review pass (Pass 2) on analysis** before finalizing — always verify score consistency, tier assignments, duplicates, effort estimates, and matched item coherence
- **3 Google Tasks lists** maintained in parallel: "DevOps Tasks" (raw), "Infoset Tickets" (raw), "Work Plan" (deduplicated)
- **DOCX generation must not block sync** — if it fails, Google writes are still completed
- **workPlanId is stable** — once assigned (wp-I, wp-D, or wp-M prefix), it does not change unless matching status changes. If an Infoset-only item becomes matched, it transitions from `wp-I{id}` to `wp-M{id}` — the old state entry is removed and a new one is created.

---

## DevOps Configuration

```
Organization: https://polynomtech.visualstudio.com
Project: Fin_Dev26
Team: Fin_Dev26 Team
API Version: 7.1
Auth: Azure AD (az account get-access-token)
Resource: 499b84ac-1321-427f-aa17-267ca6975798
WIQL Endpoint: POST {org}/{project}/_apis/wit/wiql?api-version=7.1
Work Items Endpoint: GET {org}/{project}/_apis/wit/workitems?ids={ids}&$expand=all&api-version=7.1
Comments Endpoint: GET {org}/{project}/_apis/wit/workitems/{id}/comments?$top=200&api-version=7.1-preview.4
Update Work Item: PATCH {org}/{project}/_apis/wit/workitems/{id}?api-version=7.1 (Content-Type: application/json-patch+json)
Work Item URL: https://polynomtech.visualstudio.com/Fin_Dev26/_workitems/edit/{id}
```

---

## TODO (Future Automation)

These are explicitly deferred features — do NOT implement them now:

- [ ] **Auto DevOps task creation:** When Infoset ticket has no DevOps match, auto-create DevOps task with Infoset URL in discussion. Requires proper matching validation first.
- [ ] **Auto Infoset URL in discussion:** Combined with above — on task creation, write `https://dashboard.infoset.app/tickets/{id}` as first comment.
- [ ] **Periodic auto sync:** Cron-based `/work-sync` execution (e.g., every morning 08:30)
- [ ] **Bidirectional status sync:** When DevOps task closes, check if Infoset ticket should also close
- [ ] **Sprint change detection:** Alert when items move between sprints
- [ ] **Slack/Teams notification:** Send summary to channel after sync
- [ ] **Historical trend tracking:** Store sync snapshots for week-over-week comparison
