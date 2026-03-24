# Kali MCP Capability Matrix

## Support Levels

| Level | Meaning |
|-------|---------|
| Native | Dedicated MCP tool exists and should be preferred |
| Indirect | Supported via `run` with a known CLI workflow |
| On-demand | Use only when target, scope, or evidence requires it |

## Core Workflow Matrix

| Need | Preferred Interface | Level | Notes |
|------|---------------------|-------|-------|
| Generic command execution | `run` | Native | Fallback for specialist tooling |
| Session lifecycle | `session_create`, `session_status`, `session_results`, `session_delete` | Native | Use for every engagement |
| Passive HTTP fetch | `fetch` | Native | Cheapest way to inspect a page |
| DNS enumeration | `dns_enum` | Native | Preferred over raw `dig` |
| Subdomain enumeration | `subdomain_enum` | Native | Use before brute-force wrappers |
| SSL/TLS analysis | `ssl_analysis` | Native | Preferred over ad hoc `openssl s_client` |
| Host discovery | `network_discovery` | Native | Default for IP/CIDR starting point |
| Port scanning | `port_scan` | Native | Use `run` only for custom nmap flags |
| Nmap parsing | `parse_nmap` | Native | Use after raw nmap output |
| Web crawling | `spider_website` | Native | Lower token cost than browser snapshots |
| JS-aware crawling | `run` with katana | Indirect | Use for SPAs and heavy JS apps |
| Historical URL discovery | `run` with gau | Indirect | Complements active crawling |
| WAF detection | `run` with wafw00f | Indirect | Use before active scanning |
| Form analysis | `form_analysis` | Native | Use before browser automation |
| Header analysis | `header_analysis` | Native | Cheap evidence for web hardening gaps |
| Web content discovery | `web_enumeration` | Native | Preferred over manual ffuf for routine discovery |
| Web security audit | `web_audit` | Native | Good first-pass web assessment |
| Vulnerability scan | `vulnerability_scan` | Native | Use selectively, not as the only evidence |
| Share enumeration | `enum_shares` | Native | Infra and AD flows |
| Credential brute-force | `hydra_attack` | Native | Respect authorization and stealth mode |
| Exploit search | `exploit_search` | Native | Prefer before Metasploit |
| Payload generation | `payload_generate` | Native | For PoC and controlled exploitation |
| Reverse shell helpers | `reverse_shell` | Native | Only after approval |
| XSS scanning | `run` with dalfox | Indirect | WAF evasion mode available |
| Parameter discovery | `run` with arjun | Indirect | 25K+ wordlist, GET and POST |
| OOB interaction detection | `run` with interactsh-client | Indirect | Blind SSRF, XXE, RCE verification |
| PHP deserialization | `run` with phpggc | Indirect | Generate gadget chains by framework |
| File analysis | `file_analysis` | Native | Useful for APK/IPA or loot review |
| Output persistence | `save_output` | Native | Prefer over verbose chat dumps |
| Reporting | `create_report` or report script via `run` | Native / Indirect | Use script fallback if native formatter insufficient |

## Specialist Coverage Matrix

| Surface | Preferred Path | Level | Notes |
|---------|----------------|-------|-------|
| AD | `run` with impacket, BloodHound, Certipy, kerbrute | Indirect | No dedicated AD wrappers |
| Cloud | `run` with aws, az, gcloud, kubectl, docker | Indirect | Pair with `fetch` for metadata probing |
| Mobile | `run` with frida, objection, apktool, jadx | Indirect | Use `file_analysis` for quick triage |
| WiFi / BLE | `run` with aircrack-ng, bettercap, hcitool, gatttool | Indirect | Hardware-dependent; preflight mandatory |
| IoT / OT | `run` with mosquitto, mbtget, nmap NSE | Indirect | Treat as high-risk module |
| Pivoting | `run` with ligolo-proxy or chisel | Indirect | ligolo preferred for L3 transparency |
| Social engineering | External workflows and manual approval | On-demand | Never auto-execute |

## Browser Evidence Matrix

| Need | Preferred Interface | Level | Notes |
|------|---------------------|-------|-------|
| Static page content | `fetch` | Native | Cheapest option |
| Links and assets | `spider_website` | Native | Use before browser crawl |
| JS-rendered content | `run` with katana | Indirect | Cheaper than browser for link discovery |
| Form discovery | `form_analysis` | Native | Use before login automation |
| Screenshot proof | Playwright or HakanMCP browser bridge | On-demand | One screenshot per meaningful state |
| JS-only login or SPA behavior | Playwright or HakanMCP browser bridge | On-demand | Keep action set minimal |
| Full DOM/accessibility dump | `browser_snapshot` | On-demand | Avoid unless no cheaper path exists |
| Full request waterfall | `browser_network_requests` | On-demand | Use only for auth/API proof |
