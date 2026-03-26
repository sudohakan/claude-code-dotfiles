---
description: "Playbook — automated offensive security pipeline: recon (3 waves), vulnerability assessment (2A-2Z+), adaptive exploitation, post-exploitation, DOCX report generation"
---

# Playbook

Automated offensive security pipeline. Recon, adaptive vulnerability assessment, auto-exploitation, and DOCX reporting.

**Data dir:** `/mnt/c/dev/pentest-framework/data/<DOMAIN>/`
**Target profiles:** `~/.claude/docs/pentest-targets/`
**Playbook (split):**
- `~/.claude/docs/pentest-playbook.md` — hub: tools, phases 0/0.5/4/5, refs
- `~/.claude/docs/pentest-recon.md` — Phase 1: recon (3 waves)
- `~/.claude/docs/pentest-assessment.md` — Phase 2 + 2.5: assessment + correlation
- `~/.claude/docs/pentest-exploitation.md` — Phase 3A/3B: exploit chains + arsenals
- `~/.claude/docs/pentest-counter-breach.md` — Phase 3C: counter-breach

**Supporting:**
- `~/.claude/docs/pentest-architecture.md` — schema and load policy
- `~/.claude/docs/pentest-operations.md` — runtime discipline
- `~/.claude/docs/kali-mcp/tool-inventory.md` — tool reference
- `~/.claude/docs/kali-mcp/capability-matrix.md` — tool support matrix
- `/opt/opsec/` — OPSEC toolkit (stealth_session.py, preflight.sh, fake_identity.py, clean_metadata.sh)

## Arguments

```
/playbook <target> [flags]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<target>` | Yes | URL, IP, CIDR, or flag-based target (auto-detected) |
| `--depth short\|standard\|deep` | No | Time budget (default: standard) |
| `--scope web\|infra\|full` | No | Test scope (default: full) |
| `--resume` | No | Continue from last checkpoint, skip completed tests |
| `--skip-recon` | No | Skip recon, jump to assessment using existing recon data |
| `--report-only` | No | Generate DOCX from existing findings.json, no scanning |
| `--counter-breach` | No | Skip recon/assessment — Phase 3C counter-breach on YOUR server |
| `--prepare-defense` | No | Install Layer 1 defensive mechanisms on YOUR server |
| `--emergency-recover` | No | Unprepared recovery guide |

**Time budgets:**

| Depth | Budget | Tier coverage |
|-------|--------|---------------|
| short | 8 hours | Tier 1 only |
| standard | 40 hours | Tier 1 + 2 |
| deep | 80 hours | Tier 1 + 2 + 3 |

**Scope modifiers:**

| Scope | Behavior |
|-------|----------|
| web | Web app only — skip nmap/infra |
| infra | Infrastructure only — skip web app tests |
| full | Web + infra + API |

**Flags:**

| Flag | Description |
|------|-------------|
| `--wifi` | Scan and attack nearby WiFi networks |
| `--bluetooth` | BLE device scan + exploitation |
| `--ad <DC_IP>` | Active Directory attack |
| `--cloud aws\|azure\|gcp` | Cloud infrastructure assessment |
| `--iot <IP:PORT>` | Industrial protocol testing |
| `--mobile <APK\|IPA>` | Mobile app analysis |
| `--full-spectrum` | All applicable modules |
| `--team` | Multi-agent swarm mode |
| `--apt APT28\|APT29\|LAZARUS` | Adversary emulation |
| `--purple` | Attack + detect simultaneously |
| `--stealth` | Low-and-slow, evasion-first (OPSEC profile: stealth) |
| `--noisy` | Maximum speed, no stealth (OPSEC profile: noisy) |
| `--continuous` | Continuous ASM monitoring |
| `--comply PCI\|ISO\|NIST\|KVKK` | Map findings to compliance framework |
| `--social` | Include social engineering vectors |
| `--osint-only` | OSINT only, no active scanning |
| `--org <name>` | Load org-specific nuclei templates |
| `--pivot` | Enable lateral movement after foothold |
| `--quick-wins` | 15-min fast checks only |
| `--confirm-exploit` | Require human confirmation before each exploit |

