---
description: "Playbook — automated offensive security pipeline: recon (3 waves), vulnerability assessment (2A-2Z+), adaptive exploitation, post-exploitation operations, DOCX report generation"
---

# Playbook

Automated offensive security pipeline. Recon, adaptive vulnerability assessment, aggressive auto-exploitation with post-exploitation operations across 15 access types, and professional DOCX reporting.

**Data dir:** `/mnt/c/dev/pentest-framework/data/<domain>/`
**Target profiles:** `~/.claude/docs/pentest-targets/`
**Playbook (split):**
- `~/.claude/docs/pentest-playbook.md` — hub: tools, phase 0/0.5, phase 4/5, refs
- `~/.claude/docs/pentest-recon.md` — Phase 1: recon (3 waves)
- `~/.claude/docs/pentest-assessment.md` — Phase 2 + 2.5: assessment + correlation
- `~/.claude/docs/pentest-exploitation.md` — Phase 3A/3B: exploit chains + arsenals
- `~/.claude/docs/pentest-counter-breach.md` — Phase 3C: counter-breach
**Core architecture:** `~/.claude/docs/pentest-architecture.md`
**Operating rules:** `~/.claude/docs/pentest-operations.md`
**Tool inventory:** `~/.claude/docs/kali-mcp/tool-inventory.md`
**Capability matrix:** `~/.claude/docs/kali-mcp/capability-matrix.md`

## Arguments

Parse `$ARGUMENTS`:

```
/playbook <url> [flags]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<target>` | Yes | URL, IP address, CIDR range, or flag-based target (auto-detected) |
| `--depth short\|standard\|deep` | No | Time budget (default: standard) |
| `--scope web\|infra\|full` | No | Test scope (default: full) |
| `--resume` | No | Continue from last checkpoint, skip completed tests |
| `--skip-recon` | No | Skip recon phases, jump straight to assessment using existing recon data |
| `--report-only` | No | Generate DOCX report from existing findings.json, no new scanning |
| `--counter-breach` | No | Skip recon/assessment — direct access + Phase 3C counter-breach operations on YOUR OWN compromised server |
| `--prepare-defense` | No | Install Layer 1 defensive mechanisms on YOUR OWN server (break glass, tunnel, canary, deadman switch) |
| `--emergency-recover` | No | Unprepared recovery — hosting provider contact, DNS redirect, backup restore guide |

**Time budgets:**

| Depth | Budget | Tier coverage |
|-------|--------|---------------|
| short | 8 hours | Tier 1 only (critical vectors) |
| standard | 40 hours | Tier 1 + 2 (all high-probability) |
| deep | 80 hours | Tier 1 + 2 + 3 (exhaustive) |

**Scope modifiers:**

| Scope | Behavior |
|-------|----------|
| web | Web app only — skip nmap/infra scans |
| infra | Infrastructure only — skip web app tests |
| full | Everything — web + infra + API |

**Flags:**

| Flag | Description |
|------|-------------|
| `--wifi` | Scan nearby WiFi networks and attack |
| `--bluetooth` | BLE device scan + exploitation |
| `--ad <DC_IP>` | Active Directory domain attack |
| `--cloud aws\|azure\|gcp` | Cloud infrastructure assessment |
| `--iot <IP:PORT>` | Industrial protocol testing |
| `--mobile <APK\|IPA>` | Mobile app analysis |
| `--full-spectrum` | Every applicable module |
| `--team` | Multi-agent swarm mode |
| `--apt APT28\|APT29\|LAZARUS` | Adversary emulation |
| `--purple` | Attack + detect simultaneously |
| `--stealth` | Low-and-slow, evasion-first |
| `--noisy` | Maximum speed, no stealth |
| `--continuous` | Continuous ASM monitoring |
| `--comply PCI\|ISO\|NIST\|KVKK` | Map findings to compliance framework |
| `--social` | Include social engineering vectors |
| `--osint-only` | OSINT only, no active scanning |
| `--org <name>` | Load org-specific templates |
| `--wifi-deauth` | Aggressive WiFi (includes deauth) |
| `--pivot` | Enable lateral movement after foothold |
| `--quick-wins` | 15-min fast checks only |
| `--confirm-exploit` | Require human confirmation before each exploit (disables auto-exploit) |

