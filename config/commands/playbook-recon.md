> Part of the [/playbook command](playbook.md). Load during Phase 1.
> Phase gate: present wave summary to user after each wave. Do not proceed to next wave or Phase 2 without approval.

## Phase 1: Automated Recon

Skip entire phase if `--skip-recon` is set.

Display: `[Phase 1] Recon starting — 3 waves parallel scan`

### Preflight

Before Wave 1, run:
```bash
mcp__kali-mcp__run:
  command: "bash /mnt/c/dev/pentest-framework/scripts/preflight.sh <TARGET_DOMAIN>"
  session_id: <KALI_SESSION>
```

Apply OPSEC profile:
- Default: stealth (`-T2`, proxychains where applicable)
- Override with `--opsec aggressive` to use `-T4`

### Wave 1 — Passive Recon (ALL parallel)

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

Save to `findings.json` under `recon.wave1`.

Auto-record:
- Expired/misconfigured TLS → finding (Medium)
- Wildcard DNS → note
- Interesting subdomains (admin, api, dev, staging, internal) → add to `SCOPE_TARGETS`
- WHOIS registrar/expiry/nameservers → recon profile

```
[Wave 1 Complete]
DNS records:    {n} records
Subdomains:     {n} ({interesting} interesting)
TLS:            {grade} ({cipher})
IPs:            {ips}
```

### Wave 2 — Active Recon (ALL parallel, after Wave 1)

OPSEC: Apply stealth profile. Use `-T2` unless `--opsec aggressive`.

**Port scan (per unique IP, parallel):**
```
mcp__kali-mcp__port_scan:
  target: <IP>
  ports: "1-65535"
  scan_type: "SV"
```

Fallback:
```
mcp__kali-mcp__run:
  command: "nmap -sV -sC -T4 --open <IP> -oJ /tmp/nmap-<IP>.json"
  session_id: <KALI_SESSION>
```

**Directory discovery:**
```
mcp__kali-mcp__run:
  command: "feroxbuster -u <TARGET_URL> -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -r --silent -o /tmp/ferox-<DOMAIN>.json --json -t 50 -d 3 -x php,asp,aspx,json,txt,xml 2>/dev/null || gobuster dir -u <TARGET_URL> -w /usr/share/wordlists/dirb/common.txt -o /tmp/gobuster-<DOMAIN>.txt -q"
  session_id: <KALI_SESSION>
```

**WAF detection:**
```
mcp__kali-mcp__run:
  command: "wafw00f <TARGET_URL> -o /tmp/waf-<DOMAIN>.json -f json 2>/dev/null"
  session_id: <KALI_SESSION>
```

**HTTP probing + tech detection:**
```
mcp__kali-mcp__run:
  command: "echo '<TARGET_DOMAIN>' | httpx -title -status-code -tech-detect -content-length -json -o /tmp/httpx-<DOMAIN>.json 2>/dev/null"
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

**Browser proof (budgeted — only if login-gated or JS behavior needed):**
```
mcp__HakanMCP__mcp_browserNavigateExtract:
  url: <TARGET_URL>
```
```
mcp__HakanMCP__mcp_browserCaptureProof:
  url: <TARGET_URL>
  screenshotPath: <EVIDENCE_DIR>/screenshots/recon-home.png
```
```
mcp__HakanMCP__mcp_browserProbeLogin:
  url: <TARGET_URL>
  screenshotPath: <EVIDENCE_DIR>/screenshots/recon-login.png
```

Save to `findings.json` under `recon.wave2`.

Auto-record:
- Missing security headers → finding (Low/Medium)
- Open ports beyond 80/443 → note
- Interesting directories (admin/, api/, swagger/, .git/, backup/) → `INTERESTING_PATHS`
- WAF detected → set `WAF_VENDOR`, adjust payloads
- Tech stack → set `DETECTED_TECH` for Wave 3 and Phase 2

```
[Wave 2 Complete]
Open ports:       {list}
Directories:      {n} ({interesting} interesting)
Technologies:     {tech_list}
WAF:              {vendor or none}
Forms:            {n}
Security headers: {missing_count} missing
```

### Wave 3 — Deep Recon (conditional, based on Wave 1-2)

Discovery paths reference: `~/.claude/docs/pentest-discovery-paths.md`

Skip if `--depth short`.

OPSEC: Stealth crawl. Use `interactsh-client` for OOB callbacks. Rate-limit all probes.

**Start interactsh listener:**
```
mcp__kali-mcp__run:
  command: "interactsh-client -v -o /tmp/interactsh-<DOMAIN>.log &"
  session_id: <KALI_SESSION>
```

**Crawling (all parallel):**
```
mcp__kali-mcp__run:
  command: "katana -u <TARGET_URL> -d 3 -jc -json -o /tmp/katana-<DOMAIN>.json -silent 2>/dev/null"
  session_id: <KALI_SESSION>