**Flag routing (check BEFORE anything else):**

0. `--quick-wins` → jump to Quick Wins Mode. Stop after.
1. Empty `$ARGUMENTS` → display help text. Stop.
2. `--help` or `-h` → display help text. Stop.
3. `--report-only` → jump to Phase 4. Skip all other phases.
4. `--counter-breach` → jump to Counter-Breach Mode. Skip all other phases.
5. `--prepare-defense` → jump to Defense Preparation Mode. Skip all other phases.
6. `--emergency-recover` → jump to Emergency Recovery Mode. Skip all other phases.
7. Otherwise → Phase 0: Target Init.
8. `--osint-only` → Phase 1 Wave 0 only, then Phase 4. Load pentest-osint.md.
9. `--apt` → load pentest-adversary-emulation.md, apply APT TTPs throughout.
10. `--purple` → load pentest-purple-team.md, measure detection after each attack.
11. `--social` → include pentest-social-engineering.md and pentest-phishing.md in Phase 2.
12. `--stealth` → apply stealth OPSEC profile; load `/opt/opsec/profile.json` (profile: stealth).
13. `--noisy` → apply noisy OPSEC profile; nmap -T5, feroxbuster -t 100, no delays.
14. `--continuous` → after full scan, enter monitoring loop per pentest-continuous-asm.md.
15. `--pivot` → after exploitation, enable lateral movement per pentest-ip-intrusion.md Phase 3IP Layer 3.

---

## Help Mode

Display:
```
Playbook — Offensive Security Pipeline

/playbook <url>                        Full pipeline: recon → assessment → exploitation → report
/playbook <url> --depth short          8-hour test (critical vectors only)
/playbook <url> --depth deep           80-hour test (all vectors)
/playbook <url> --scope web            Web application only
/playbook <url> --scope infra          Infrastructure only
/playbook <url> --resume               Resume from last checkpoint
/playbook <url> --skip-recon           Skip recon, proceed with existing data
/playbook <url> --report-only          Generate DOCX from existing findings
/playbook <url> --counter-breach       Emergency: your server is compromised
/playbook 192.168.1.100                Direct IP penetration test
/playbook 10.0.0.0/24                  Subnet scan
/playbook --wifi                       Scan and attack nearby WiFi
/playbook --ad 192.168.1.1             Active Directory attack
/playbook <url> --team                 Multi-agent swarm mode
/playbook <url> --apt APT28            APT28 adversary emulation
/playbook <url> --purple               Purple team (attack + detect)
/playbook <url> --stealth              Stealth mode (slow, evades IDS)
/playbook <url> --quick-wins           Fast results in 15 minutes
/playbook <url> --comply PCI           PCI DSS compliance mapping

Phases:
  Phase 0:   Target init + OPSEC profile + kali-mcp session
  Phase 0.5: Prioritization (Tier 1 → 2 → 3)
  Phase 1:   Recon (3 waves — DNS, nmap, feroxbuster, nuclei, katana)
  Phase 2:   Assessment (2A-2Z+: Auth, API, Injection, GraphQL, gRPC, WebSocket...)
  Phase 2.5: Finding correlation + attack chain construction
  Phase 3:   Exploitation (user approval required)
  Phase 3C:  Counter-breach (--counter-breach only)
  Phase 4:   DOCX report generation
  Phase 5:   State save + cleanup

Outputs:
  Findings DB:  /mnt/c/dev/pentest-framework/data/<DOMAIN>/findings.json
  Evidence:     /mnt/c/dev/pentest-framework/data/<DOMAIN>/evidence/
  DOCX Report:  C:\dev\kali-mcp\pentest-reports\<DOMAIN>-pentest-raporu.docx
  Target State: ~/.claude/docs/pentest-targets/<DOMAIN>.md
```
Stop — do not proceed to any phase.

---

## Quick Wins Mode

