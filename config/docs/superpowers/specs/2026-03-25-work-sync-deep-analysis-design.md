# Work Sync — Deep Analysis, Caching & Parallel Agents

## Problem

work-sync analyzes tickets/tasks in isolation. References to other items inside descriptions/comments are ignored. Analysis runs sequentially on all items every sync, including unchanged ones.

## Goals

1. Discover and fetch items referenced inside ticket/task content (1-level deep)
2. Cache analysis results so unchanged items skip re-analysis
3. Parallelize analysis across tiered subagents (opus/sonnet/haiku)

## Non-Goals

- Recursive reference traversal (2+ levels)
- Automatic effort adjustment from dependencies
- Changing the existing matching logic (Step 2) — this extends it

---

## 1. Related Item Discovery

### 1.1 New Step: Step 2.8 — Discover Related Items

**Prerequisite:** State must be loaded before this step runs. Split existing Step 3 into:
- **Step 2.75: Load State** — read `state.json` (moved from Step 3)
- **Step 2.8: Discover Related Items** — uses loaded state for cache lookups
- **Step 3: Detect Changes** — compare current data against loaded state (remains)

Runs after Step 2.7 (auto-create) and state loading. Scans all items in `currentInfosetTickets` and `currentDevOpsItems` for references to other items.

### 1.2 Reference Patterns

All patterns applied to every text field of every item.

**URL patterns (high confidence):**

| Pattern | Extracts |
|---|---|
| `dashboard\.infoset\.app/tickets/(\d+)` | Infoset ticket ID |
| `polynomtech\.visualstudio\.com/.*_workitems/edit/(\d+)` | DevOps work item ID |

**Text patterns (medium confidence — 4+ digit IDs only to avoid false positives):**

| Pattern | Extracts |
|---|---|
| `#(\d{4,})` | Generic ID (disambiguated by range — see below) |
| `ticket\s*(\d{4,})` | Infoset ticket ID |
| `task\s*(\d{4,})` | DevOps work item ID |
| `bug\s*(\d{4,})` | DevOps work item ID |
| `bkz\.?\s*(\d{4,})` | Generic ID |
| `ilgili\s*:?\s*(\d{4,})` | Generic ID |
| `aynı\s+sorun.*?(\d{4,})` | Generic ID |

**DevOps Relations API (zero-cost — already fetched via `$expand=all`):**

Extract from `relations[]` array:
- `System.LinkTypes.Hierarchy-Forward` (child)
- `System.LinkTypes.Hierarchy-Reverse` (parent)
- `System.LinkTypes.Related` (related)
- Extract work item ID from relation URL: `/workItems/(\d+)$`

**`relationType` enum:**