**CRITICAL — Flag routing (check BEFORE doing anything else):**

0. If `$ARGUMENTS` contains `--quick-wins` → jump directly to **Quick Wins Mode**. Skip all other phases.
1. If `$ARGUMENTS` is empty → display help text below and **STOP. Do not proceed to any phase.**
2. If `$ARGUMENTS` contains `--help` or `-h` → display help text below and **STOP. Do not proceed to any phase.**
3. If `$ARGUMENTS` contains `--report-only` → jump directly to **Phase 4: Reporting**. Skip all other phases.
4. If `$ARGUMENTS` contains `--counter-breach` → jump directly to **Counter-Breach Mode**. Skip all other phases.
5. If `$ARGUMENTS` contains `--prepare-defense` → jump directly to **Defense Preparation Mode**. Skip all other phases.
6. If `$ARGUMENTS` contains `--emergency-recover` → jump directly to **Emergency Recovery Mode**. Skip all other phases.
7. Otherwise → proceed to **Phase 0: Target Init** with the URL and flags.
8. If `$ARGUMENTS` contains `--osint-only` → run ONLY Phase 1 Wave 0 (OSINT) then skip to Phase 4. Load pentest-osint.md.
9. If `$ARGUMENTS` contains `--apt` → load pentest-adversary-emulation.md, apply APT profile TTPs throughout all phases.
10. If `$ARGUMENTS` contains `--purple` → load pentest-purple-team.md, measure detection after each attack.
11. If `$ARGUMENTS` contains `--social` → include pentest-social-engineering.md and pentest-phishing.md in Phase 2.
12. If `$ARGUMENTS` contains `--stealth` → apply stealth parameters from section 0.0.8 to all tool calls.
13. If `$ARGUMENTS` contains `--noisy` → use maximum speed/threads for all tools (nmap -T5, feroxbuster -t 100, etc.)
14. If `$ARGUMENTS` contains `--continuous` → after full scan, enter monitoring loop per pentest-continuous-asm.md.
15. If `$ARGUMENTS` contains `--pivot` → after exploitation, enable lateral movement per pentest-ip-intrusion.md Phase 3IP Layer 3.

---

## Help Mode

Display:
```
=== Playbook — Offensive Security Pipeline ===

/playbook <url>                        Full pipeline: recon → vuln assessment → exploitation → report
/playbook <url> --depth short          Quick test (8 hours, critical vectors only)
/playbook <url> --depth deep           Deep test (80 hours, all vectors)
/playbook <url> --scope web            Web application only (nmap/infra skipped)
/playbook <url> --scope infra          Infrastructure only (web app skipped)
/playbook <url> --resume               Resume previous test from last checkpoint
/playbook <url> --skip-recon           Skip recon, proceed to assessment with existing data
/playbook <url> --report-only          Generate DOCX report from existing findings
/playbook <url> --counter-breach       Emergency: your server is compromised — access + protection
/playbook 192.168.1.100                    Direct IP penetration test
/playbook 10.0.0.0/24                      Subnet scan
/playbook --wifi                           Scan and attack nearby WiFi networks
/playbook --ad 192.168.1.1                Active Directory attack
/playbook <url> --team                     Multi-agent swarm mode
/playbook <url> --apt APT28               APT28 adversary emulation
/playbook <url> --purple                   Purple team (attack + detect simultaneously)
/playbook <url> --stealth                  Stealth mode (slow, evades IDS)
/playbook <url> --quick-wins               Quick results in 15 minutes
/playbook <url> --comply PCI               PCI DSS compliance mapping

Flag combinations:
  --depth deep --scope web            Deep web test
  --resume --depth standard           Resume with standard budget

Pipeline phases:
  Phase 0:   Target init + kali-mcp session
  Phase 0.5: Prioritization (Tier 1 → 2 → 3)
  Phase 1:   Automated recon (3 waves — DNS, nmap, feroxbuster, nuclei, katana...)
  Phase 2:   Vulnerability assessment (2A-2U: Auth, API, Injection, GraphQL, gRPC, WebSocket, SSE, Web3, Supply Chain...)
  Phase 2.5: Finding correlation + attack chain construction
  Phase 3:   Exploitation (with user approval)
  Phase 3C:  Counter-breach (protect your own server — only with --counter-breach)
  Phase 4:   DOCX report generation
  Phase 5:   State save

Tools (via kali-mcp):
  nmap, nuclei, feroxbuster, ffuf, katana, httpx, gau, sqlmap, hydra,
  grpcurl, nikto, gobuster, metasploit, openssl, shred + 20 more

Outputs:
  Findings DB:  /mnt/c/dev/pentest-framework/data/<domain>/findings.json
  Evidence:     /mnt/c/dev/pentest-framework/data/<domain>/evidence/
  DOCX Report:  C:\dev\kali-mcp\pentest-reports\<domain>-pentest-raporu.docx
  Target State: ~/.claude/docs/pentest-targets/<domain>.md

Playbook:       ~/.claude/docs/pentest-playbook.md
Tool Inventory: ~/.claude/docs/kali-mcp/tool-inventory.md
================================
```
Done — stop here.

