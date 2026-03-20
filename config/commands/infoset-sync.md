---
description: "Infoset Sync — fetch CRM tickets from Infoset MCP, analyze in-session, sync to Google Calendar & Tasks"
---

# Infoset Sync

Fetch Infoset CRM tickets via Infoset MCP server, analyze them in this Claude session, and sync to Google Calendar & Tasks using MCP tools. No external scripts.

**Project dir:** `/mnt/c/dev/infoset-mcp`

## Modes

Parse `$ARGUMENTS`:
- `--status` → Jump to **Status Mode**
- `--dry-run` → Run full pipeline but skip Google writes, show table only
- `--clean` → Jump to **Clean Mode**
- (none) → Full sync

---

## Status Mode

1. Read `/mnt/c/dev/infoset-mcp/data/status.json` via Read tool
2. Display formatted:
   ```
   === Infoset Calendar Sync Status ===
   Last Sync:      {lastSync}
   Status:         {lastSyncStatus}
   Active Tickets: {ticketsActive}
   Synced:         {ticketsSynced}
   Total Syncs:    {totalSyncs}
   ====================================
   ```
3. Done — stop here.

---

## Full Sync Pipeline

### Step 1: Fetch Active Tickets

Auth is handled automatically by the Infoset MCP server — no login step needed.

```
mcp__infoset__infoset_list_tickets:
  status: [1, 2]
  itemsPerPage: 100
```

If `totalItems > 100`, paginate with `page: 2`, `page: 3`, etc.

**Stage filter:** Only include tickets with `stageId: 91133` (Yazılım kolonu). Discard tickets in other stages (77519=Üzerinde Çalışılıyor, 83548, etc.) — they are not the user's responsibility.

Save filtered tickets as `currentTickets`.

### Step 2: Load State + Detect Changes

Read `/mnt/c/dev/infoset-mcp/data/state.json` via Read tool.
If file doesn't exist → first run, all tickets are NEW.

For each ticket in `currentTickets`, compare against `state.tickets[ticketId]`:

| Condition | Classification |
|-----------|---------------|
| Not in state | **NEW** |
| In state, status/priority/subject changed | **UPDATED** |
| In state, status = 4 or not in current list | **CLOSED** |
| In state, was completed/resolved but now status 1 or 2 | **REOPENED** |
| No changes | **SKIP** |

Report counts: `NEW={n}, UPDATED={n}, CLOSED={n}, REOPENED={n}, SKIP={n}`

If `--dry-run` and no NEW/UPDATED/CLOSED → report "No changes" and stop.

### Step 3: Enrich NEW + UPDATED Tickets

For each NEW and UPDATED ticket, fetch in parallel where possible:

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

Build enriched ticket with: id, subject, status, priority, companyName, contactName, content, source, createdDate, activities (last 3), slaStats.

### Step 4: Analyze Tickets In-Session

**DO NOT use Claude CLI or any external process.** Analyze directly.

For each enriched ticket, produce:

| Field | Description |
|-------|-------------|
| `category` | One of: Odeme Hatasi, Entegrasyon Sorunu, Fatura Talebi, Teknik Ariza, Modul Hatasi, API Sorunu, Kullanici Yonetimi, Raporlama, Performans, Guvenlik, Genel Destek, Diger |
| `priority_score` | 1-100, calculated from weights below |
| `effort_hours` | 0.5-8 estimated hours |
| `action_summary` | What needs to be done (Turkish, 2-3 sentences) |
| `title` | `{emoji} [{score}] {company} - {subject} (#{id})` |
| `needs_codebase_check` | true/false |
| `waiting_party` | See "Waiting Party Analysis" below |

#### Waiting Party Analysis

**DO NOT simply check `isAgent` on the last log entry.** Read the full conversation flow (all fetched activities) and determine who actually needs to take the next action. Consider:

- Agent may have sent the last message but asked the customer a question → **Müşteride bekliyor**
- Agent may have sent the last message saying "we're working on it" → **Bizde bekliyor**
- Customer may have replied "teşekkürler" or "tamam" but the issue is not resolved → **Bizde bekliyor**
- Customer may have sent new information/request that needs action → **Bizde bekliyor**
- Agent resolved the issue and customer hasn't confirmed → **Müşteride bekliyor**

Output one of:
- `"Bizde bekliyor"` — Finekra needs to take action (optionally add agent name if identifiable)
- `"Müşteride bekliyor"` — Customer needs to respond/confirm
- `"Belirsiz"` — Cannot determine from available context

**Priority Score Weights (additive, cap at 100):**

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

**Score → Emoji:** 80-100 🔴, 60-79 🟠, 40-59 🟡, 20-39 🔵, 1-19 ⚪

### Step 5: Plan Calendar Slots

