# Documentation Index

Complete cross-reference map for `~/.claude/`. Use CLAUDE.md section 8 for quick "I need to..." lookups. Use this file for full structure exploration.

## Auto-Loaded (every session)

| File | What it controls |
|------|-----------------|
| `CLAUDE.md` | Core rules, task routing, MCP config, model selection, references |
| `AGENTS.md` | Agent definitions for Claude Code |
| `rules/common/*.md` | Coding standards, git, testing, security (9 files) |
| `rules/common/*.md` | Coding standards, workflows, security | Every session (auto) |

## Rules (`rules/common/`)

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `agents.md` | Agent orchestration — when to use which agent | `docs/agent-teams.md`, `teams/agents/` |
| `coding-style.md` | Immutability, file org, error handling, validation | |
| `development-workflow.md` | Research, plan, TDD, review, commit pipeline | `git-workflow.md` |
| `git-workflow.md` | Commit format, PR workflow | `development-workflow.md` |
| `hooks.md` | PreToolUse, PostToolUse, Stop hooks | `docs/hook-standards.md` |
| `patterns.md` | Skeleton projects, repository pattern, API response format | |
| `performance.md` | Model selection, context window, extended thinking | `CLAUDE.md` section 2 |
| `security.md` | Pre-commit checklist, secret management, response protocol | |
| `testing.md` | 80% coverage, TDD workflow, troubleshooting | `commands/tdd.md` |

## Docs — General

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `agent-teams.md` | Team creation workflow, roles, communication | `commands/team.md`, `teams/ACTIVE_AGENTS.md` |
| `browser-cdp-setup.md` | Chrome CDP setup for browser automation | `CLAUDE.md` browser rules |
| `claudeignore-templates.md` | .claudeignore patterns for different project types | |
| `dippy.md` | Dippy hooks configuration | `docs/hook-standards.md` |
| `hook-standards.md` | Hook naming, structure, testing standards | `rules/common/hooks.md` |
| `mcp-on-demand.md` | 9 auth-free MCP servers via HakanMCP catalog | `mcp-usage-guide.md` |
| `mcp-usage-guide.md` | MCP server config, adding/removing, troubleshooting | `CLAUDE.md` section 7 |
| `plan-naming.md` | Plan file naming conventions | |
| `plugin-profiles.md` | Plugin set profiles (minimal, standard, full) | `CLAUDE.md` section 6 |
| `review-ralph.md` | Ralph Loop spec — args format, criteria | `CLAUDE.md` section 3 |
| `ui-ux.md` | UI/UX guidance, 21st.dev Magic MCP | `CLAUDE.md` domain signals |

## Docs — Pentest Playbook

### Hub and Operations

| File | Purpose | Phase | Cross-References |
|------|---------|-------|-----------------|
| `pentest-playbook.md` | Hub — tool list, phase overview, OPSEC profiles | All | All pentest docs |
| `pentest-architecture.md` | Schema, data flow, /opt/opsec/ toolkit | All | `pentest-operations.md` |
| `pentest-operations.md` | Runtime discipline — preflight, OPSEC enforcement, browser budget, checkpoints | All | `pentest-playbook.md`, `pentest-architecture.md` |
| `pentest-team-config.md` | Team mode orchestration, findings.json schema | Team | `teams/agents/pentest-*.md` |
| `pentest-adaptive-engine.md` | Adaptive attack engine architecture | 2-3 | `pentest-assessment.md` |
| `pentest-knowledge-graph.md` | Finding correlation and chain detection | 2.5 | `pentest-assessment.md` |

### Phase 1 — Recon

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `pentest-recon.md` | 3-wave recon methodology | `commands/playbook-recon.md` |
| `pentest-osint.md` | OSINT techniques — passive recon, breach DB, social | `pentest-recon.md` |
| `pentest-discovery-paths.md` | 300+ technology-specific paths (Laravel, Spring, Django, etc.) | `pentest-recon.md`, `pentest-assessment.md` |

### Phase 2 — Assessment

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `pentest-assessment.md` | Standard modules 2A-2Q (auth, IDOR, SQLi, XSS, SSRF, etc.) | `commands/playbook-assessment.md` |
| `pentest-advanced-attacks.md` | Advanced modules 2R-2AK (smuggling, race, deser, WAF bypass, etc.) | `pentest-assessment.md` |