---

## Quick Wins Mode

Run ONLY the highest-probability, lowest-effort checks (~15 min):

1. Default credentials on detected login forms
2. Unauthenticated API endpoints (/api, /swagger, /graphql)
3. Security header check
4. robots.txt / .env / .git/HEAD exposure
5. SSL/TLS weakness check
6. nuclei -severity critical scan
7. Anonymous FTP/SMB/Redis/MongoDB check
8. Docker API unauthenticated (2375)
9. Elasticsearch/Kibana open access (9200, 5601)

After quick wins: display findings and recommend full assessment if issues found.
Skip: Phase 2 detailed tests, Phase 3 exploitation, Phase 2.5 correlation.

---

## CRITICAL RULES

**Read before executing:**

1. **All analysis happens in THIS session.** Never shell out to `claude` CLI. Never spawn external Claude processes.
2. **All kali-mcp calls use MCP tools** — `mcp__kali-mcp__*` tools directly. Never wrap in bash unless kali-mcp has no equivalent.
3. **Browser automation is budgeted.** Prefer `kali-mcp` primitives first (`fetch`, `header_analysis`, `form_analysis`, `spider_website`, `web_enumeration`). Use HakanMCP browser wrappers only for login-gated flows, JS-only proof, or screenshots. Raw browser calls go through HakanMCP `mcp_callTool` only when wrappers are insufficient.
4. **English for all user-facing output.** Tool calls, JSON, evidence files stay in English.
5. **Evidence on every finding.** No finding gets committed to findings.json without at minimum one evidence artifact.
6. **findings.json is source of truth.** All phase state, finding metadata, coverage tracking lives here.
7. **Real newlines in notes/descriptions.** Never use `\n` literal strings.
8. **Authorized targets only.** Read `~/.claude/docs/pentest-targets/<domain>.md` — if target not listed and not obviously a test/internal domain, ask user for authorization confirmation before proceeding.
9. **Deduplication always.** Before adding a finding, compute dedupeKey and check existing findings. Merge evidence, don't create duplicates.
10. **Load only relevant plugin docs.** Do not preload unrelated modules; follow `pentest-architecture.md`.
11. **Aggressive auto-exploit.** When a vulnerability is confirmed during Phase 2, immediately execute the matching exploit recipe from `playbook-exploit.md` before moving to the next test. Do not wait for Phase 3. The intrusion loop (FIND → BREACH → PROVE → DEEPEN) runs automatically. Human confirmation is only required if `--confirm-exploit` flag is set.
12. **Depth-first exploitation.** When exploitation yields new access (credentials, shell, internal network), immediately use that access to discover and exploit further before continuing assessment. New attack surface feeds back into Phase 2.
13. **Phase gate — user approval required.** When each phase completes and sufficient data has been gathered within a phase, ask the user for approval BEFORE proceeding to the next step. Present a summary (findings discovered, coverage, gaps) and ask:
    - "Is sufficient data collected? Continue or go deeper?"
    - If user approves → proceed to next phase
    - If user says "continue" / "go deeper" / "more" → run additional tests in the same phase
    - This rule applies to ALL phase transitions: Recon→Assessment, Assessment→Exploit, Exploit→Report
    - The same approval mechanism applies between sub-steps within a phase (Wave 1→2→3, Tier 1→2→3)

