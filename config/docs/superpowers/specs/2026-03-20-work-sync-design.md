# Work Sync — Design Spec

**Date:** 2026-03-20
**Replaces:** `/infoset-sync`
**Command:** `/work-sync`

## Overview

Unified work synchronization command that fetches tasks from both Infoset CRM and Azure DevOps, performs cross-source matching and deep analysis, and syncs to Google Tasks + Calendar.

## Problem

- 3 data sources (Infoset, DevOps, Google) checked separately each morning
- Duplicate effort tracking when same issue exists in both Infoset and DevOps
- No unified priority scoring across sources
- Manual calendar planning
- No cross-source visibility (Infoset ticket ↔ DevOps task relationship unknown)

## Architecture

```
/work-sync
│
├── PARALLEL DATA COLLECTION
│   ├── Infoset Agent ──────────┐
│   │   (mevcut infoset-sync    │
│   │    logic aynen korunur)   │
│   │                           ├──► MERGE POINT
│   └── DevOps Agent ───────────┘
│       (REST API via az token)
│
├── MATCHING
│   └── DevOps discussion'larda Infoset URL arama
│
├── ANALYSIS (2-pass: analyze + self-review)
│   ├── Unified priority scoring
│   ├── Effort estimation
│   ├── Tier classification
│   ├── Customer cross-view
│   ├── Weekly capacity plan
│   ├── Trend/aging report
│   └── Duplicate detection
│
├── OUTPUT
│   ├── Console: Full analysis report (always)
│   ├── Google Tasks: 3 lists (DevOps Tasks, Infoset Tickets, Work Plan)
│   └── Google Calendar: From Work Plan only
│
└── TODO (future automation)
    ├── [ ] Auto DevOps task creation for unmatched Infoset tickets
    ├── [ ] Auto Infoset URL in DevOps discussion on task creation
    └── [ ] Periodic auto sync (cron/scheduled)
```

## Aliases

Parse `$ARGUMENTS`:

| Flag | Alias | Behavior |
|------|-------|----------|
| (none) | — | Full sync: Infoset + DevOps + Analysis + Google writes + DOCX report |
| `-d` | `--devops-only` | DevOps only: skip Infoset fetch, analyze + sync DevOps tasks only |
| `-i` | `--infoset-only` | Infoset only: behaves exactly like old `/infoset-sync` (4 canonical slots) |
| `-r` | `--report-only` | Full pipeline, generate DOCX report, but skip ALL Google writes (Tasks + Calendar). For analysis without side effects. |
| `-h` | `--help` | Show usage help and alias descriptions |
| `--status` | — | Show last sync status from status.json with updated display: `Last Sync: {lastSync} \| Status: {lastSyncStatus} \| Infoset: {infosetTickets} \| DevOps: {devopsTasks} \| Matched: {matched} \| Work Plan: {workPlanItems} \| Total Syncs: {totalSyncs}` |
| `--clean` | — | Clean mode: remove orphaned tasks/events |
| `--dry-run` | — | Full pipeline + Google writes, but show diff table first (NEW/UPDATED/CLOSED counts per source) and ask for confirmation before writing. Unlike `-r`, this DOES write if confirmed. |

## Google Tasks Lists

| List Name | Content | Purpose |
|-----------|---------|---------|
| **DevOps Tasks** | Raw DevOps work items (all sprints, assigned to @me) | Ham veri arşivi |
| **Infoset Tickets** | Raw Infoset tickets (mevcut, korunur) | Ham veri arşivi |
| **Work Plan** | Birleştirilmiş, deduplicated nihai liste | **Single source of truth** |

**Rules:**
- Eşleşen işler → Work Plan'da TEK kayıt (her iki URL notlarda)
- Sadece DevOps → Work Plan'da tek kayıt
- Sadece Infoset → Work Plan'da tek kayıt
- Google Calendar → SADECE Work Plan listesinden beslenir
- Kapasite hesabı → SADECE Work Plan listesinden yapılır
- DevOps Tasks ve Infoset Tickets listeleri ham veri arşivi olarak kalır

## Pipeline

### Step 1: Fetch Data (Parallel)

#### 1a: Infoset Tickets

Mevcut infoset-sync Step 1-3 aynen korunur:

```
mcp__infoset__infoset_list_tickets:
  status: [1, 2]
  itemsPerPage: 100
```

- Stage filter: only `stageId: 91133`
- Paginate if `totalItems > 100`
- Enrich each ticket: detail, logs, contact, company (cache per contactId/companyId)

#### 1b: Azure DevOps Work Items

**Authentication:**
```python
az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798
```

