> Part of the [/playbook command](playbook.md). Load this file during Phase 1.
> **Phase gate:** At the end of each wave and when recon is complete, present summary to user and get approval. Do not proceed to the next wave or Phase 2 without approval.

## Phase 1: Automated Recon

**Skip entire phase if `--skip-recon` is set.**

Display: `[Phase 1] Recon starting — 3 waves parallel scan`

### Wave 1 — Passive Recon (ALL parallel)

Run ALL of the following simultaneously. Do not wait for one before starting the next.

**DNS enumeration:**
```
mcp__kali-mcp__dns_enum:
  domain: <TARGET_DOMAIN>
```

**Subdomain enumeration:**
```
mcp__kali-mcp__subdomain_enum:
  domain: <TARGET_DOMAIN>
```

**SSL/TLS analysis:**
```
mcp__kali-mcp__ssl_analysis:
  url: <TARGET_URL>
```

**WHOIS:**
```
mcp__kali-mcp__run:
  command: "whois <TARGET_DOMAIN>"
  session_id: <KALI_SESSION>
```

**IP resolution:**
```
mcp__kali-mcp__run:
  command: "dig <TARGET_DOMAIN> +short && dig www.<TARGET_DOMAIN> +short"
  session_id: <KALI_SESSION>
```

Collect results. Save to `findings.json` under `recon.wave1`.

**Wave 1 findings to auto-record:**
- Expired/misconfigured TLS → finding (severity: Medium)
- Wildcard DNS → note in recon
- Interesting subdomains (admin, api, dev, staging, internal) → add to `SCOPE_TARGETS` for Wave 2
- WHOIS: registrar, expiry, name servers → save in recon profile

Display wave 1 summary:
```
[Wave 1 Complete]
DNS records:    {n} records
Subdomains:     {n} subdomains ({interesting} interesting)
TLS:            {grade} (cipher: {cipher})
IPs:            {ips}
```

### Wave 2 — Active Recon (ALL parallel, after Wave 1)

Wait for Wave 1 IPs to be known, then run ALL of the following simultaneously.

**Port scan (per unique IP — run in parallel across IPs):**
```
mcp__kali-mcp__port_scan:
  target: <IP>
  ports: "1-65535"
  scan_type: "SV"
```

Or if port_scan unavailable, use run:
```
mcp__kali-mcp__run:
  command: "nmap -sV -sC -T4 --open <IP> -oJ /tmp/nmap-<IP>.json"
  session_id: <KALI_SESSION>
```

**Directory discovery (feroxbuster — recursive):**
```
mcp__kali-mcp__run:
  command: "feroxbuster -u <TARGET_URL> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -r --silent -o /tmp/ferox-<domain>.json --json -t 50 -d 3 -x php,asp,aspx,json,txt,xml 2>/dev/null || gobuster dir -u <TARGET_URL> -w /usr/share/wordlists/dirb/common.txt -o /tmp/gobuster-<domain>.txt -q"
  session_id: <KALI_SESSION>
```

**HTTP probing + tech detection (httpx):**
```
mcp__kali-mcp__run:
  command: "echo '<TARGET_DOMAIN>' | httpx -title -status-code -tech-detect -content-length -json -o /tmp/httpx-<domain>.json 2>/dev/null || curl -sk -I <TARGET_URL>"
  session_id: <KALI_SESSION>
```

**Security header analysis:**
```
mcp__kali-mcp__header_analysis:
  url: <TARGET_URL>
```

**Form analysis:**
```
mcp__kali-mcp__form_analysis:
  url: <TARGET_URL>
```

**Spider/crawl:**
```
mcp__kali-mcp__spider_website:
  url: <TARGET_URL>
  depth: 3
```

**Optional browser proof (budgeted):**
Only if login-gated rendering, JavaScript behavior, or visual evidence is needed:
```
mcp__HakanMCP__mcp_browserNavigateExtract:
  url: <TARGET_URL>
```
Then capture a single screenshot:
```
mcp__HakanMCP__mcp_browserCaptureProof:
  url: <TARGET_URL>
  screenshotPath: <EVIDENCE_DIR>/screenshots/recon-home.png
```
Prefer these HakanMCP wrappers over raw Playwright because they compress browser output. Avoid raw `browser_snapshot` and `browser_network_requests` during routine recon.