---

## Phase 0: Target Init

### 0.0.5 — Detect Target Type

From `<target>` and flags, determine the flow:

| Pattern | Type | Flow |
|---------|------|------|
| `http[s]://...` | URL | Standard web pentest |
| `x.x.x.x` (IPv4) | IP | Load pentest-ip-intrusion.md |
| `x:x:x:x:x:x:x:x` (IPv6) | IP | Load pentest-ip-intrusion.md |
| `x.x.x.x/nn` (CIDR) | CIDR | Host discovery → per-host IP flow |
| `--wifi` flag | WiFi | Load pentest-wifi-assault.md |
| `--bluetooth` flag | BT | Load pentest-bluetooth.md |
| `--ad <DC_IP>` flag | AD | Load pentest-active-directory.md |
| `--cloud` flag | Cloud | Load pentest-cloud-pivot.md |
| `--iot` flag | IoT | Load pentest-iot-ot.md |
| `--mobile` flag | Mobile | Load pentest-mobile.md |
| `--full-spectrum` | All | Load all applicable modules (team mode recommended) |

### 0.0.6 — Authorization Tier Check

| Tier | Target Types | Action |
|------|-------------|--------|
| 1 | URL, OSINT | Proceed (existing model) |
| 2 | IP, CIDR | Confirm: "Do you have authorization to scan this IP range?" |
| 3 | WiFi, BT | Confirm: "WiFi/BT attacks may affect nearby devices. Authorization confirmed?" |
| 4 | Social eng. | Confirm: "Social engineering targets real individuals. Is written authorization in place?" |
| 5 | Destructive | Per-action confirmation required |

### 0.0.7 — Preflight Tool Check

Verify tools available for selected modules:
```bash
# Run in kali-mcp at session start
run("which nmap nuclei feroxbuster 2>/dev/null && echo 'Core OK' || echo 'Core MISSING'")
```

If tools missing for a selected module: list them, ask user to skip or install.

### 0.1 — Parse URL and Extract Domain

From `<url>`:
- Extract scheme, host, port
- Domain = host without `www.` prefix (e.g., `https://www.app.example.com` → domain = `app.example.com`; use base domain `example.com` for file naming)
- Set `TARGET_URL` = original URL as given
- Set `TARGET_DOMAIN` = extracted domain
- Set `DATA_DIR` = `/mnt/c/dev/pentest-framework/data/<domain>/`
- Set `FINDINGS_FILE` = `<DATA_DIR>/findings.json`
- Set `EVIDENCE_DIR` = `<DATA_DIR>/evidence/`

### 0.2 — Check Target Profile

Check if `~/.claude/docs/pentest-targets/<domain>.md` exists using Read tool.

**If file exists:**
- Read it
- Display previous findings summary:
  ```
  === Previous Pentest Data ===
  Target:         <domain>
  Last scan:      {lastScan}
  Total findings: {totalFindings} ({critical} critical, {high} high, {medium} medium, {low} low)
  Status:         Delta mode — completed tests will be skipped
  ============================
  ```
- Set `DELTA_MODE = true`

**If file does not exist:**
- Display:
  ```
  Target profile not found. Creating new profile: <domain>
  ```
- Create file from template (see **Appendix A: Target Profile Template**)
- Set `DELTA_MODE = false`

### 0.3 — Create Data Directories

Create directory structure:
```
/mnt/c/dev/pentest-framework/data/<domain>/
├── findings.json          (init if not exists)
├── evidence/
│   ├── screenshots/
│   ├── http-captures/
│   └── tool-outputs/
└── reports/
```