Run only highest-probability, lowest-effort checks (~15 min):

1. Default credentials on detected login forms
2. Unauthenticated API endpoints (/api, /swagger, /graphql)
3. Security header check
4. robots.txt / .env / .git/HEAD exposure
5. SSL/TLS weakness check
6. `nuclei -severity critical` scan
7. Anonymous FTP/SMB/Redis/MongoDB check
8. Docker API unauthenticated (port 2375)
9. Elasticsearch/Kibana open access (9200, 5601)

After: display findings, recommend full assessment if issues found. Skip Phase 2 detailed tests, Phase 3, Phase 2.5.

---

## Critical Rules

0. **Generic framework only.** Never write target-specific data (domains, IPs, credentials, findings) into playbook files. All target data goes in `pentest-targets/<DOMAIN>.md` and `data/<DOMAIN>/`. Use `<TARGET>`, `<DOMAIN>`, `<KALI_SESSION>`, `<IP>` placeholders in all playbook docs.
1. All analysis happens in this session. Never shell out to `claude` CLI.
2. All kali-mcp calls use `mcp__kali-mcp__*` tools directly.
3. Browser automation is budgeted. Prefer kali-mcp primitives first. Use HakanMCP browser wrappers only for login-gated flows, JS-only proof, or screenshots.
4. All user-facing output in English. Tool calls, JSON, evidence files stay in English.
5. Evidence on every finding. No finding enters findings.json without at least one artifact.
6. findings.json is source of truth for all phase state, finding metadata, and coverage tracking.
7. Real newlines in notes/descriptions — never `\n` literal strings.
8. Authorized targets only. If target not in pentest-targets/ and not clearly a test/internal domain, ask for authorization before proceeding.
9. Deduplication always. Compute dedupeKey before adding any finding; merge evidence instead of duplicating.
10. Load only relevant plugin docs. Follow pentest-architecture.md load policy.
11. Aggressive auto-exploit. When a vulnerability is confirmed in Phase 2, immediately execute the matching exploit recipe before moving to the next test. Human confirmation only required with `--confirm-exploit`.
12. Depth-first exploitation. When exploitation yields new access (credentials, shell, network), immediately use that access before continuing assessment.
13. Phase gate — user approval required at each phase transition. Present findings summary and ask to proceed or go deeper.
14. Continuous findings recording. Write to findings.json after each confirmed vulnerability. Never accumulate more than 3 unrecorded findings.
15. Operations log. Maintain `operations.json` alongside findings.json. Log every significant action with timestamp, phase, action, target, result, notes. Check before starting any test to avoid repeating work.
16. Loot file. Maintain `loot.md` alongside findings.json. Record all credentials, accounts, infrastructure intel, exposed files, extracted data, and unfinished attack vectors. Update on every new discovery.
17. Active data collection. Whenever accessible data is found, save it immediately — do not wait for instruction. Exposed files → `exposed-files/`, extracted data → `extracted/`. Files returning 200 are downloaded in real-time.
18. Self-improving playbook. When a new technique, tool, or vector is discovered not already in the playbook, add it to the relevant `pentest-*.md` file before continuing. At engagement end, review operations.json for ad-hoc techniques and formalize them.

    Auto-integration protocol (includes NotebookLM — see Rule 21):
    - Research output → classify target file: new CVE → `pentest-advanced-attacks.md`; new path → `pentest-discovery-paths.md`; new chain → `pentest-exploitation.md`; new post-exploit → `pentest-post-exploit-ops.md`
    - Format per technique: `## 2XX — Name (CVE-YYYY-NNNNN)` / Added date / When to use / Auth required / Detection command / Exploitation command / Affected versions
    - Cross-reference new technique ID in exploit decision engine in `pentest-exploitation.md`
    - Update `<!-- last_updated: -->` header in modified files

    Formalized techniques log:
    - 2AE: Livewire v3 Property Hydration RCE (CVE-2025-54068)
    - 2AF: Laravel Queue Job Deserialization
    - 2AG: Yii2 Behavior/Event Injection (CVE-2026-25498)
    - 2AH: PHP 8.2 Phar Stream Wrapper Deserialization
    - 2AI: Laravel Reverb Redis Deserialization (CVE-2026-23524)
    - 2AJ: LiteSpeed WAF Bypass Techniques
    - 2AK: 13 Engagement-Learned Techniques (EL-01 to EL-13)