**WIQL Query — All open items assigned to @me across ALL sprints:**
```
SELECT [System.Id]
FROM WorkItems
WHERE [System.IterationPath] UNDER 'Fin_Dev26'
  AND [System.AssignedTo] = @me
  AND [System.State] <> 'Closed'
ORDER BY [System.ChangedDate] DESC
```

**Fetch work item details (batch, max 200 per call):**
```
GET /_apis/wit/workitems?ids={ids}&$expand=all&api-version=7.1
```

**Fields to extract:**
| Field | Usage |
|-------|-------|
| `System.Id` | Work item ID |
| `System.Title` | Title |
| `System.State` | Status (New, On Hold, Deployment, Prod Test, Review) |
| `System.WorkItemType` | Task or Bug |
| `System.IterationPath` | Sprint (e.g., `Fin_Dev26\Sprint6`) |
| `System.AreaPath` | Module (e.g., `Fin_Dev26\TÖS`) |
| `System.CreatedDate` | Age calculation |
| `System.ChangedDate` | Last activity |
| `System.CreatedBy` | Creator |
| `System.Description` | Description |
| `Microsoft.VSTS.Common.Priority` | Priority (0, 2) |
| `Microsoft.VSTS.Common.Severity` | Severity |
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
| Relations | Related/parent work items |

**Discussion/Comments fetch (for matching):**
For each work item with `CommentCount > 0`:
```
GET /_apis/wit/workitems/{id}/comments?api-version=7.1-preview.4
```
Search comment text for `dashboard.infoset.app/tickets/\d+` regex.

### Step 2: Match Infoset ↔ DevOps

**Method:** Search DevOps work item comments/discussion for Infoset ticket URLs.

**Regex:** `dashboard\.infoset\.app/tickets/(\d+)`

**Comment pagination:** Use `$top=200` on first call. If response contains `continuationToken`, follow pagination. Infoset URLs may be in older comments.

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

**Matching report** included in analysis output:
```
=== Eşleştirme Raporu ===
Eşleşen: 5 iş (Infoset ↔ DevOps)
Sadece Infoset: 12 ticket (DevOps karşılığı yok)
Sadece DevOps: 17 task
```

### Step 3: Unified Analysis (2-Pass)

#### Pass 1: Analyze

For EVERY work item (from both sources), produce:

| Field | Description |
|-------|-------------|
| `source` | `"infoset"`, `"devops"`, `"both"` |
| `category` | Infoset: from content analysis. DevOps: from AreaPath + content |
| `priority_score` | 1-100, unified scoring (see below) |
| `effort_hours` | DevOps `Custom.EstimateTime` if available, else Claude estimate |
| `action_summary` | What needs to be done (Turkish, 2-3 sentences) |
| `title` | `{emoji} [{score}] {company/module} - {subject} (#{id})` |
| `tier` | 1 (Acil), 2 (Bu hafta), 3 (Backlog) |
| `waiting_party` | Infoset: from activity analysis. DevOps: from state |
| `customer` | Company name (from Infoset or DevOps title) |
| `devops_state` | DevOps state if available |
| `sprint` | Sprint name if available |
| `infoset_id` | Infoset ticket ID if available |
| `devops_id` | DevOps work item ID if available |
| `age_days` | Days since creation |
| `sprints_carried` | Derived from current sprint number minus item's sprint number. E.g., item in Sprint3, current Sprint6 → carried 3 sprints. Uses `System.IterationPath` only (no revision history API needed). Items without sprint → 0. |

#### Unified Priority Score

All weights from infoset-sync preserved, PLUS DevOps-specific weights:

**Infoset weights (preserved exactly):**
- Ball is with us (Bizde bekliyor): +15
- SLA breach <4h: +30, <24h: +20
- Customer urgency keyword: +20
- Infoset priority Urgent(4): +15, High(3): +10, Medium(2): +5
- Open >30 days: +15, >14 days: +10, >7 days: +5
- Customer awaiting >2 days: +10
- VIP/Enterprise company: +20, High priority: +10
- Total outage: +25, Partial: +10
- Payment blocked: +15
- Integration zero flow: +20, partial: +10
- Reporting issues: +5
- Repeat complaint 2nd: +10, 3+: +20
- Multi-ticket company: +10

**DevOps-specific weights (NEW):**
- DevOps Priority 0 (Critical): +15
- DevOps Priority 1 (High): +10
- DevOps Severity 1-Critical: +20, 2-High: +10
- State = Deployment (code ready, needs deploy): +20
- State = Prod Test (deployed, needs verification): +15
- State = Review (code review pending): +15
- State = On Hold (blocked): +5
- Sprint overdue (task in older sprint): +15
- Has deadline/termin (from description): +20 if <5 days, +10 if <10 days
- IsOldBug = true: +10
- IsUnplanned = true: +5
- No EstimateTime set: +0 (no penalty, just note it)