```
```
mcp__kali-mcp__run:
  command: "hakrawler -url <TARGET_URL> -depth 3 -plain > /tmp/hakrawler-<DOMAIN>.txt 2>/dev/null"
  session_id: <KALI_SESSION>
```
```
mcp__kali-mcp__run:
  command: "gau <TARGET_DOMAIN> --blacklist png,jpg,gif,css,woff --o /tmp/gau-<DOMAIN>.txt 2>/dev/null"
  session_id: <KALI_SESSION>
```

**Technology fingerprinting (~60 path probes):**
```
mcp__kali-mcp__run:
  command: "echo '/robots.txt /sitemap.xml /swagger /swagger/index.html /swagger/v1/swagger.json /api-docs /openapi.json /.env /config.json /.git/HEAD /package.json /actuator /actuator/health /elmah.axd /wp-admin /phpinfo.php /server-info /server-status /.well-known/security.txt /health /status /version /info /api /api/v1 /api/v2 /swagger-ui /swagger-ui.html /swagger.json /graphql /graphiql /v1/graphql /api/graphql /actuator/env /actuator/mappings /web.config /.env.local /.env.production /config.php /administrator /wp-login.php /wp-json/wp/v2/users /info.php /__debug__ /console /metrics /api/users /api/user /api/login /api/register /upload /uploads /files /backup /backups /old /archive' | tr ' ' '\\n' | xargs -I{} sh -c 'code=$(curl -sk -o /dev/null -w \"%{http_code}\" \"<TARGET_URL>{}\"); if [ \"$code\" != \"404\" ] && [ \"$code\" != \"000\" ]; then echo \"$code {}\"; fi'"
  session_id: <KALI_SESSION>
```

Auto-flag:
- `.env`, `config.*`, `backup.*` → finding (High/Critical)
- `phpinfo.php`, `debug.*` → finding (Medium)
- Swagger/OpenAPI → set `HAS_SWAGGER = true`

**If HAS_SWAGGER — parse API spec:**
```
mcp__kali-mcp__run:
  command: "curl -sk <SWAGGER_URL> | python3 -c \"import json,sys; d=json.load(sys.stdin); [print(m,p) for p,v in d.get('paths',{}).items() for m in v.keys()]\""
  session_id: <KALI_SESSION>
```

**JS bundle analysis (if JS-heavy app):**
```
mcp__kali-mcp__run:
  command: "curl -sk <TARGET_URL> | grep -oE 'src=\"[^\"]+\\.js[^\"]*\"' | head -20"
  session_id: <KALI_SESSION>
```
Per bundle:
```
mcp__kali-mcp__run:
  command: "curl -sk <JS_URL> | grep -oE '(api[_-]?key|secret|token|password|auth|bearer|AWS_)[^\"]*\"[^\"]{8,}\"' | head -30"
  session_id: <KALI_SESSION>
```

**Nuclei scan:**
```
mcp__kali-mcp__run:
  command: "nuclei -update-templates 2>/dev/null; nuclei -u <TARGET_URL> -severity critical,high,medium -json -o /tmp/nuclei-<DOMAIN>.json -rate-limit 50 -silent 2>/dev/null; nuclei -u <TARGET_URL> -t /mnt/c/dev/pentest-framework/templates/nuclei-custom/ -json -o /tmp/nuclei-custom-<DOMAIN>.json -rate-limit 30 -silent 2>/dev/null"
  session_id: <KALI_SESSION>
```

**GraphQL detection:**
```
mcp__kali-mcp__run:
  command: |
    for path in /graphql /graphiql /api/graphql /v1/graphql /__graphql; do
      resp=$(curl -sk -X POST <TARGET_URL>$path -H "Content-Type: application/json" -d '{"query":"query{__schema{types{name}}}"}')
      echo "$resp" | grep -q '"data"' && echo "GRAPHQL_FOUND: <TARGET_URL>$path INTROSPECTION_ENABLED"
    done
  session_id: <KALI_SESSION>
```

**gRPC detection:**
```
mcp__kali-mcp__run:
  command: "for port in 50051 8080 443 9090; do curl -sk --http2 -H 'content-type: application/grpc' <TARGET_DOMAIN>:$port -w '%{http_code}' -o /dev/null && echo \"GRPC_POSSIBLE:$port\"; done"
  session_id: <KALI_SESSION>
```

Save all Wave 3 results to `findings.json` under `recon.wave3`.

```
[Wave 3 Complete]
Nuclei:       {n} findings ({critical} critical, {high} high, {medium} medium)
Crawl URLs:   {n} endpoints (katana + hakrawler + gau)
GraphQL:      {found/not found} {introspection status}
gRPC:         {found/not found}
API spec:     {found/not found} {endpoint count}
JS secrets:   {n} potential
WAF:          {vendor}
OOB hits:     {interactsh callback count}
```