19. **OPSEC — zero trace.** Maintain operational security throughout the engagement.

    OPSEC profile selection (at Phase 0):
    - Load `/opt/opsec/profile.json` and select profile based on flags:

    | Flag | Profile | Behavior |
    |------|---------|----------|
    | `--stealth` | stealth | Slow timing, Tor routing, stealth_session.py for all HTTP, macchanger, max evasion |
    | (default) | balanced | Randomized UA, moderate delays (0.3-2s), proxychains optional |
    | `--noisy` | noisy | No delays, direct requests, max threads, speed over stealth |

    Identity discipline:

    | Category | Rule |
    |----------|------|
    | User-Agent | Real browser UA always. Never python-requests, curl, sqlmap defaults. Randomize per session. |
    | Account names | No real name, pentest, hack, test, exploit, shell, proof, scan, brute. Use realistic common names. |
    | File names | Uploaded files use normal names (photo.jpg, document.pdf). Never shell.php, exploit.py, proof.png. |
    | Ticket/message content | No XSS payloads or jargon visible to admins. If payload is sanitized, abandon that vector. |
    | Metadata | Clean EXIF/metadata from all uploaded files using `clean_metadata.sh` before upload. |
    | Timing | Random delay 0.3-2s between requests. Brute-force min 0.5s. No fixed-interval robotics. |
    | Referrer/Origin | Mimic target domain's own headers. No external domain Referer. |
    | IP awareness | All kali-mcp requests from single IP. High-volume ops (brute force) will log that IP. |

    Pre-action OPSEC check (before each operation):

    | Check | Fail action |
    |-------|-------------|
    | User-Agent is realistic | Fix before proceeding |
    | Operation creates suspicious log pattern | Rate-limit or abandon |
    | Account/file/ticket name is neutral | Rename before proceeding |
    | Operation is reversible | Confirm with user if not |
    | Operation may trigger admin notification | Get user approval first |
    | Delays are in place for high-volume ops | Add delay before proceeding |
    | Referrer/Origin header correct | Fix before proceeding |

    Post-engagement cleanup (Phase 5, mandatory):

    | Category | Action |
    |----------|--------|
    | Accounts created | List (username, email, ID); delete if possible; report those that cannot be deleted |
    | Files uploaded | List (URL, file_id); delete via API if available; note cache expiry otherwise |
    | Tickets/messages | List (ID, content summary); close/delete if possible; flag XSS-payload tickets |
    | Config changes | Revert any update-config or .env changes; report rotated API keys |
    | DB traces | List triggered password reset tokens and mass-assignment record changes |
    | Log estimate | Approximate request count, brute-force footprint, source IP (kali-mcp IP) |

    Cleanup report appended to STATUS.md as `## Cleanup Report`.