**Combined scoring for matched items:**
When Infoset ticket AND DevOps task are matched, take the HIGHER score from each weight category (don't double-count). Cap at 100.

**Score → Emoji:** 80-100 🔴, 60-79 🟠, 40-59 🟡, 20-39 🔵, 1-19 ⚪

**Score → Tier:**
- 70+ → Tier 1 (Acil)
- 50-69 → Tier 2 (Bu hafta)
- <50 → Tier 3 (Backlog)

#### Waiting Party (DevOps)

Derive from `System.State`:
- New → "Bizde bekliyor"
- On Hold → "Bloke" (add reason from description if available)
- Deployment → "Deploy bekliyor"
- Prod Test → "Müşteri testi bekliyor"
- Review → "Code review bekliyor"

For matched items: combine both waiting parties into single assessment.

#### Pass 2: Self-Review

After initial analysis, perform verification:
- Check score consistency (similar items should have similar scores)
- Verify tier assignments match score ranges
- Check for missed duplicates (similar titles across sources)
- Validate effort estimates (compare with DevOps EstimateTime where available)
- Ensure matched items have coherent combined scores
- Fix any inconsistencies found

### Step 4: Build Work Plan

Merge all items into single deduplicated list:

1. Start with matched pairs → single entry per pair
2. Add unmatched Infoset tickets
3. Add unmatched DevOps items
4. Sort by `priority_score` descending

### Step 5: Calendar Planning

**All rules from infoset-sync preserved exactly:**
- Working hours: 09:00-18:00 Mon-Fri, Europe/Istanbul
- Recurring blocks: standup 09:00-09:30, wrap-up 17:45-18:00
- Breaks: 10:30-10:50, 12:30-13:10 (lunch), 15:30-15:50
- 4 canonical slots: 09:30-10:30, 10:50-12:30, 13:10-15:30, 15:50-17:45
- Net work per day: 415 min (6h 55min)
- Planning horizon: 20 business days (4 weeks / 2 sprints) from NOW
- Current time awareness (skip passed slots)
- Turkey public holidays (fixed + dini bayramlar for current year)
- Company grouping: same-company tickets in adjacent slots. DevOps-only items with no extractable company are treated as individual items (no grouping), NOT grouped under a null bucket.

**Calendar feeds from Work Plan list ONLY** — not from raw DevOps Tasks or Infoset Tickets lists.

**Full re-plan trigger conditions (expanded):**
1. UPDATED items (score or effort changed)
2. Past-due events (scheduled before today, still active)
3. NEW items found
4. CLOSED items freed slots
5. DevOps state changed (e.g., New → Deployment)
6. New matching discovered (Infoset↔DevOps pair merged)

### Step 6: Execute — Google Tasks

#### 6a: Raw Lists

**DevOps Tasks list:**
- Find or create "DevOps Tasks" task list
- Hard cleanup: delete all existing tasks, recreate from scratch
- Create one task per DevOps work item
- Notes: unified template (see below)

**Infoset Tickets list:**
- Preserved as-is from infoset-sync behavior
- Hard cleanup + recreate on full re-plan

#### 6b: Work Plan list

- Find or create "Work Plan" task list
- Hard cleanup: delete all existing tasks, recreate from scratch
- Create one task per Work Plan entry (deduplicated)
- Notes: unified template
- `due` date MUST match calendar event date

#### Unified Notes Template

**CRITICAL: Use REAL newlines, not `\n` literals.**

```
{Claude analiz notu — 2-3 cümle: ne yapılmalı, bağlam, dikkat edilecekler. Turkish.}

Kaynak: {Infoset + DevOps | Infoset | DevOps}
Müşteri: {şirket} ({kişi})
Durum: {DevOps state varsa o, yoksa Infoset status}
Bekleyen: {Bizde / Müşteride / Deploy / Test / Bloke}
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

{Infoset URL — varsa}
{DevOps URL — varsa}
```

**Alan kuralları:**
- Kaynak → her zaman yaz
- Müşteri → Infoset'ten gelir. Sadece DevOps ise title'dan çıkarılabiliyorsa yaz, yoksa atla
- Durum → DevOps varsa DevOps state (daha granüler), sadece Infoset ise "Açık/Beklemede"
- Sprint → DevOps varsa sprint adı, sadece Infoset ise atla
- Tip → DevOps: Bug/Task, Infoset: Ticket, eşleşen: DevOps tipini kullan
- Efor → DevOps `Custom.EstimateTime` varsa onu yaz + "(DevOps)", yoksa Claude tahmini + "(tahmini)"
- Notlar → bilgi yoksa alan tamamen atlanır, boş yazılmaz
- URL'ler → en sonda, eşleşen işlerde her iki URL

**Title format:**
```
{emoji} [{score}] {company_or_module} - {subject} (#{primary_id})
```
- `primary_id` → Infoset varsa Infoset ID, sadece DevOps ise DevOps ID
- `company_or_module` → Infoset varsa company, sadece DevOps ise AreaPath son segment veya title'dan

### Step 7: Execute — Google Calendar

Aynen infoset-sync Step 7, but feeds from Work Plan:

**Color mapping (preserved):**
- Score 80-100 → colorId "11" (Tomato)
- Score 60-79 → colorId "6" (Tangerine)
- Score 40-59 → colorId "5" (Banana)
- Score 20-39 → colorId "7" (Peacock)
- Score 1-19 → colorId "2" (Sage)

**Event summary:** Same title format as Google Tasks.
**Event description:** Action summary + all relevant URLs.

**Calendar ↔ Work Plan Tasks sync rule preserved:**
Every `gcal_update_event` that changes start/end MUST be followed by `mcp__gtasks-mcp__update` on the Work Plan task with matching `due` date.

### Step 8: Save State

Write to `/mnt/c/dev/infoset-mcp/data/state.json` (same location, expanded schema):

**workPlanId generation:**
- Infoset-only: `wp-I{infosetId}` (e.g., `wp-I8912273`)
- DevOps-only: `wp-D{devopsId}` (e.g., `wp-D13351`)
- Matched: `wp-M{infosetId}` (e.g., `wp-M8915760`) — keyed on Infoset ID to avoid collision

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
    }
  },
  "matching": {
    "matched": [{"infosetId": 8915760, "devopsIds": [13435]}],
    "infosetOnly": [8912273, 8814847],
    "devopsOnly": [13351, 13355]
  }
}
```

Also update `status.json`:
```json
{
  "lastSync": "...",
  "lastSyncStatus": "success",
  "infosetTickets": 23,
  "devopsTasks": 29,
  "matched": 5,
  "workPlanItems": 47,
  "totalSyncs": 12
}
```

### Step 9: Analysis Report (Terminal + DOCX)

**Two outputs:**

#### Terminal: Kısa Özet

Terminale her zaman kısa özet basılır:

```
=== Work Sync Tamamlandı ===
Tarih: 2026-03-20 11:30
Infoset: 23 ticket | DevOps: 29 task | Eşleşen: 5
Work Plan: 47 iş (Tier1: 5, Tier2: 12, Tier3: 30)

