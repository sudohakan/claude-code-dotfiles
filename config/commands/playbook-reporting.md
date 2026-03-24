> Part of the [/playbook command](playbook.md). Load during Phase 4 and Phase 5.
> Phase gate: present all findings summary to user before generating report. Proceed only with approval.

## Phase 4: Reporting

Display: `[Phase 4] Generating report`

Read final findings.json. Verify stats are current.

**Generate DOCX:**
```bash
python3 /mnt/c/dev/pentest-framework/scripts/generate-pentest-report.py \
  <DOMAIN> \
  "/mnt/c/dev/kali-mcp/pentest-reports/<DOMAIN>-pentest-raporu.docx"
```

Script reads findings from `/mnt/c/dev/pentest-framework/data/<DOMAIN>/findings.json` and evidence from `evidence/` automatically.

If script fails → display terminal summary as fallback. Do not block.

**Backup copy:**
```bash
cp /mnt/c/dev/kali-mcp/pentest-reports/<DOMAIN>-pentest-raporu.docx \
   /mnt/c/dev/pentest-framework/data/<DOMAIN>/reports/<DOMAIN>-pentest-raporu.docx
```

**Terminal summary (always display):**
```
PENTEST REPORT — <DOMAIN>
Scan date: <date>   Depth: <depth>   Scope: <scope>

FINDINGS
  Critical: {n}   High: {n}   Medium: {n}   Low: {n}   Info: {n}   TOTAL: {n}

TOP 5
  1. [{cvss}] {title}
  2. [{cvss}] {title}
  3. [{cvss}] {title}
  4. [{cvss}] {title}
  5. [{cvss}] {title}

ATTACK CHAINS: {n}   Highest: {chain_name} ({composite_cvss})

EXPLOITATION
  Shells: {count}   Credentials: {count}   Lateral movement: {count}
  Success rate: {exploited}/{total}

OPSEC CLEANUP: {status — completed/pending}

REPORT: C:\dev\kali-mcp\pentest-reports\<DOMAIN>-pentest-raporu.docx
```

---

## Phase 5: Save State

Display: `[Phase 5] Saving state`

### 5.1 Update Target Profile

Read `~/.claude/docs/pentest-targets/<DOMAIN>.md`. Update:
- `## Last Scan` — date, depth, scope
- `## Statistics` — current counts from findings.json
- `## Key Findings` — top 5 by CVSS
- `## Attack Chains` — all detected chains
- `## Coverage` — coverage table

### 5.2 Finalize findings.json

Update `lastScan` timestamp. Verify `stats` counts match findings array length.

Adaptive context block (if adaptive engine was active):
```json
"adaptiveContext": {
  "filterMapCount": "<params probed>",
  "synthesizedPayloads": "<total generated>",
  "feedbackLoopIterations": "<loop re-entries>",
  "newSurfacesDiscovered": "<internal hosts/creds/services>",
  "credentialsHarvested": "<count>",
  "shellsObtained": "<count>"
}
```

### 5.3 OPSEC Cleanup Report (mandatory)

Append to findings.json under `opsecCleanup`:
```json
"opsecCleanup": {
  "performed": true,
  "date": "<ISO timestamp>",
  "artifactsRemoved": ["<path>", "<path>"],
  "webshellsDeployed": <count>,
  "webshellsRemoved": <count>,
  "historyCleared": true,
  "residualRisk": "none|low|medium",
  "notes": "<any remaining traces or exceptions>"
}
```

If cleanup was not completed → set `residualRisk` to `high` and escalate to user immediately.

### 5.4 Trace Inventory (report appendix)

Create `/mnt/c/dev/pentest-framework/data/<DOMAIN>/evidence/trace-inventory.json`:
```json
{
  "generated": "<ISO timestamp>",
  "target": "<DOMAIN>",
  "tracesLeft": [],
  "tracesRemoved": [
    {"type": "webshell|account|log-entry|file", "path": "<location>", "removedAt": "<ISO timestamp>"}
  ],
  "testAccountsCreated": [
    {"username": "<name>", "service": "<url>", "removed": true}
  ],
  "networkNoise": {"requestCount": <n>, "scanPeriod": "<start>/<end>"}
}
```

### 5.5 Save Evidence Manifest

