> Part of the [/playbook command](playbook.md). Load this file during Phase 4 and Phase 5.
> **Phase gate:** Before generating the report, present all findings summary to the user and ask if any tests are missing. Proceed to report only with approval.

## Phase 4: Reporting

Display: `[Phase 4] Generating report`

Read final findings.json. Verify stats are current.

**Generate DOCX report:**
```bash
python3 /mnt/c/dev/pentest-framework/scripts/generate-pentest-report.py \
  <DOMAIN> \
  "/mnt/c/dev/kali-mcp/pentest-reports/<DOMAIN>-pentest-raporu.docx"
```
Script reads findings from `/mnt/c/dev/pentest-framework/data/<DOMAIN>/findings.json` and evidence from the `evidence/` subdirectory automatically.

If script fails (not yet created, import error, etc.) → note the error and display findings summary in terminal as fallback. Do not block on missing script.

**Backup copy to reports/ dir:**
```bash
cp /mnt/c/dev/kali-mcp/pentest-reports/<domain>-pentest-raporu.docx \
   /mnt/c/dev/pentest-framework/data/<domain>/reports/<domain>-pentest-raporu.docx
```
(Run only if DOCX was generated successfully.)

**Terminal summary — always display regardless of script outcome:**

```
╔══════════════════════════════════════════════════╗
║          PENTEST REPORT — <DOMAIN>               ║
╠══════════════════════════════════════════════════╣
║ Scan date:       <date>                          ║
║ Depth:           <depth>  Scope: <scope>         ║
╠══════════════════════════════════════════════════╣
║ FINDINGS                                         ║
║   Critical:      {n}                             ║
║   High:          {n}                             ║
║   Medium:        {n}                             ║
║   Low:           {n}                             ║
║   Info:          {n}                             ║
║   TOTAL:         {n}                             ║
╠══════════════════════════════════════════════════╣
║ TOP 5 FINDINGS                                   ║
║   1. [{cvss}] {title}                            ║
║   2. [{cvss}] {title}                            ║
║   3. [{cvss}] {title}                            ║
║   4. [{cvss}] {title}                            ║
║   5. [{cvss}] {title}                            ║
╠══════════════════════════════════════════════════╣
║ ATTACK CHAINS: {n}                               ║
║   Highest risk: {chain_name} ({composite_cvss})  ║
╠══════════════════════════════════════════════════╣
║ EXPLOITATION RESULTS                             ║
║   Shell access:     {shells_count}               ║
║   Credentials:      {creds_count}                ║
║   Lateral movement: {new_surfaces}               ║
║   Exploit success:  {exploited}/{total_findings} ║
╠══════════════════════════════════════════════════╣
║ REPORT: C:\dev\kali-mcp\pentest-reports\          ║
║         <domain>-pentest-raporu.docx             ║
╚══════════════════════════════════════════════════╝
```

---

## Phase 5: Save State

Display: `[Phase 5] Saving state`

### 5.1 — Update Target Profile

Read `~/.claude/docs/pentest-targets/<domain>.md`. Update the following sections:

- `## Last Scan` → current date/time, depth, scope
- `## Statistics` → current stats from findings.json
- `## Key Findings` → top 5 findings by CVSS score
- `## Attack Chains` → all detected chains
- `## Coverage` → coverage heatmap table

Use Edit tool to update file — preserve existing structure, overwrite changed sections.

### 5.2 — Finalize findings.json

Update `lastScan` timestamp. Verify `stats` counts match actual findings array length.

If adaptive engine was active, add `adaptiveContext` block:
```json
"adaptiveContext": {
  "filterMapCount": "<number of parameters probed>",
  "synthesizedPayloads": "<total generated>",
  "feedbackLoopIterations": "<times intrusion loop re-entered>",
  "newSurfacesDiscovered": "<internal hosts/creds/services found>",
  "credentialsHarvested": "<count>",
  "shellsObtained": "<count>"
}
```

Write final state.

### 5.3 — Save Evidence Manifest

Create `/mnt/c/dev/pentest-framework/data/<domain>/evidence/manifest.json`:

```json
{
  "generated": "<ISO timestamp>",
  "target": "<domain>",
  "totalArtifacts": {n},
  "artifacts": [
    {
      "type": "screenshot|http-capture|tool-output",
      "path": "evidence/...",
      "findingId": "f-001",
      "sha256": "<hash>"
    }
  ]
}
```