Kapasite: Bu hafta %89 | Gelecek hafta %110 ⚠️
Toplam efor: ~62 saat

🔴 Acil Aksiyonlar:
  1. #13478 review onayla (güvenlik)
  2. #13351 deploy tetikle
  3. #13435 terminli (25 Mart) — On Hold'dan çıkar
  4. #13473 duplicate — kapat

📄 Detaylı rapor: C:\Users\Hakan\Documents\WorkSync\work-sync-2026-03-20.docx
```

#### DOCX: Tam Detaylı Rapor

**Dosya konumu:** `C:\Users\Hakan\Documents\WorkSync\work-sync-{YYYY-MM-DD}.docx`
(Dizin yoksa oluştur)

**Oluşturma:** `python-docx` kütüphanesi ile.
- Yoksa: `pip install --user python-docx` veya `pip install --break-system-packages python-docx`
- **Fallback:** python-docx kurulamazsa, DOCX yerine Markdown dosyası oluştur (`work-sync-{date}.md` aynı dizine). Terminalde uyar: "⚠️ python-docx bulunamadı, rapor .md olarak oluşturuldu"
- Sync pipeline DOCX hatasından dolayı durmamalı — Google writes her durumda tamamlanır.

**DOCX yapısı ve içerik:**

**Kapak:**
- Başlık: "Work Sync Raporu"
- Tarih: {sync tarihi}
- Özet: {toplam iş, kapasite durumu}

**Bölüm 1: Genel Bakış**
- Kaynak dağılımı tablosu (Infoset / DevOps / Eşleşen)
- Durum dağılımı tablosu
- Tip dağılımı (Bug / Task / Ticket)

**Bölüm 2: Eşleştirme Raporu**
- Eşleşen işler tablosu (Infoset ID ↔ DevOps ID ↔ Müşteri)
- Sadece Infoset listesi (DevOps karşılığı yok)
- Sadece DevOps listesi

**Bölüm 3: Öncelik Analizi**
- Tier 1 tablosu (Acil — skor 70+)
- Tier 2 tablosu (Bu hafta — skor 50-69)
- Tier 3 tablosu (Backlog — skor <50)
- Her tablo kolonları: #, Başlık, Kaynak, Durum, Skor, Efor, Müşteri, Sprint, Bekleyen

**Bölüm 4: Müşteri Bazlı Çapraz Görünüm**
- Her müşteri için: tüm Infoset ticketları + DevOps taskları yan yana
- Toplam efor, en yüksek skor
- Uyarılar (çoklu ticket, SLA ihlali vb.)

**Bölüm 5: Haftalık Kapasite Planı**
- Hafta bazlı kapasite vs planlanan tablo
- Doluluk yüzdesi
- Kapasite aşımı uyarıları

**Bölüm 6: Trend / Aging Raporu**
- Sprint taşıma tablosu (hangi sprint'ten kaç iş taşınıyor)
- Yaş dağılımı tablosu (>60, 30-60, 14-30, <14 gün)
- Karar gerektiren eski işler listesi

**Bölüm 7: Duplicate / İlişkili İşler**
- Tespit edilen duplicate'ler
- DevOps relations bilgisi
- Önerilen aksiyonlar

**Bölüm 8: Aksiyon Önerileri**
- Bugün yapılması gerekenler
- Bu hafta yapılması gerekenler
- Kapasite önerileri
- Eksik eşleştirmeler

**Bölüm 9: Sync Sonuçları**
- İşlem tablosu (Yeni / Güncelleme / Kapanan / Atlanan)
- Kaynak bazlı kırılım
- Google Tasks + Calendar sync durumu

**DOCX stil kuralları:**
- Font: Calibri 11pt
- Başlıklar: Heading 1-3 stilleri
- Tablolar: Table Grid stili, başlık satırı koyu
- Renk kodları: Tier 1 satırları kırmızı arka plan, Tier 2 turuncu, Tier 3 varsayılan
- Emoji'ler: skor emoji'leri tablolarda kullanılır (🔴🟠🟡🔵⚪)
- Sayfa boyutu: A4, landscape (tablolar geniş)
- Her bölüm yeni sayfada başlar

## Clean Mode

Expanded from infoset-sync:
1. Read state.json
2. Fetch current data from BOTH Infoset AND DevOps
3. Identify orphans (in state but no longer in source)
4. Delete orphaned tasks from ALL 3 Google Tasks lists
5. Delete orphaned calendar events
6. Update state
7. Report

## Important Rules

**Preserved from infoset-sync:**
- All analysis happens in THIS session — never shell out to `claude` CLI
- All Google writes use MCP tools — never use scripts
- State is source of truth for ID mappings
- `sendUpdates: "none"` on all calendar writes
- Europe/Istanbul timezone for all datetime operations
- Turkish for all user-facing text
- Real newlines in Google Tasks notes (not `\n` literals)
- Company grouping in calendar (same company adjacent slots)
- Turkey public holidays (fixed + dini bayramlar)
- Google Tasks `update` needs `taskListId`

**New rules:**
- DevOps auth via `az account get-access-token` (Bearer token, not PAT)
- DevOps REST API always returns UTF-8 (no encoding issues)
- Work Plan is single source of truth — calendar/capacity only from Work Plan
- Matched items = single Work Plan entry with both URLs
- `Custom.EstimateTime` takes precedence over Claude effort estimate
- Full analysis report on EVERY run (no summary mode)
- Self-review pass on analysis before finalizing

## DevOps Configuration

```
Organization: https://polynomtech.visualstudio.com
Project: Fin_Dev26
Team: Fin_Dev26 Team
API Version: 7.1
Auth: Azure AD (az account get-access-token)
Resource: 499b84ac-1321-427f-aa17-267ca6975798
```

## TODO (Future Automation)

These are explicitly deferred features. Include as comments in the command file:

- [ ] **Auto DevOps task creation:** When Infoset ticket has no DevOps match, auto-create DevOps task with Infoset URL in discussion. Requires proper matching first.
- [ ] **Auto Infoset URL in discussion:** Combined with above — on task creation, write `https://dashboard.infoset.app/tickets/{id}` as first comment.
- [ ] **Periodic auto sync:** Cron-based `/work-sync` execution (e.g., every morning 08:30)
- [ ] **Bidirectional status sync:** When DevOps task closes, check if Infoset ticket should also close
- [ ] **Sprint change detection:** Alert when items move between sprints