Create `/mnt/c/dev/pentest-framework/data/<DOMAIN>/evidence/manifest.json`:
```json
{
  "generated": "<ISO timestamp>",
  "target": "<DOMAIN>",
  "totalArtifacts": <n>,
  "artifacts": [
    {"type": "screenshot|http-capture|tool-output", "path": "evidence/...", "findingId": "f-001", "sha256": "<hash>"}
  ]
}
```

Compute hashes:
```
mcp__kali-mcp__run:
  command: "find <EVIDENCE_DIR> -type f -exec sha256sum {} \;"
  session_id: <KALI_SESSION>
```

If kali-mcp output truncated → mark as `"sha256": "truncated"`.

### 5.6 Close kali-mcp Session

Skip if `--report-only` was set.

```
mcp__kali-mcp__session_delete:
  session_id: <KALI_SESSION>
```

```
=== Pentest Complete ===
Domain:   <DOMAIN>
Duration: ~{hours}h
Findings: {total} ({critical} critical)
OPSEC:    Cleanup {complete/incomplete}
Report:   /mnt/c/dev/kali-mcp/pentest-reports/<DOMAIN>-pentest-raporu.docx
Data:     /mnt/c/dev/pentest-framework/data/<DOMAIN>/
========================
```

---

## Appendix A: Target Profile Template

```markdown
# Pentest Target: <DOMAIN>

## Authorization
- Status: [AUTHORIZED / PENDING]
- Authorized by: [name / scope document]
- Scope: [in-scope assets]
- Out of scope: [exclusions]

## Target Info
- URL: <TARGET_URL>
- Organization: [org]
- Environment: [production / staging / test]

## Technology Stack
<!-- Populated during recon -->

## Last Scan
- Date: —   Depth: —   Scope: —

## Statistics
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Info | 0 |

## Key Findings
<!-- Top 5 by CVSS -->

## Attack Chains
<!-- After correlation -->

## Coverage
| Test | Status | Findings |
|------|--------|----------|

## Data
- findings.json: `/mnt/c/dev/pentest-framework/data/<DOMAIN>/findings.json`
- Evidence: `/mnt/c/dev/pentest-framework/data/<DOMAIN>/evidence/`
- Reports: `/mnt/c/dev/pentest-framework/data/<DOMAIN>/reports/`
```

---

## Appendix B: CVSS Quick Reference

| Category | Severity | Score |
|----------|----------|-------|
| RCE, no auth | Critical | 10.0 |
| SQLi, no auth | Critical | 9.3 |
| Auth bypass, admin | Critical | 9.2 |
| SSRF internal | Critical | 9.4 |
| IDOR, sensitive data | High | 7.1 |
| XSS stored | High | 6.8 |
| Command injection, auth | High | 8.7 |
| XSS reflected | Medium | 5.3 |
| Info disclosure | Low | 5.3 |
| Missing security header | Info | 0.0 |

Always include CVSS 4.0 primary + CVSS 3.1 for backward compat.

---

## Appendix C: CWE Reference

| Category | CWE |
|----------|-----|
| SQL Injection | CWE-89 |
| XSS | CWE-79 |
| Command Injection | CWE-78 |
| IDOR / BOLA | CWE-639 |
| Auth bypass | CWE-287 |
| Broken JWT | CWE-347 |
| Mass assignment | CWE-915 |
| File upload | CWE-434 |
| SSRF | CWE-918 |
| XXE | CWE-611 |
| Open redirect | CWE-601 |
| Sensitive data exposure | CWE-200 |
| Missing security header | CWE-693 |
| Rate limit missing | CWE-307 |
| Path traversal | CWE-22 |
| Insecure deserialization | CWE-502 |

---

## Appendix D: Evidence Checklist

Before writing any finding to findings.json:

- [ ] HTTP request captured (method, URL, headers, body)
- [ ] HTTP response captured (status, headers, body excerpt)
- [ ] Screenshot taken if visual (XSS, login bypass, data displayed)
- [ ] Tool output saved if automated (nuclei, sqlmap)
- [ ] dedupeKey computed and checked
- [ ] CVSS 4.0 and 3.1 assigned
- [ ] CWE assigned
- [ ] Remediation text written (specific, actionable)
- [ ] Reference link included (OWASP/CWE/CVE)