Compute sha256 for each artifact file using:
```
mcp__kali-mcp__run:
  command: "find <EVIDENCE_DIR> -type f -exec sha256sum {} \;"
  session_id: <KALI_SESSION>
```
**Note:** sha256 hashing is best-effort — if kali-mcp output is truncated (large evidence dir), hashes for later files may be missing. Record available hashes and mark truncated entries as `"sha256": "truncated"` in manifest.json.

### 5.4 — Close kali-mcp Session

**Guard:** If `--report-only` flag was set, skip this step — no kali-mcp session was created.

```
mcp__kali-mcp__session_delete:
  session_id: <KALI_SESSION>
```

Display final completion:
```
=== Pentest Complete ===
Domain:      <domain>
Duration:    ~{hoursSpent} hours
Findings:    {totalFindings} ({critical} critical)
Report:      /mnt/c/dev/kali-mcp/pentest-reports/<domain>-pentest-raporu.docx
Data:        /mnt/c/dev/pentest-framework/data/<domain>/
=======================
```

---

## Appendix A: Target Profile Template

When creating a new target profile at `~/.claude/docs/pentest-targets/<domain>.md`:

```markdown
# Pentest Target: <domain>

## Authorization
- **Status:** [AUTHORIZED / PENDING]
- **Authorized by:** [name / scope document]
- **Scope:** [in-scope assets]
- **Out of scope:** [exclusions]

## Target Info
- **URL:** <TARGET_URL>
- **Organization:** [org name]
- **Environment:** [production / staging / test]
- **Notes:** [any relevant context]

## Technology Stack
<!-- Populated automatically during recon -->

## Last Scan
- **Date:** —
- **Depth:** —
- **Scope:** —

## Statistics
| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 0 |
| Medium   | 0 |
| Low      | 0 |
| Info     | 0 |

## Key Findings
<!-- Top 5 findings by CVSS, populated after scan -->

## Attack Chains
<!-- Populated after correlation phase -->

## Coverage
| Test | Status | Findings |
|------|--------|----------|
<!-- Populated after assessment phase -->

## Data
- **findings.json:** `/mnt/c/dev/pentest-framework/data/<domain>/findings.json`
- **Evidence:** `/mnt/c/dev/pentest-framework/data/<domain>/evidence/`
- **Reports:** `/mnt/c/dev/pentest-framework/data/<domain>/reports/`
```

---

## Appendix B: CVSS Scoring Quick Reference

**CVSS 4.0 vectors by category (base templates — adjust per finding):**

| Category | Severity | CVSS 4.0 Vector | Score |
|----------|----------|-----------------|-------|
| Remote code execution, no auth | Critical | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:H/SI:H/SA:H | 10.0 |
| SQLi, no auth, network | Critical | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N | 9.3 |
| Auth bypass, admin access | Critical | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N | 9.2 |
| IDOR, sensitive data | High | CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N | 7.1 |
| XSS, stored | High | CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:P/VC:H/VI:L/VA:N/SC:N/SI:N/SA:N | 6.8 |
| XSS, reflected | Medium | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:L/VI:L/VA:N/SC:N/SI:N/SA:N | 5.3 |
| Missing security header | Informational | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:N/SC:N/SI:N/SA:N | 0.0 |
| Info disclosure, non-critical | Low | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:L/VI:N/VA:N/SC:N/SI:N/SA:N | 5.3 |
| SSRF internal access | Critical | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:H/SI:H/SA:N | 9.4 |
| Command injection, auth required | High | CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N | 8.7 |

CVSS 3.1 companion vectors follow standard AV/AC/PR/UI/S/C/I/A metrics. Always include both in findings.

---

## Appendix C: CWE Reference

| Category | CWE |
|----------|-----|
| SQL Injection | CWE-89 |
| XSS Stored | CWE-79 |
| XSS Reflected | CWE-79 |
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
| GraphQL introspection | CWE-200 |
| Path traversal | CWE-22 |
| Insecure deserialization | CWE-502 |

---

## Appendix D: Evidence Capture Checklist

Before writing any finding to findings.json:

- [ ] HTTP request captured (method, URL, headers, body)
- [ ] HTTP response captured (status code, headers, body excerpt)
- [ ] Screenshot taken if visual (XSS, login bypass, data displayed)
- [ ] Tool output saved if automated tool confirmed (nuclei, sqlmap, etc.)
- [ ] dedupeKey computed and checked against existing findings
- [ ] CVSS 4.0 and 3.1 scores assigned
- [ ] CWE assigned
- [ ] Remediation text written (specific, actionable)
- [ ] References include at least one authoritative link (OWASP/CWE/CVE)