| Value | Source |
|---|---|
| `url-reference` | Infoset or DevOps URL pattern match |
| `text-reference` | Turkish text pattern match (#, bkz, ilgili, ticket, task, bug) |
| `devops-parent` | DevOps Relations Hierarchy-Reverse |
| `devops-child` | DevOps Relations Hierarchy-Forward |
| `devops-related` | DevOps Relations Related |

### 1.3 ID Disambiguation

Generic IDs (from `#(\d{4,})`, `bkz`, `ilgili`, `aynı sorun`) need disambiguation:

| Condition | Classification |
|---|---|
| ID already in `currentDevOpsItems` | DevOps (known) |
| ID already in `currentInfosetTickets` | Infoset (known) |
| ID >= 1000000 (7+ digits) | Infoset ticket ID (Infoset IDs are large) |
| ID < 100000 (5 digits or less) | DevOps work item ID (DevOps IDs are small) |
| 100000-999999 (6 digits) | Ambiguous — try DevOps first (cheaper API call), fallback to Infoset |

### 1.4 Scan Sources Per Item Type

**Infoset tickets — scan these fields:**
- Ticket description/content (from `get_ticket` detail)
- Activity logs text (from `get_ticket_logs`)
- Email content if email type activity exists

**DevOps work items — scan these fields:**
- `System.Description`
- `Microsoft.VSTS.TCM.ReproSteps`
- Comment text (already fetched in Step 1b)
- Relations array (already in response from `$expand=all`)

### 1.5 Fetch Related Items

After collecting all referenced IDs across all items:

1. Remove IDs already in `currentInfosetTickets` or `currentDevOpsItems` (already fetched)
2. Remove IDs already in `state.relatedItems` where item is Closed and hash unchanged (cache hit)
3. Group remaining by source: Infoset IDs and DevOps IDs

**Infoset — batch fetch:**
```
mcp__infoset__infoset_batch_get_tickets:
  ticketIds: [unique new Infoset IDs]
```

**DevOps — batch fetch:**
```
GET https://polynomtech.visualstudio.com/Fin_Dev26/_apis/wit/workitems?ids={comma-separated}&$expand=all&api-version=7.1
```

4. For each fetched related item, extract and store:
   - `id`, `source` (infoset/devops), `title`/`subject`, `state`/`status`, `priority`, `assignedTo`, `description`/`content`, `changedDate`/`updatedDate`, `sprint` (DevOps only)
   - Content hash (SHA-256 of JSON.stringify of extracted fields)

5. Store in `state.relatedItems[id]`:
```json
{
  "id": 13200,
  "source": "devops",
  "title": "ERP entegrasyon hatası",
  "state": "Active",
  "priority": 2,
  "assignedTo": "Koray Kavruk",
  "description": "...",
  "sprint": "Sprint6",
  "contentHash": "abc123...",
  "fetchedAt": "2026-03-25T10:00:00Z"
}
```

6. Build a `relatedItemsMap`: for each main item, list its related item IDs with relationship type:
```json
{
  "wp-M8756287": [
    { "relatedId": 13200, "source": "devops", "relationType": "url-reference" },
    { "relatedId": 8750001, "source": "infoset", "relationType": "text-reference" }
  ]
}
```

### 1.6 Scoring Impact

During analysis (Step 4b), for each main item, evaluate its related items:

| Condition | Score Impact |
|---|---|
| Related item is in blocker/On Hold state | +10 |
| Related item is from same customer and still open | +10 |
| Related item has been carried across sprints (sprintsCarried > 0) | +5 |
| Related item is Closed | +0 (context only) |

Cap: max +20 from related items (prevent score inflation from many relations).

**Placement in scoring waterfall:** Related-items bonus is applied AFTER all existing Infoset and DevOps weights, BEFORE the final cap at 100. Listed under a new sub-section "Related-items weights" in the scoring rules.

### 1.7 Notes Integration

Add to unified notes template after existing fields:

```
İlişkili:
- #{id} {title} ({state}, {assignedTo}) — {relationType}
- #{id} {title} ({state}) — {relationType}
```

---

## 2. Analysis Caching

### 2.1 Change Detection — Main Items

**Infoset tickets:**
`list_tickets` response includes `updatedDate` per ticket. Compare against `state.workItems[wpId].lastUpdatedDate`.
- Same → SKIP (use cached analysis)
- Different → UPDATED (re-analyze changed fields)

**DevOps work items:**
`System.ChangedDate` from WIQL batch response. Compare against `state.workItems[wpId].lastChangedDate`.
- Same → SKIP
- Different → UPDATED

### 2.1.5 Related Items Cleanup

On each sync, clean `state.relatedItems`:
- Remove entries where `fetchedAt` is older than 30 days AND the item is Closed AND no active main item references it (via `relatedItemIds`)
- This prevents unbounded growth of the related items cache

### 2.2 Change Detection — Related Items

Related items are not in the main list, so `ChangedDate` is not available without fetching.

**Decision tree:**
1. Related item is Closed in `state.relatedItems` → skip fetch entirely (closed items don't change meaningfully)
2. Related item is Open/Active in `state.relatedItems` → fetch, compare `contentHash`
   - Hash same → use cached data
   - Hash different → update cache, flag parent items as needing re-analysis

### 2.3 State Extensions

Add to `state.json`:

```json
{
  "workItems": {
    "wp-M8756287": {
      "...existing fields...",
      "lastUpdatedDate": "2026-03-23T15:00:00Z",
      "lastChangedDate": "2026-03-23T15:00:00Z",
      "relatedItemIds": [
        { "relatedId": 13200, "source": "devops", "relationType": "url-reference" },
        { "relatedId": 8750001, "source": "infoset", "relationType": "text-reference" }
      ],
      "cachedAnalysis": {
        "category": "Entegrasyon Sorunu",
        "priorityScore": 85,
        "effortHours": 2.0,
        "actionSummary": "...",
        "tier": 1,
        "waitingParty": "Deploy bekliyor",
        "scoringBreakdown": { "base": 50, "sla": 0, "age": 15, "related": 10, "state": 20 }
      }
    }
  },
  "relatedItems": {
    "13200": {
      "id": 13200,
      "source": "devops",
      "title": "ERP entegrasyon hatası",
      "state": "Active",
      "priority": 2,
      "assignedTo": "Koray Kavruk",
      "description": "...",
      "sprint": "Sprint6",
      "contentHash": "abc123...",
      "fetchedAt": "2026-03-25T10:00:00Z"
    }
  }
}
```

### 2.4 Cache Invalidation

A cached analysis is invalidated (item must be re-analyzed) when ANY of:
- Main item's `ChangedDate`/`updatedDate` differs from stored
- Any of its related items' `contentHash` changed
- Related item list itself changed (compare `relatedItemIds` array on work item vs newly discovered list)
- Item was previously SKIP but a NEW related item appeared referencing it

**Reclassification:** Items invalidated through cache rules are reclassified from SKIP to UPDATED before Step 4a runs. This ensures they receive enrichment and re-analysis.

### 2.5 UPDATED Items

UPDATED items receive full re-analysis (same as NEW). The previous cached analysis is provided as reference context to the subagent, helping it maintain consistency. There is no partial/delta analysis — agents always produce a complete result. Pass 2 validates consistency.

---

## 3. Parallel Analysis Subagents

### 3.1 Pre-Classification (runs in main session)

Before dispatching subagents, perform a quick signal scan on each non-SKIP item to determine tier:

**Critical signals (→ opus):**
- Infoset priority = 4 (Urgent) or "ACIL"/"URGENT" in subject
- SLA breach < 4 hours remaining
- DevOps priority = 1
- DevOps state = Deployment AND sprint overdue
- Total outage keywords (case-insensitive, Turkish locale): "çalışmıyor", "hiç gelmiyor", "tamamen durdu", "calısmiyor"

**Medium/High signals (→ sonnet):**
- Infoset priority = 3 (High)
- DevOps priority = 2
- Open > 14 days
- DevOps state = Active or On Hold
- SLA breach < 24 hours
- Partial issue keywords

**Low signals (→ haiku):**
- Everything else (priority 1-2, backlog, no urgency signals)

### 3.2 Agent Dispatch

| Tier | Model | Max Agents | Items/Agent |
|---|---|---|---|
| Critical | opus | 1 | 1-3 items |
| Medium/High | sonnet | 2 | balanced split |
| Low | haiku | 4 | balanced split |

**Empty tier → no agent spawned.** Practical total: 3-7 agents.

**Balanced split:** If a tier has N items and M max agents, each agent gets ceil(N/M) items. If N <= max agents, use N agents with 1 item each.

**Error handling:**
- Agent timeout: 120 seconds per agent. If exceeded, log warning and re-analyze failed items in main session (sonnet fallback).
- Agent crash/empty result: retry once. If still fails, fall back to main session analysis for those items.
- Partial results accepted: if 6 of 7 agents succeed, use their results and only retry/fallback the failed agent's items.
- Never block the entire sync on a single agent failure.

### 3.3 Agent Input

Each subagent receives a self-contained JSON payload:

```json
{
  "items": [
    {
      "workPlanId": "wp-M8756287",
      "source": "both",
      "infosetData": { "...enriched ticket..." },
      "devopsData": { "...enriched work item..." },
      "relatedItems": [
        { "id": 13200, "source": "devops", "title": "...", "state": "...", "description": "...", "relationType": "..." }
      ],
      "previousAnalysis": null,
      "deltaFields": null
    }
  ],
  "scoringRules": "...full scoring rules text from work-sync...",
  "effortEstimationGuide": "...full effort guide text...",
  "currentSprint": "Sprint6",
  "today": "2026-03-25"
}
```

For UPDATED items, `previousAnalysis` is provided as reference context. The agent performs a full re-analysis (not partial) but can use previous values as baseline. Pass 2 catches inconsistencies.

### 3.4 Agent Output

Each subagent returns structured JSON:

```json
{
  "analyses": [
    {
      "workPlanId": "wp-M8756287",
      "category": "Entegrasyon Sorunu",
      "priorityScore": 85,
      "effortHours": 2.0,
      "actionSummary": "KPMG ERP entegrasyonu deploy edilmeli...",
      "title": "🔴 [85] KPMG - Highlight Edilmesi (#8756287)",
      "tier": 1,
      "waitingParty": "Deploy bekliyor",
      "needsCodebaseCheck": true,
      "relatedItemsSummary": "İlişkili: #13200 ERP hatası (Active, Koray)",
      "scoringBreakdown": { "base": 50, "sla": 0, "age": 15, "related": 10, "state": 20 }
    }
  ]
}
```

### 3.5 Result Merge & Pass 2

**Runs in the main session (not in a subagent)** to preserve full cross-item context:
1. Collect all agent results
2. Merge into single work plan list
3. Inject SKIP items' cached analyses into the merged list
4. Run Pass 2 self-review (score consistency, tier validation, duplicate detection, scoring breakdown validation)
5. Resolve any cross-agent inconsistencies (e.g., same customer scored differently by different agents)
6. Persist `scoringBreakdown` in `cachedAnalysis` for debugging across sync runs

---

## 4. Pipeline Flow (Updated)

```
Step 1a: Fetch Infoset (batch)     ─┐
Step 1b: Fetch DevOps (batch)      ─┤ PARALLEL
                                    ↓
Step 2: Match Infoset ↔ DevOps
Step 2.5: Apply Stage Filter
Step 2.7: Auto-Create DevOps Tasks
Step 2.75: Load State               ← NEW (split from old Step 3)
  - Read state.json
Step 2.8: Discover Related Items    ← NEW
  - Scan all items for references (regex + Relations API)
  - Disambiguate generic IDs
  - Check cache (closed + in state → skip, open → fetch + hash compare)
  - Batch fetch uncached related items
  - Clean up stale related items (30-day TTL)
                                    ↓
Step 3: Detect Changes              ← (was Load State + Detect Changes)
  - Compare ChangedDate/updatedDate for main items
  - Check relatedItems cache invalidation
  - Reclassify SKIP → UPDATED if related items changed
  - Classify: NEW / UPDATED / SKIP / CLOSED / REOPENED
                                    ↓
Step 4a: Enrich Data (batch tools)
  - batch_get_tickets + batch_get_ticket_logs  ─┐ PARALLEL
  - batch_get_contacts + batch_get_companies   ─┘ PARALLEL
  - SKIP items: no enrichment needed (cached)
                                    ↓
Step 4a.5: Pre-Classify Tiers      ← NEW
  - Quick signal scan (keywords, priority, SLA, state)
  - Assign each non-SKIP item to: critical / medium-high / low
                                    ↓
Step 4b: Parallel Analysis          ← NEW (was sequential)
  - Dispatch 1 opus + 2 sonnet + 4 haiku (max 7, skip empty tiers)
  - Each agent: full scoring + effort + waiting party + related context
  - SKIP items: use cachedAnalysis from state
  - UPDATED items: receive previousAnalysis + deltaFields
                                    ↓
Step 4b merge: Collect + Pass 2
  - Merge all agent results
  - Self-review: consistency, duplicates, tier validation
                                    ↓
Step 4b-extra: Write Effort → DevOps (unchanged)
Step 4c: (removed — merged into 4b merge as Pass 2)
                                    ↓
Steps 5-9: unchanged (Work Plan → Calendar → Tasks → Report → State)
```

## 5. work-sync.md Changes Required

| Section | Change |
|---|---|
| New Step 2.75 | Split state loading from old Step 3 |
| New Step 2.8 | Add "Discover Related Items" section after Step 2.75 |
| Step 3 | Rename to "Detect Changes". Add `lastUpdatedDate`/`lastChangedDate` comparison + related items cache check + SKIP→UPDATED reclassification |
| Step 4a | Already updated for batch tools. Add SKIP-item bypass. |
| New Step 4a.5 | Add pre-classification logic for tier assignment |
| Step 4b | Replace sequential analysis with parallel subagent dispatch (max 7 agents: 1 opus, 2 sonnet, 4 haiku) |
| Step 4c | Remove (merged into 4b merge as Pass 2, runs in main session) |
| State schema | Document `cachedAnalysis` (with `scoringBreakdown`), `relatedItems`, `relatedItemIds` (top-level on work item), `lastUpdatedDate`/`lastChangedDate`, `contentHash` |
| Notes template | Add "İlişkili:" section |
| Scoring section | Add "Related-items weights" sub-section after DevOps weights, before cap. Max +20. |

## 6. MCP Changes Required

None — batch tools already implemented (Infoset v2.3.0, gtasks batch-create/batch-update). No new MCP tools needed.