20. **Adaptive goal engine.** Goals evolve with findings.

    Tier A — User-defined goals: set at engagement start. Never remove without user approval.

    Tier B — Auto-generated goals (generated after each significant finding):

    | Finding Type | Auto-Generated Goal |
    |-------------|---------------------|
    | Credentials (DB/SMTP/API) | Validate on all services; check password reuse across panels |
    | IMAP/email access | Dump inbox; monitor password reset tokens; harvest customer data |
    | APP_KEY / secret key | Decrypt cookies; forge sessions; deserialization RCE |
    | Source code access | Extract all credentials; map internal architecture; find hidden endpoints |
    | CDN/storage write | Upload proof file; asset manipulation; stored XSS via CDN |
    | XSS confirmed | Craft stored XSS for admin token theft via ticket/support system |
    | API access (authenticated) | Enumerate all endpoints; test privilege escalation; extract data |
    | New panel/domain | Lateral movement; credential reuse; shared infrastructure exploit |
    | File upload capability | PHP/shell upload; polyglot files; Phar deserialization chain |
    | Debug mode / error disclosure | Stack trace harvesting; config extraction; RCE via debug tools |
    | WAF bypass (partial) | Chain with remaining blocked exploit; document bypass technique |
    | User account on target | Privilege escalation; IDOR testing; stored XSS via user features |
    | Payment system found | Callback manipulation; balance injection; transaction forgery |
    | Session/cookie understood | Session hijack; cookie forge; driver change exploit |

    Goal lifecycle: finding → check table → generate goal (description, required access, success metric) → add to STATUS.md under `## Auto-Generated Goals` → attempt immediately if resources available → on success: record in loot.md + update findings.json.

    Re-evaluation triggers: new credential, new endpoint/panel, successful exploit, phase transition, every 10 operations.

21. **NotebookLM integration.** Dynamic research and source management via notebook `<NOTEBOOK_ID>`.

    Prerequisite: `bash ~/.claude/scripts/nlm-cookie-sync.sh` once per session before first call.

    Engagement-time research (when blocked):
    - Follow the Research Escalation Ladder in `pentest-operations.md`: playbook docs → NotebookLM query → web search → feedback loop.
    - Query with specific technique names, CVEs, or bypass context. Vague queries waste tokens.

    Source management:
    - When web search or engagement yields a high-quality, reusable resource: add via `source_add(source_type="url", url=<URL>, notebook_id="<NOTEBOOK_ID>")`.
    - Max 1-2 sources per session. Curate; never bulk-add.
    - Priority categories: WAF bypass, framework exploits, OPSEC tradecraft, post-exploitation, credential attacks.

    Playbook development:
    - Before adding new attack modules or updating techniques, query NotebookLM for current state-of-the-art in that area.
    - Cross-reference with existing playbook content. Add only what is missing with exact commands/payloads.

---

## Phase 0: Target Init

### 0.0.5 — Detect Target Type

| Pattern | Type | Action |
|---------|------|--------|
| `http[s]://...` | URL | Standard web pentest |
| `x.x.x.x` (IPv4) | IP | Load pentest-ip-intrusion.md |
| `x:x:x:x:x:x:x:x` (IPv6) | IP | Load pentest-ip-intrusion.md |
| `x.x.x.x/nn` (CIDR) | CIDR | Host discovery → per-host IP flow |
| `--wifi` | WiFi | Load pentest-wifi-assault.md |
| `--bluetooth` | BT | Load pentest-bluetooth.md |
| `--ad <DC_IP>` | AD | Load pentest-active-directory.md |
| `--cloud` | Cloud | Load pentest-cloud-pivot.md |
| `--iot` | IoT | Load pentest-iot-ot.md |
| `--mobile` | Mobile | Load pentest-mobile.md |
| `--full-spectrum` | All | Load all applicable modules (team mode recommended) |

### 0.0.6 — Authorization Tier Check

| Tier | Target Types | Action |
|------|-------------|--------|
| 1 | URL, OSINT | Proceed |
| 2 | IP, CIDR | Confirm: "Do you have authorization to scan this IP range?" |
| 3 | WiFi, BT | Confirm: "WiFi/BT attacks may affect nearby devices. Authorization confirmed?" |
| 4 | Social engineering | Confirm: "Social engineering targets real individuals. Written authorization in place?" |
| 5 | Destructive actions | Per-action confirmation required |

### 0.0.7 — Preflight Tool Check and OPSEC Profile

```bash
# Run via kali-mcp
run("which nmap nuclei feroxbuster 2>/dev/null && echo 'Core OK' || echo 'Core MISSING'")
run("/opt/opsec/preflight.sh")
```

Load OPSEC profile based on flags (stealth / balanced / noisy). Configure stealth_session.py if profile is stealth or balanced.

If tools missing: list them, ask user to skip or install.