Use Bash tool to create dirs:
```bash
mkdir -p /mnt/c/dev/pentest-framework/data/<domain>/evidence/screenshots
mkdir -p /mnt/c/dev/pentest-framework/data/<domain>/evidence/http-captures
mkdir -p /mnt/c/dev/pentest-framework/data/<domain>/evidence/tool-outputs
mkdir -p /mnt/c/dev/pentest-framework/data/<domain>/reports
```

### 0.4 — Initialize findings.json

If `findings.json` does not exist, create:
```json
{
  "target": "<domain>",
  "targetType": "<detected type>",
  "targetUrl": "<TARGET_URL>",
  "created": "<ISO timestamp>",
  "lastScan": "<ISO timestamp>",
  "scanConfig": {
    "depth": "<depth>",
    "scope": "<scope>"
  },
  "findings": [],
  "chains": [],
  "coverage": {},
  "stats": {
    "totalFindings": 0,
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "info": 0,
    "velocity": 0,
    "hoursSpent": 0
  },
  "recon": {}
}
```

If `findings.json` already exists and `--resume` is set → read it, load `coverage` map to track completed tests.

### 0.5 — Create kali-mcp Session

```
mcp__kali-mcp__session_create:
  session_name: "pentest-<domain>-<YYYYMMDD>"
```

Save returned session ID as `KALI_SESSION`.

Display:
```
=== Pentest Starting ===
Target:    <TARGET_URL>
Domain:    <TARGET_DOMAIN>
Depth:     <depth> (<budget> hour budget)
Scope:     <scope>
Session:   <KALI_SESSION>
Data dir:  <DATA_DIR>
Mode:      <Delta / New scan>
=======================
```

---

## Phase 0.5: Prioritization

### Time Budget and Tier Selection

Based on `--depth`:
- `short` (8h): Run Tier 1 only
- `standard` (40h): Run Tier 1 + Tier 2
- `deep` (80h): Run Tier 1 + Tier 2 + Tier 3

**Tier definitions:**

| Tier | Tests | Priority |
|------|-------|----------|
| 1 | User enumeration (2B), BOLA sequential IDs (2C), rate limit (2M), swagger/API spec exposure, security headers (2N), robots.txt/sitemap info disclosure | Fast/cheap signal gathering — always run first |
| 2 | Auth bypass (2A), SQLi (2F), XSS (2G), SSRF (2J), XXE (2K), file upload (2I), JWT attacks (2D), business logic (2L), command injection (2H), open redirect (2O) | High probability — run if time allows |
| 3 | GraphQL (2P), gRPC (2Q), WebSocket, OAuth flows, race conditions, mass assignment (2E), advanced chaining | Exhaustive — deep only |

### Resume Check

If `--resume` is set:
- Read `coverage` from findings.json
- Build `SKIP_LIST` = all test IDs where `coverage[id].status == "completed"`
- Display: `{n} tests previously completed, skipping`
- **Note:** kali-mcp session outputs from previous runs are not available — only findings.json coverage data is restored. Raw tool output and session history from the prior run cannot be replayed.

If `--skip-recon` is set:
- Add all Wave 1, 2, 3 recon steps to SKIP_LIST
- Verify existing recon data is in findings.json `recon` field before proceeding
- **Abort guard:** If findings.json `recon` field is empty or missing → abort with:
  `WARNING: No existing recon data found. Remove --skip-recon or run full recon first.`

---

## Phase Execution

Load the relevant phase file based on current progress:

| Phase | File | Content |
|-------|------|---------|
| Phase 1: Recon | `~/.claude/commands/playbook-recon.md` | 3-wave parallel recon |
| Phase 2: Assessment | `~/.claude/commands/playbook-assessment.md` | Test modules 2A-2Q + finding recording |
| Phase 2.5-3: Exploit | `~/.claude/commands/playbook-exploit.md` | Auto-exploit on detection, post-exploitation, intrusion loop, lateral movement, counter-breach |
| Phase 4-5: Report | `~/.claude/commands/playbook-reporting.md` | DOCX report, state save, appendices |

Proceed through phases sequentially. Read each file when entering that phase.