### Phase 3 — Exploitation

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `pentest-exploitation.md` | Exploit decision engine, intrusion loop, privesc, pivoting | `commands/playbook-exploit.md` |
| `pentest-exploitation-chains.md` | Detailed chains A-I (SQLi, upload, SSTI, SSRF, JWT, etc.) | `pentest-exploitation.md` |
| `pentest-post-exploit-ops.md` | Post-exploit operations across 15 access types | `pentest-exploitation.md` |
| `pentest-evasion.md` | WAF bypass, IDS evasion, EDR bypass, Tor/proxychains | `pentest-exploitation.md`, `pentest-operations.md` |
| `exploit-chains-injection.md` | SQLi, CmdInj, Deserialization, SSTI, Path Traversal chains | `pentest-exploitation-chains.md` |
| `exploit-chains-web.md` | XSS, File Upload, CORS, CSRF, Open Redirect chains | `pentest-exploitation-chains.md` |
| `exploit-chains-access.md` | SSRF, Auth Bypass, JWT chains | `pentest-exploitation-chains.md` |

### Phase 4-5 — Reporting and Cleanup

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `commands/playbook-reporting.md` | DOCX report generation, state save, OPSEC cleanup | `pentest-operations.md` |

### Specialty Modules (loaded conditionally)

| File | Purpose | Trigger |
|------|---------|---------|
| `pentest-ip-intrusion.md` | IP/CIDR targeting, per-service exploitation | `--scope infra` or IP target |
| `pentest-wifi-assault.md` | WiFi scanning, cracking, evil twin | `--wifi` flag |
| `pentest-bluetooth.md` | BLE recon, KNOB, MitM | `--bluetooth` flag |
| `pentest-iot-ot.md` | Industrial protocol testing | `--iot` flag |
| `pentest-mobile.md` | APK/IPA analysis | `--mobile` flag |
| `pentest-container-escape.md` | Docker/K8s escape, pivot | Container detected |
| `pentest-cloud-pivot.md` | Cloud infrastructure hub | `--cloud` flag |
| `pentest-cloud-aws.md` | AWS-specific attacks | AWS indicators |
| `pentest-cloud-azure.md` | Azure-specific attacks | Azure indicators |
| `pentest-cloud-gcp.md` | GCP-specific attacks | GCP indicators |
| `pentest-active-directory.md` | AD attack hub | `--ad` flag |
| `pentest-ad-recon.md` | AD recon phases | `pentest-active-directory.md` |
| `pentest-ad-exploit.md` | AD exploitation phases | `pentest-active-directory.md` |
| `pentest-social-engineering.md` | Social engineering vectors | `--social` flag |
| `pentest-phishing.md` | Phishing campaigns | `--social` flag |
| `pentest-adversary-emulation.md` | APT TTP emulation | `--apt` flag |
| `pentest-purple-team.md` | Attack + detection simultaneously | `--purple` flag |
| `pentest-compliance.md` | PCI/ISO/NIST/KVKK mapping | `--comply` flag |
| `pentest-continuous-asm.md` | Continuous attack surface monitoring | `--continuous` flag |
| `pentest-counter-breach.md` | Counter-breach defense (own server) | `--counter-breach` flag |

### Kali-MCP Tools

| File | Purpose | Cross-References |
|------|---------|-----------------|
| `kali-mcp/tool-inventory.md` | Full kali-mcp tool reference (MCP + CLI + OPSEC) | `pentest-playbook.md` |
| `kali-mcp/capability-matrix.md` | Tool capability mapping per phase | `pentest-playbook.md` |

### Per-Target Data

| File | Purpose |
|------|---------|
| `pentest-targets/<domain>.md` | Per-target recon data, findings state, resume checkpoint |

Data directory: `/mnt/c/dev/pentest-framework/data/<domain>/` (findings.json, operations.json, loot.md, evidence/)

## Commands (`commands/`)

### Playbook (Pentest)

| Command | Purpose | Loads |
|---------|---------|-------|
| `playbook.md` | Main pentest pipeline — Phase 0/0.5 + routing | `pentest-playbook.md` |
| `playbook-recon.md` | Phase 1 execution | `pentest-recon.md` |
| `playbook-assessment.md` | Phase 2 execution | `pentest-assessment.md` |
| `playbook-exploit.md` | Phase 2.5-3 execution | `pentest-exploitation.md` |
| `playbook-reporting.md` | Phase 4-5 execution | `pentest-operations.md` |

### Development

| Command | Purpose |
|---------|---------|
| `build-fix.md` | Fix build/type errors with minimal diffs |
| `code-review.md` | Code review |
| `commit.md` | Git commit |
| `create-pr.md` | Create pull request |
| `deploy.md` | Generic deployment |
| `e2e.md` | Playwright E2E test generation |
| `plan.md` | Implementation planning |
| `refactor-clean.md` | Dead code cleanup |
| `ship.md` | End-to-end git workflow |
| `tdd.md` | Test-driven development |
| `team.md` | Create agent team |
| `test-coverage.md` | Test coverage check |
| `verify.md` | Verification before completion |

### Language-Specific

