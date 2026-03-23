# Kali MCP Capability Matrix

## Support Levels

| Level | Meaning |
|-------|---------|
| Native | Dedicated MCP tool exists and should be preferred |
| Indirect | Supported via `run` with a known CLI workflow |
| On-demand | Use only when target, scope, or evidence requires it |

## Core Workflow Matrix

| Need | Preferred Interface | Level | Evidence Output | Notes |
|------|---------------------|-------|-----------------|-------|
| Generic command execution | `mcp__kali-mcp__run` | Native | stdout, saved files | Fallback for specialist tooling |
| Session lifecycle | `session_create`, `session_status`, `session_results`, `session_delete` | Native | session metadata | Use for every engagement |
| Passive HTTP fetch | `mcp__kali-mcp__fetch` | Native | response text | Cheapest way to inspect a page |
| DNS enumeration | `mcp__kali-mcp__dns_enum` | Native | structured output | Preferred over raw `dig` unless custom query needed |
| Subdomain enumeration | `mcp__kali-mcp__subdomain_enum` | Native | structured output | Use before brute-force wrappers |
| SSL/TLS analysis | `mcp__kali-mcp__ssl_analysis` | Native | structured output | Preferred over ad hoc `openssl s_client` |
| Host discovery | `mcp__kali-mcp__network_discovery` | Native | structured output | Good default for IP/CIDR starting point |
| Port scanning | `mcp__kali-mcp__port_scan` | Native | structured output | Use `run` only for custom nmap flags |
| Nmap parsing | `mcp__kali-mcp__parse_nmap` | Native | parsed JSON | Use after raw nmap output |
| Web crawling | `mcp__kali-mcp__spider_website` | Native | links/resources | Lower token cost than browser snapshots |
| Form analysis | `mcp__kali-mcp__form_analysis` | Native | form metadata | Use before browser automation |
| Header analysis | `mcp__kali-mcp__header_analysis` | Native | header report | Cheap evidence for web hardening gaps |
| Web content discovery | `mcp__kali-mcp__web_enumeration` | Native | ferox/gobuster output | Preferred over manual ffuf for routine discovery |
| Web security audit | `mcp__kali-mcp__web_audit` | Native | consolidated scan output | Good first-pass web assessment |
| Vulnerability scan | `mcp__kali-mcp__vulnerability_scan` | Native | nuclei/tool output | Use selectively, not as the only evidence |
| Share enumeration | `mcp__kali-mcp__enum_shares` | Native | accessible share list | Infra and AD flows |
| Credential brute-force | `mcp__kali-mcp__hydra_attack` | Native | attack output | Respect authorization and stealth mode |
| Exploit search | `mcp__kali-mcp__exploit_search` | Native | exploit references | Prefer before Metasploit |
| Payload generation | `mcp__kali-mcp__payload_generate` | Native | payload artifact | For PoC and controlled exploitation |
| Reverse shell helpers | `mcp__kali-mcp__reverse_shell` | Native | shell snippets | Only after approval |
| File analysis | `mcp__kali-mcp__file_analysis` | Native | analysis summary | Useful for APK/IPA or loot review |
| Output persistence | `mcp__kali-mcp__save_output` | Native | timestamped files | Prefer over verbose chat dumps |
| Reporting | `mcp__kali-mcp__create_report` or report script via `run` | Native / Indirect | report artifact | Use script fallback if native formatter is insufficient |

## Specialist Coverage Matrix

| Surface | Preferred Path | Level | Notes |
|---------|----------------|-------|-------|
| AD | `run` with Impacket, BloodHound, Certipy, kerbrute | Indirect | No dedicated AD wrappers; document exact command paths |
| Cloud | `run` with aws, az, gcloud, kubectl, docker | Indirect | Pair with `fetch` for metadata probing |
| Mobile | `run` with frida, objection, apktool, jadx | Indirect | Use `file_analysis` for quick triage |
| WiFi / BLE | `run` with aircrack-ng, bettercap, hcitool, gatttool | Indirect | Hardware-dependent; preflight mandatory |
| IoT / OT | `run` with mosquitto, mbtget, nmap NSE | Indirect | Treat as high-risk module |
| Social engineering | External workflows and manual approval | On-demand | Never auto-execute |

## Browser Evidence Matrix

| Need | Preferred Interface | Level | Notes |
|------|---------------------|-------|-------|
| Static page content | `fetch` | Native | Cheapest option |
| Links and assets | `spider_website` | Native | Use before browser crawl |
| Form discovery | `form_analysis` | Native | Use before login automation |
| Screenshot proof | Playwright or HakanMCP browser bridge | On-demand | One screenshot per meaningful state |
| JS-only login or SPA behavior | Playwright or HakanMCP browser bridge | On-demand | Keep the action set minimal |
| Full DOM/accessibility dump | `browser_snapshot` | On-demand | Avoid unless no cheaper path exists |
| Full request waterfall | `browser_network_requests` | On-demand | Use only for auth/API proof |