If login page detected (form with password field):
```
mcp__HakanMCP__mcp_browserProbeLogin:
  url: <TARGET_URL>
  screenshotPath: <EVIDENCE_DIR>/screenshots/recon-login.png
```

Save to `findings.json` under `recon.wave2`.

**Wave 2 auto-findings:**
- Missing security headers (CSP, HSTS, X-Frame-Options) → finding (severity: Low/Medium based on header)
- Open ports beyond 80/443 → note for infra scope
- Interesting directories (admin/, api/, swagger/, .git/, backup/) → add to `INTERESTING_PATHS`
- Technology stack detected → set `DETECTED_TECH` list for Wave 3 and Phase 2 decision engine

Display wave 2 summary:
```
[Wave 2 Complete]
Open ports:       {list}
Directories:      {n} discovered ({interesting} interesting)
Technologies:     {tech_list}
Forms:            {n} forms found
Security headers: {missing_count} missing headers
```

### Wave 3 — Deep Recon (conditional, based on Wave 1-2 results)

> **Discovery paths reference:** Load `~/.claude/docs/pentest-discovery-paths.md` for 300+ technology-specific paths.
> Use the framework-specific tables to probe based on detected technology from Wave 1-2.

**Skip if `--depth short`.**

Run ALL applicable checks in parallel based on `DETECTED_TECH`.

**Technology fingerprinting (~60 path probes):**
```
mcp__kali-mcp__run:
  command: "echo '/robots.txt /sitemap.xml /swagger /swagger/index.html /swagger/v1/swagger.json /api-docs /openapi.json /.env /config.json /.git/HEAD /package.json /actuator /actuator/health /elmah.axd /wp-admin /phpinfo.php /server-info /server-status /.well-known/security.txt /health /status /version /info /meta.json /api /api/v1 /api/v2 /swagger-ui /swagger-ui.html /swagger.json /graphql /graphiql /.graphql /v1/graphql /api/graphql /actuator/env /actuator/mappings /web.config /.env.local /.env.production /config.php /administrator /wp-login.php /wp-json/wp/v2/users /info.php /test.php /debug.php /__debug__ /console /monitoring /metrics /api/users /api/user /api/login /api/register /api/password /upload /uploads /files /backup /backups /old /archive' | tr ' ' '\n' | xargs -I{} sh -c 'code=$(curl -sk -o /dev/null -w \"%{http_code}\" \"<TARGET_URL>{}\"); if [ \"$code\" != \"404\" ] && [ \"$code\" != \"000\" ]; then echo \"$code {}\"; fi'"
  session_id: <KALI_SESSION>
```

Save non-404 paths to `INTERESTING_PATHS`. Auto-flag:
- `.env`, `config.*`, `backup.*` → finding (severity: High/Critical based on content)
- `phpinfo.php`, `debug.*` → finding (severity: Medium)
- Swagger/OpenAPI endpoints → set `HAS_SWAGGER = true`, save URL

**If `HAS_SWAGGER = true` — parse API spec:**
```
mcp__kali-mcp__run:
  command: "curl -sk <swagger_url> | python3 -c \"import json,sys; d=json.load(sys.stdin); paths=list(d.get('paths',{}).keys()); [print(p) for p in paths]\""
  session_id: <KALI_SESSION>
```
Extract: all API endpoints, HTTP methods per endpoint, parameters, authentication schemes. Save to `recon.apiSpec`.

**JS bundle analysis (if JS-heavy app detected):**
```
mcp__kali-mcp__run:
  command: "curl -sk <TARGET_URL> | grep -oE 'src=\"[^\"]+\\.js[^\"]*\"' | head -20"
  session_id: <KALI_SESSION>
```
For each found JS bundle:
```
mcp__kali-mcp__run:
  command: "curl -sk <js_url> | grep -oE '(api[_-]?key|secret|token|password|auth|bearer|AWS_|REACT_APP_)[^\"]*\"[^\"]{8,}\"' | head -30"
  session_id: <KALI_SESSION>
```
Any hardcoded secrets found → immediate finding (severity: Critical).