| Command | Language |
|---------|----------|
| `cpp-build.md` `cpp-review.md` `cpp-test.md` | C++ |
| `go-build.md` `go-review.md` `go-test.md` | Go |
| `kotlin-build.md` `kotlin-review.md` `kotlin-test.md` | Kotlin |
| `rust-build.md` `rust-review.md` `rust-test.md` | Rust |
| `python-review.md` | Python |
| `gradle-build.md` | Gradle/Android |

### Session Management

| Command | Purpose |
|---------|---------|
| `save-session.md` | Save session state to file |
| `resume-session.md` | Restore previous session |
| `sessions.md` | Session history and metadata |
| `label-session.md` | Manual session naming |
| `checkpoint.md` | Create checkpoint |

### Finekra (Work)

| Command | Purpose |
|---------|---------|
| `finekra-task.md` | Work item investigation and execution |
| `finekra-deploy-test.md` | SSH-based test server deployment |
| `create-devops-item.md` | Create DevOps item from Infoset ticket |
| `dev-sync.md` | Project health and improvement tracker |
| `work-sync.md` | Unified work synchronization (Infoset + DevOps + Calendar) |

### ECC (Everything Claude Code)

| Command | Purpose |
|---------|---------|
| `aside.md` | Side question without context pollution |
| `claw.md` | NanoClaw REPL |
| `docs.md` | Library docs via Context7 |
| `evolve.md` | Instinct evolution |
| `learn.md` `learn-eval.md` | Pattern extraction |
| `instinct-status.md` `instinct-import.md` `instinct-export.md` | Instinct management |
| `prompt-optimize.md` | Prompt analysis and optimization |
| `quality-gate.md` | Quality pipeline |
| `harness-audit.md` | Config scoring |
| `security-scan.md` | AgentShield config audit |
| `skill-create.md` `skill-health.md` | Skill management |

### Utility

| Command | Purpose |
|---------|---------|
| `add-mcp.md` | Install MCP server |
| `browser.md` | CDP browser connection |
| `desktop-notify.md` | Local notification |
| `dotfiles-sync.md` | Sync ~/.claude/ to dotfiles repo |
| `env-check.md` | Local tooling health |
| `fix-github-issue.md` `fix-pr.md` | GitHub issue/PR fixes |
| `init-hakan.md` | Project init |
| `loop-start.md` `loop-status.md` | Recurring task loops |
| `maintenance-status.md` | Storage and hygiene |
| `model-route.md` | Model routing |
| `orchestrate.md` | Multi-agent workflow guidance |
| `plugin-audit.md` `plugin-profile.md` | Plugin management |
| `pm2.md` | PM2 process management |
| `projects.md` `promote.md` | Project/instinct management |
| `release.md` `run-ci.md` | Release/CI |
| `status.md` | Workspace orientation |
| `todo-overview.md` | Pending work overview |
| `update-codemaps.md` `update-docs.md` | Documentation updates |
| `wsl-health.md` | WSL/tmux/MCP readiness |

### Multi-Model

| Command | Purpose |
|---------|---------|
| `multi-plan.md` | Collaborative planning |
| `multi-execute.md` | Collaborative execution |
| `multi-frontend.md` | Frontend-focused development |
| `multi-backend.md` | Backend-focused development |
| `multi-workflow.md` | Full collaborative workflow |
| `devfleet.md` | Parallel agent orchestration |

## Teams (`teams/`)

| File | Purpose |
|------|---------|
| `ACTIVE_AGENTS.md` | Active agent role catalog |
| `ROLE_COMPRESSION_MAP.md` | Role aliasing when exact match unavailable |

### Standard Agents (`teams/agents/`)

| Agent | Role |
|-------|------|
| `backend-architect.md` | Backend, API, service design |
| `fullstack-dev.md` | Full-stack implementation |
| `qa-tester.md` | Testing, QA |
| `devops.md` | CI/CD, infra |
| `security-engineer.md` | Security |
| `cloud-architect.md` | Cloud infra |
| `observability-engineer.md` | Monitoring, logging |
| `ui-ux-designer.md` | UI/UX design |
| `product-manager.md` | Requirements, scoping |
| `tech-lead.md` | Architecture, review, coordination |
| `research-lead.md` | Research, analysis |
| `business-analyst.md` | Business analysis |
| `analytics-optimizer.md` | Analytics, KPIs |
| `content-strategist.md` | Content strategy |
| `social-media-operator.md` | Social media |
| `growth-lead.md` | Growth strategy |
| `launch-ops.md` | Release operations |

### Pentest Agents (`teams/agents/`)