**Working hours:** 09:00-18:00 Mon-Fri, Europe/Istanbul
**Recurring blocks:** Morning standup 09:00-09:30, Evening wrap-up 17:45-18:00
**Breaks:** 10:30-10:50, 12:30-13:10 (lunch), 15:30-15:50
**5 canonical slots per day:**
1. 09:30-10:30 (60 min)
2. 10:50-12:30 (100 min)
3. 13:10-15:30 (140 min)
4. 15:50-17:45 (115 min)
**Net work per day:** 415 min (6h 55min)

**Planning horizon:** 10 business days from NOW (current date AND time).

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

**Fetch existing events:**
```
mcp__claude_ai_Google_Calendar__gcal_list_events:
  calendarId: "primary"
  timeMin: "{today}T00:00:00"
  timeMax: "{today+14days}T23:59:59"
  timeZone: "Europe/Istanbul"
  maxResults: 250
```

**Algorithm:**
1. Build free slots per day (canonical slots minus non-sync existing events)
2. **Company grouping:** Before slot assignment, group tickets by `companyName`. When multiple tickets share the same company, treat them as a single scheduling block:
   - Block priority = highest `priority_score` among the group
   - Block effort = sum of all ticket efforts in the group
   - Within the block, order tickets by `priority_score` descending
3. Sort ALL blocks/tickets by priority_score descending
4. For each block/ticket: place into earliest free slot(s), ensuring all tickets in a company group are scheduled in **adjacent slots on the same day**
5. If a company block's total effort doesn't fit in the remaining day slots, schedule as many as possible together and overflow the rest to the next available day — but always keep same-company tickets adjacent
6. If effort > single slot → split across multiple slots
7. If no free slot → try bumping lowest-priority sync event (only events created by this sync, identified by state)

**Full re-plan trigger conditions:**
A FULL re-plan (delete all sync events, re-assign from scratch) is triggered when ANY of these are true:
1. **UPDATED tickets** — a ticket's `priority_score` or `effort_hours` changed compared to state
2. **Past-due events** — any sync event in state has `scheduledDate` before today AND the ticket is still active (not CLOSED)
3. **NEW tickets** — new tickets were found that need to be scheduled among existing ones
4. **CLOSED tickets** — closed ticket events freed up slots that should be reclaimed

When a full re-plan triggers:
1. Delete ALL sync calendar events (past and future) for active tickets
2. Delete ALL sync calendar events for CLOSED tickets (free their slots)
3. **Clean up ALL old Google Tasks** — before creating new tasks:
   a. List ALL tasks in "Infoset Tickets" list via `mcp__gtasks-mcp__list`
   b. Collect the set of valid task IDs (tasks that will be created/kept in this sync)
   c. Delete EVERY task NOT in the valid set via `mcp__gtasks-mcp__delete` — this removes orphaned tasks from previous syncs, closed tickets, excluded tickets, and any duplicates
   d. This is a HARD CLEANUP — the task list should contain ONLY the tasks created in the current sync run, nothing else
4. Re-plan ALL active sync tickets from scratch — sort by priority_score descending, assign to earliest available slots starting from NOW (never schedule in the past)
5. Create new calendar events for ALL active tickets
6. **Create ALL Google Tasks from scratch** — for EVERY active ticket:
   - Always use `mcp__gtasks-mcp__create` (not update) — since old tasks were deleted in step 3
   - Task `due` date MUST equal the new calendar event's start date (YYYY-MM-DD)
   - Task `title` and `notes` MUST reflect the latest analysis (score, effort, waiting party, calendar slot)
7. Only re-schedule sync-created events (identified by state `createdBySync: true`) — never move non-sync events

**Calendar and Tasks are ALWAYS in sync — every re-plan updates BOTH. Never update one without the other.**

This ensures:
- Past-due work gets rescheduled to current dates automatically
- New urgent tickets push lower-priority ones to later slots
- Freed slots from CLOSED tickets are reclaimed by remaining active tickets
- Google Tasks always show the correct due date matching the calendar event

**CRITICAL — Calendar ↔ Tasks sync:**
Google Tasks `due` dates MUST always match the calendar event date. When ANY of these change, update BOTH the calendar event AND the task:
- Priority score changes → new slot position → update task due date + title + notes
- Effort hours change → new slot duration → update calendar event end time + task notes
- Subject/topic changes → update both calendar summary + task title + notes
- Waiting party changes → update task notes + calendar summary (⚠️ BİZDE tag)
- Ticket status changes → update task status + calendar event

**Rule: Every `gcal_update_event` that changes start/end MUST be followed by a `mcp__gtasks-mcp__update` with the matching `due` date (YYYY-MM-DD of the event start).** Never update calendar without updating the corresponding task.

### Step 6: Execute — Google Tasks