### 0.0.8 — Mandatory OPSEC Initialization

Execute in order before any target interaction:

1. Load OPSEC profile: read `/opt/opsec/profile.json`, select stealth/balanced/noisy
2. Initialize stealth session: `python3 /opt/opsec/stealth_session.py --profile <PROFILE> --init`
3. Verify Tor/proxy routing (stealth/balanced): `bash /opt/opsec/preflight.sh <PROFILE>`
4. DNS leak test: `bash /opt/opsec/dns_leak_test.sh` -- abort if leak detected
5. TLS fingerprint check: `bash /opt/opsec/tls_fingerprint.sh https://<TARGET>`

If any check fails, do not proceed to Phase 1. Fix the issue or escalate to user.

### 0.1 — Parse Target

From `<target>`:
- Extract scheme, host, port
- `TARGET_URL` = original target as given
- `TARGET_DOMAIN` = host without `www.` prefix (use base domain for file naming)
- `DATA_DIR` = `/mnt/c/dev/pentest-framework/data/<DOMAIN>/`
- `FINDINGS_FILE` = `<DATA_DIR>/findings.json`
- `EVIDENCE_DIR` = `<DATA_DIR>/evidence/`

### 0.2 — Check Target Profile

Check `~/.claude/docs/pentest-targets/<DOMAIN>.md` with Read tool.

If exists:
- Read it; display previous findings summary (last scan, total findings, severity counts)
- Set `DELTA_MODE = true`

If not exists:
- Create from template (see pentest-playbook.md Target Profile Template)
- Set `DELTA_MODE = false`

### 0.3 — Create Data Directories

```bash
mkdir -p /mnt/c/dev/pentest-framework/data/<DOMAIN>/evidence/{screenshots,http-captures,tool-outputs}
mkdir -p /mnt/c/dev/pentest-framework/data/<DOMAIN>/{extracted,exposed-files,reports}
```

Initialize `extracted/README.md` index and empty `loot.md`.

### 0.4 — Initialize findings.json

If not exists, create from schema in `pentest-architecture.md`. If `--resume` is set, read existing file and build `SKIP_LIST` from completed coverage entries.

If `--skip-recon` is set, verify `recon` field is not empty — abort with warning if it is.

### 0.5 — Create kali-mcp Session

```
session_create(session_name="pentest-<DOMAIN>-<YYYYMMDD>")
```

Save returned session ID as `KALI_SESSION`.

Display start banner: Target, Domain, Depth, Scope, OPSEC profile, Session, Data dir, Mode.

---

## Phase 0.5: Prioritization

| Tier | Tests | When |
|------|-------|------|
| 1 | User enumeration (2B), BOLA/sequential IDs (2C), rate limit (2M), API spec exposure, security headers (2N), robots.txt/sitemap | Always (fast signal gathering) |
| 2 | Auth bypass (2A), SQLi (2F), XSS (2G), SSRF (2J), XXE (2K), file upload (2I), JWT attacks (2D), business logic (2L), command injection (2H), open redirect (2O) | standard + deep |
| 3 | GraphQL (2P), gRPC (2Q), WebSocket, OAuth, race conditions, mass assignment (2E), advanced chains | deep only |

OOB testing setup (Tier 2+): start `interactsh-client` listener before assessment begins.

```bash
# Via kali-mcp
run("interactsh-client -server oast.pro -n 1 > /tmp/interactsh.log 2>&1 &")
```

---

## Phase Execution

Load the relevant phase command file:

| Phase | Command file | Content |
|-------|-------------|---------|
| Phase 1: Recon | `~/.claude/commands/playbook-recon.md` | 3-wave parallel recon |
| Phase 2: Assessment | `~/.claude/commands/playbook-assessment.md` | Test modules 2A-2Z+ |
| Phase 2.5-3: Exploit | `~/.claude/commands/playbook-exploit.md` | Auto-exploit, post-exploitation, intrusion loop |
| Phase 4-5: Report | `~/.claude/commands/playbook-reporting.md` | DOCX report, state save |