| Agent | Role | Modules |
|-------|------|---------|
| `pentest-leader.md` | Orchestration, correlation, reporting | `pentest-playbook.md`, `pentest-operations.md` |
| `pentest-recon.md` | OSINT, DNS, subdomain, fingerprint | `pentest-recon.md`, `pentest-osint.md` |
| `pentest-web.md` | Web app testing (auth, injection, API) | `pentest-assessment.md`, `pentest-exploitation.md` |
| `pentest-exploit.md` | Exploitation, post-exploit, pivoting | `pentest-exploitation.md`, `pentest-evasion.md` |
| `pentest-infra.md` | Network, ports, services | `pentest-ip-intrusion.md` |
| `pentest-cloud.md` | Cloud infrastructure | `pentest-cloud-*.md` |
| `pentest-ad.md` | Active Directory | `pentest-ad-*.md` |
| `pentest-wireless.md` | WiFi, Bluetooth | `pentest-wifi-assault.md`, `pentest-bluetooth.md` |
| `pentest-mobile.md` | Mobile app analysis | `pentest-mobile.md` |

## OPSEC Toolkit (`/opt/opsec/` on kali-mcp)

| Script | Purpose | Used In |
|--------|---------|---------|
| `preflight.sh` | Pre-engagement tool + OPSEC check | Phase 0 |
| `stealth_session.py` | HTTP wrapper with UA rotation, timing, Tor | Phase 1-3 |
| `random_ua.py` | Realistic User-Agent generator | All phases |
| `fake_identity.py` | Fake identity for account creation | Phase 2 |
| `clean_metadata.sh` | EXIF/metadata stripping before upload | Phase 2-3 |
| `dns_leak_test.sh` | DNS leak verification | Phase 0 |
| `tls_fingerprint.sh` | TLS fingerprint check | Phase 0 |
| `revshell.py` | Reverse shell payload generator (8 formats) | Phase 3 |
| `profile.json` | OPSEC profiles (stealth/balanced/noisy) | All phases |

Webshells: `/opt/webshells/` (mini.php, mini-post.php, polyglot.php, htaccess-shell)

## File Relationships

```
CLAUDE.md (entry point — loaded every session)
  |
  +-- rules/common/ (coding standards — loaded every session)
  |     agents.md --> teams/agents/
  |     development-workflow.md --> git-workflow.md
  |     hooks.md --> docs/hook-standards.md
  |     testing.md --> commands/tdd.md
  |
  +-- docs/ (reference — loaded on demand)
  |     |
  |     +-- General
  |     |     agent-teams.md --> teams/, commands/team.md
  |     |     mcp-usage-guide.md --> mcp-on-demand.md
  |     |     kali-mcp/tool-inventory.md
  |     |
  |     +-- Pentest Hub
  |     |     pentest-playbook.md (hub)
  |     |       +-- pentest-operations.md (runtime rules)
  |     |       +-- pentest-architecture.md (schema, data flow)
  |     |       +-- kali-mcp/tool-inventory.md (tools)
  |     |       +-- kali-mcp/capability-matrix.md (tool mapping)
  |     |       |
  |     |       +-- Phase 1: pentest-recon.md
  |     |       |     +-- pentest-osint.md
  |     |       |     +-- pentest-discovery-paths.md
  |     |       |
  |     |       +-- Phase 2: pentest-assessment.md
  |     |       |     +-- pentest-advanced-attacks.md (2R-2AK)
  |     |       |     +-- pentest-adaptive-engine.md
  |     |       |     +-- pentest-knowledge-graph.md
  |     |       |
  |     |       +-- Phase 3: pentest-exploitation.md
  |     |       |     +-- pentest-exploitation-chains.md
  |     |       |     +-- exploit-chains-injection.md
  |     |       |     +-- exploit-chains-web.md
  |     |       |     +-- exploit-chains-access.md
  |     |       |     +-- pentest-post-exploit-ops.md
  |     |       |     +-- pentest-evasion.md
  |     |       |
  |     |       +-- Specialty (conditional)
  |     |             pentest-ip-intrusion.md
  |     |             pentest-wifi-assault.md
  |     |             pentest-bluetooth.md
  |     |             pentest-iot-ot.md
  |     |             pentest-mobile.md
  |     |             pentest-container-escape.md
  |     |             pentest-cloud-pivot.md --> aws.md, azure.md, gcp.md
  |     |             pentest-active-directory.md --> ad-recon.md, ad-exploit.md
  |     |             pentest-social-engineering.md
  |     |             pentest-phishing.md
  |     |             pentest-adversary-emulation.md
  |     |             pentest-purple-team.md
  |     |             pentest-compliance.md
  |     |             pentest-continuous-asm.md
  |     |             pentest-counter-breach.md
  |     |
  |     +-- pentest-targets/<domain>.md (per-engagement data)
  |
  +-- commands/ (slash commands — invoked by user)
  |     playbook.md --> playbook-recon.md, playbook-assessment.md,
  |                     playbook-exploit.md, playbook-reporting.md
  |     team.md --> teams/agents/
  |     (90+ other commands)
  |
  +-- teams/
        ACTIVE_AGENTS.md
        ROLE_COMPRESSION_MAP.md
        agents/ (26 role definitions)
```