First, find "Infoset Tickets" task list:
```
mcp__gtasks-mcp__list-tasklists
```
Save the `taskListId` for "Infoset Tickets". If not found, create it:
```
mcp__gtasks-mcp__create-tasklist:
  title: "Infoset Tickets"
```

**CRITICAL — Notes formatting:**
The `notes` parameter must use REAL newlines, not `\n` literals. When calling `mcp__gtasks-mcp__create` or `mcp__gtasks-mcp__update`, write the notes value as a multi-line string with actual line breaks. The MCP tool sends `\n` as literal text if you escape it.

**Notes template (use real line breaks between each line):**
```
{detailed_action_description — 2-3 sentences explaining what to do, what to check, and context about the issue. Turkish.}

Müşteri: {companyName} ({contactName})
Son Aktivite: {last activity summary — who said what, 1 sentence}
Bekleyen Taraf: {determine from last activity log — if last actor isAgent=true → "Müşteride bekliyor", if last actor isAgent=false → "Bizde bekliyor ({agent name from previous agent activity if available})", if unclear → "Belirsiz"}
Açık: {days_open} gündür bekliyor

Kategori: {category}
Öncelik: {priority_score}/100
Tahmini Efor: {effort_hours} saat
Takvim: {DD.MM HH:MM-HH:MM}

https://dashboard.infoset.app/tickets/{id}
```

**For NEW tickets:**
```
mcp__gtasks-mcp__create:
  taskListId: "{taskListId}"
  title: "{analysis.title}"
  notes: (see template above — REAL newlines, detailed description)
  due: "{scheduledDate or dueDate}"
```
Save returned task `id` and construct `uri` as: `https://www.googleapis.com/tasks/v1/lists/{taskListId}/tasks/{taskId}`

**For UPDATED tickets** (that have googleTaskId in state):
```
mcp__gtasks-mcp__update:
  id: "{state.tickets[id].googleTaskId}"
  uri: "{state.tickets[id].googleTaskUri}"
  taskListId: "{taskListId}"
  title: "{analysis.title}"
  notes: (see template above — REAL newlines, detailed description)
```

**For CLOSED tickets** (that have googleTaskId in state):
```
mcp__gtasks-mcp__update:
  id: "{state.tickets[id].googleTaskId}"
  uri: "{state.tickets[id].googleTaskUri}"
  status: "completed"
```

**For REOPENED tickets** (that have googleTaskId in state with completedAt set):
```
mcp__gtasks-mcp__update:
  id: "{state.tickets[id].googleTaskId}"
  uri: "{state.tickets[id].googleTaskUri}"
  taskListId: "{taskListId}"
  title: "{analysis.title}"
  notes: (see template above — REAL newlines)
  status: "needsAction"
  due: "{new scheduledDate}"
```
Clear `completedAt` and `resolvedAt` in state after reactivation.

**If `--dry-run`:** Skip all Google Tasks writes.

### Step 7: Execute — Google Calendar

**Color mapping:**
- Score 80-100 → colorId "11" (Tomato)
- Score 60-79 → colorId "6" (Tangerine)
- Score 40-59 → colorId "5" (Banana)
- Score 20-39 → colorId "7" (Peacock)
- Score 1-19 → colorId "2" (Sage)

**For NEW tickets with planned slots:**
```
mcp__claude_ai_Google_Calendar__gcal_create_event:
  calendarId: "primary"
  sendUpdates: "none"
  event:
    summary: "{emoji} [{score}] {company} - {subject} (#{id})"
    description: "{action_summary}\n\nhttps://dashboard.infoset.app/tickets/{id}"
    start: {dateTime: "{slot.start}", timeZone: "Europe/Istanbul"}
    end: {dateTime: "{slot.end}", timeZone: "Europe/Istanbul"}
    colorId: "{colorId}"
```
Save returned event `id` as `calendarEventId`.
If effort splits into multiple slots, create additional events for each slot.

**For UPDATED tickets** (with calendarEventId in state):
```
mcp__claude_ai_Google_Calendar__gcal_update_event:
  calendarId: "primary"
  eventId: "{state.tickets[id].calendarEventId}"
  sendUpdates: "none"
  event:
    summary: "{updated summary}"
    description: "{updated description}"
    colorId: "{updated colorId}"
```

**For CLOSED tickets** (with calendarEventId in state):
DELETE the calendar event to free the slot for replanning:
```
mcp__claude_ai_Google_Calendar__gcal_delete_event:
  calendarId: "primary"
  eventId: "{state.tickets[id].calendarEventId}"
  sendUpdates: "none"
```
Set `calendarEventId: null` in state after deletion. The freed slot will be available for other tickets during replanning.