**Nuclei scan:**
```
mcp__kali-mcp__run:
  command: "nuclei -update-templates 2>/dev/null; nuclei -u <TARGET_URL> -severity critical,high,medium -json -o /tmp/nuclei-<domain>.json -rate-limit 50 -silent 2>/dev/null; nuclei -u <TARGET_URL> -t /mnt/c/dev/pentest-framework/templates/nuclei-custom/ -json -o /tmp/nuclei-custom-<domain>.json -rate-limit 30 -silent 2>/dev/null"
  session_id: <KALI_SESSION>
```
Parse JSON output. Each nuclei finding → create finding entry (deduplicated).

**Katana crawl:**
```
mcp__kali-mcp__run:
  command: "katana -u <TARGET_URL> -d 3 -jc -json -o /tmp/katana-<domain>.json -silent 2>/dev/null"
  session_id: <KALI_SESSION>
```
Extract discovered endpoints. Add to `CRAWL_URLS` for Phase 2 testing.

**GraphQL detection:**
```
mcp__kali-mcp__run:
  command: |
    # Individual curl calls per path (no bash for-loop)
    for_gql() { path=$1; resp=$(curl -sk -X POST <TARGET_URL>$path -H "Content-Type: application/json" -d '{"query":"query{__schema{types{name}}}"}' -w "\n%{http_code}"); body=$(echo "$resp" | head -1); echo "$body" | grep -q '"data"' && echo "GRAPHQL_FOUND: <TARGET_URL>$path INTROSPECTION_ENABLED" || (echo "$body" | grep -q 'graphql\|query' && echo "GRAPHQL_FOUND: <TARGET_URL>$path INTROSPECTION_BLOCKED"); }
    for_gql /graphql
    for_gql /graphiql
    for_gql /api/graphql
    for_gql /v1/graphql
    for_gql /__graphql
  session_id: <KALI_SESSION>
```
If found → set `HAS_GRAPHQL = true`, `GRAPHQL_URL`, `GRAPHQL_INTROSPECTION` state.

**gRPC detection (ports 50051, 8080, 443, and any other non-standard ports open):**
For ports 50051, 8080, 443, and any other non-80 port found in Wave 2:
```
mcp__kali-mcp__run:
  command: "curl -sk --http2 -H 'content-type: application/grpc' <TARGET_DOMAIN>:50051 -w '%{http_code}' -o /dev/null && echo 'GRPC_POSSIBLE' || echo 'GRPC_CHECK_UNSUPPORTED'; curl -sk --http2 -H 'content-type: application/grpc' <TARGET_DOMAIN>:8080 -w '%{http_code}' -o /dev/null && echo 'GRPC_POSSIBLE' || echo 'GRPC_CHECK_UNSUPPORTED'; curl -sk --http2 -H 'content-type: application/grpc' <TARGET_DOMAIN>:443 -w '%{http_code}' -o /dev/null && echo 'GRPC_POSSIBLE' || echo 'GRPC_CHECK_UNSUPPORTED'"
  session_id: <KALI_SESSION>
```
Also run for any additional non-standard port detected in Wave 2 (substitute `<port>`):
```
mcp__kali-mcp__run:
  command: "curl -sk --http2 -H 'content-type: application/grpc' <TARGET_DOMAIN>:<port> -w '%{http_code}' -o /dev/null && echo 'GRPC_POSSIBLE' || echo 'GRPC_CHECK_UNSUPPORTED'"
  session_id: <KALI_SESSION>
```
If gRPC signal → set `HAS_GRPC = true`.

Save all Wave 3 results to `findings.json` under `recon.wave3`.

Display wave 3 summary:
```
[Wave 3 Complete]
Nuclei:       {n} findings ({critical} critical, {high} high, {medium} medium)
Crawl URLs:   {n} endpoints discovered
GraphQL:      {found/not found} {introspection status if found}
gRPC:         {found/not found}
API spec:     {found/not found} {endpoint count if found}
JS secrets:   {n} potential secrets
```