**IMPORTANT — CLOSED event exclusion:** Before running the slot planning algorithm (Step 5), exclude calendar events belonging to CLOSED tickets from the existing events list. This ensures freed slots are immediately available for NEW/UPDATED ticket planning.

**For REOPENED tickets** (that had calendarEventId but it was deleted when CLOSED):
Create a NEW calendar event with planned slot:
```
mcp__claude_ai_Google_Calendar__gcal_create_event:
  calendarId: "primary"
  sendUpdates: "none"
  event:
    summary: "{emoji} [{score}] {company} - {subject} (#{id})"
    description: "{action_summary}\n\nhttps://dashboard.infoset.app/tickets/{id}"
    start: {dateTime: "{slot.start}", timeZone: "Europe/Istanbul"}
    end: {dateTime: "{slot.end}", timeZone: "Europe/Istanbul"}
    colorId: "{colorId}"
```
Save new `calendarEventId` in state. Clear `completedAt` and `resolvedAt`.

**If `--dry-run`:** Skip all Google Calendar writes.

### Step 8: Save State

Write updated state to `/mnt/c/dev/infoset-mcp/data/state.json` via Write tool.

For each processed ticket, state entry must include:
```json
{
  "ticketId": ...,
  "subject": "...",
  "status": ...,
  "priority": ...,
  "googleTaskId": "...",
  "googleTaskUri": "...",
  "calendarEventId": "...",
  "category": "...",
  "priorityScore": ...,
  "effortHours": ...,
  "actionSummary": "...",
  "scheduledDate": "YYYY-MM-DD",
  "scheduledStart": "...",
  "scheduledEnd": "...",
  "contactName": "...",
  "companyName": "...",
  "createdBySync": true,
  "completedAt": null,
  "resolvedAt": null,
  "syncedAt": "{now ISO}"
}
```

**CLOSED tickets state update:**
- Set `completedAt: "{now ISO}"`, `calendarEventId: null` (event was deleted)
- Keep `googleTaskId` (task is marked completed, not deleted)

**REOPENED tickets state update:**
- Clear `completedAt: null`, `resolvedAt: null`
- Set new `calendarEventId` from newly created event
- Update all analysis fields (score, effort, category, etc.)
```

Also write status.json:
```json
{
  "lastSync": "{now ISO}",
  "lastSyncStatus": "success",
  "ticketsActive": ...,
  "ticketsSynced": ...,
  "totalSyncs": ...
}
```

### Step 9: Report

Show formatted table:

```
Sync tamamlandi ({totalTickets} ticket, {changedCount} degisiklik)

| #ID     | Firma       | Islem       | Oncelik | Efor | Takvim Tarihi     |
|---------|-------------|-------------|---------|------|-------------------|
| 8837516 | Demisas     | YENI        | 🔴 85   | 2s   | 17.03 09:00-11:00 |
| 8901234 | Paratic     | GUNCELLEME  | 🟡 45   | 1s   | 17.03 13:10-14:10 |
| 8876543 | Ininal      | KAPANDI     | ✅ --   | --   | --                |
| 8812345 | Goldnet     | ATLANDI     | ⚪ --   | --   | --                |
```

Islem values: YENI, GUNCELLEME, KONU_DEGISTI, KAPANDI, YENIDEN_ACILDI, ATLANDI

---

## Clean Mode

1. Read state.json — identify ticket IDs with status 1 or 2 as "active"
2. Fetch current tickets from Infoset API via `mcp__infoset__infoset_list_tickets` (status [1,2]) to detect orphans (tickets no longer in API)
3. Build active ticket set: tickets in state with status 1/2 AND still present in Infoset API
4. List task lists via `mcp__gtasks-mcp__list-tasklists` → find "Infoset Tickets" ID
5. List all tasks via `mcp__gtasks-mcp__list`
6. List calendar events via `gcal_list_events` (next 30 days)
7. For each task/event linked to an INACTIVE ticket in state (not in active set):
   - Delete task via `mcp__gtasks-mcp__delete`
   - DELETE calendar event via `gcal_delete_event` (not mark completed — free the slot)
8. Update state for cleaned tickets:
   - Set `googleTaskId: null`, `calendarEventId: null`, `completedAt: "{now ISO}"`
9. Remove orphan state entries: tickets not in Infoset API AND without `completedAt`
10. Save updated state.json
11. Report: "{n} tasks deleted, {m} events deleted, {k} orphan state entries removed"

---

## Important Rules

- **All ticket analysis happens in THIS session** — never shell out to `claude` CLI
- **All Google writes use MCP tools** — never use Node.js scripts for Google API
- **State is the source of truth** for mapping ticketId ↔ googleTaskId/calendarEventId
- **sendUpdates: "none"** on all calendar writes — no email notifications
- **Europe/Istanbul timezone** for all datetime operations
- **Turkish** for all user-facing text (action_summary, titles, report)
