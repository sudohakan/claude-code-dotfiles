# kali-mcp Tool Inventory

## 1. Core Operations

| Tool | Parameters | Purpose |
|------|-----------|---------|
| `run` | `command` (string) | Execute arbitrary shell commands; capture to files instead of piping |
| `fetch` | `url` (string) | Fetch and process website content; cheapest recon option |
| `resources` | none | List available system resources and CLI examples |

**run() constraints:**
- Avoid pipes — save output to files: `nmap -oG results.txt target` not `nmap target | grep open`
- Avoid for-loops — use xargs: `seq 1 254 | xargs -I {} ping -c 1 192.168.1.{}` or nmap sweep

## 2. Session Management

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `session_create` | `session_name`, `description`, `target` | Create session; name as `target_YYYY-MM-DD` |
| `session_list` | none | List all sessions with metadata |
| `session_switch` | `session_name` | Switch active session |
| `session_status` | none | Show current session, target, summary |
| `session_delete` | `session_name` | Delete session and all evidence (irreversible) |
| `session_history` | none | Chronological command and evidence log |
| `session_results` | `limit` (default 3), `lines` (default 80) | Read recent output files |

## 3. Reconnaissance & Enumeration

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `recon_auto` | `target`, `depth` (quick/standard/deep) | Multi-stage automated recon pipeline |
| `network_discovery` | `target`, `discovery_type` (quick/comprehensive/stealth) | Host discovery on IP/CIDR |
| `port_scan` | `target`, `scan_type` (quick/full/stealth/udp/service/aggressive), `ports` | nmap wrapper with presets |
| `parse_nmap` | `filepath` | Parse nmap XML/text output to structured JSON |
| `vulnerability_scan` | `target`, `scan_type` (quick/comprehensive/web/network) | Multi-tool vulnerability assessment |
| `subdomain_enum` | `url`, `enum_type` (quick/comprehensive) | Subdomain brute force; uses subfinder, amass |
| `dns_enum` | `domain`, `record_types` (all/a,mx,txt,...) | DNS enumeration; attempts zone transfers |
| `enum_shares` | `target`, `enum_type` (smb/nfs/all), `username`, `password` | SMB/NFS share enumeration |

**recon_auto depth levels:**
- `quick`: DNS + ports + headers
- `standard`: quick + SSL + exploits
- `deep`: standard + subdomains + web + vulnerabilities

## 4. Web Application Testing

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `web_audit` | `url`, `audit_type` (quick/comprehensive) | Full web security audit (spider + enum + headers + SSL + vulns) |
| `web_enumeration` | `target`, `enumeration_type` (basic/full/aggressive) | Directory/file/endpoint discovery via feroxbuster/gobuster |
| `spider_website` | `url`, `depth` (default 2), `threads` (default 10) | Crawl links, resources, endpoints, parameters |
| `form_analysis` | `url`, `scan_type` (quick/comprehensive) | Analyze forms: fields, methods, CSRF, validation |
| `header_analysis` | `url`, `include_security` (default true) | HTTP header and security header analysis |
| `ssl_analysis` | `url`, `port` (default 443) | SSL/TLS config via testssl.sh + sslscan |

## 5. Exploitation & Payloads

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `exploit_search` | `search_term`, `search_type` (all/web/remote/local/dos) | Search ExploitDB, Metasploit, searchsploit |
| `payload_generate` | `payload_type`, `platform`, `lhost`, `lport`, `format`, `encoder` | msfvenom payload generator |
| `reverse_shell` | `lhost`, `lport` (default 4444), `shell_type` (bash/python/php/perl/powershell/nc/ruby/java) | Generate reverse shell one-liners |
| `hydra_attack` | `target`, `service`, `username`/`userlist`, `password`/`passlist`, `threads`, `extra_opts` | Credential brute force |

**payload_generate platforms:** linux, windows, osx, php, python
**payload_generate formats:** elf, exe, raw, python, php, war
**hydra services:** ssh, ftp, http-get, http-post-form, smb, mysql, rdp, telnet, vnc, pop3, imap, smtp

## 6. Data Processing

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `parse_tool_output` | `filepath`, `tool_type` (auto/nikto/gobuster/dirb/hydra/sqlmap) | Parse scanner output to structured findings |
| `file_analysis` | `filepath` | File type, strings extraction, MD5/SHA hash |
| `hash_identify` | `hash_value` | Identify hash type (MD5, SHA, NTLM, bcrypt, etc.) |
| `encode_decode` | `data`, `operation` (encode/decode), `format` (base64/url/hex/html/rot13) | Multi-format encoding |

## 7. Evidence & Reporting

| Tool | Key Parameters | Purpose |
|------|---------------|---------|
| `credential_store` | `action` (add/list/search), `target`, `service`, `username`, `password`, `notes` | Store and retrieve discovered credentials |
| `save_output` | `content`, `filename`, `category` (scan/enum/evidence/general) | Save evidence to timestamped session file |
| `create_report` | `title`, `findings`, `report_type` (markdown/text/json) | Generate structured report |
| `download_file` | `url`, `filename` | Download file from URL |

## 8. CLI Tools in Container

### Scanning & Recon
| Tool | Purpose |
|------|---------|
| nmap | Network mapper (all scan types) |
| netcat, socat | Network relay and piping |
| httpx | HTTP probe and fingerprinting |
| whatweb | Web technology fingerprinting |
| wafw00f | WAF detection |
| amass, subfinder | Subdomain discovery |
| dig, nslookup, whois | DNS and WHOIS |
| tcpdump, tshark | Packet capture and traffic analysis |

### Web Testing
| Tool | Purpose |
|------|---------|
| nikto | Web server scanner |
| gobuster, dirb | Directory/DNS brute force |
| feroxbuster | Recursive content discovery (Rust; prefer over gobuster for web) |
| ffuf | Fast web fuzzer — directories, parameters, headers, POST bodies |
| wfuzz | Web fuzzer (legacy) |
| katana | JS-aware web crawler; finds SPA endpoints traditional crawlers miss |
| gau | Historical URL discovery from Wayback, Common Crawl, OTX, URLScan |
| waybackurls | Wayback machine URL enumeration |
| nuclei | Template-based vulnerability scanner (10K+ templates) |
| wpscan | WordPress vulnerability scanner |
| dalfox | Automated XSS scanner with WAF bypass |
| arjun | Hidden HTTP parameter discovery (25K+ wordlist) |
| paramspider | Historical parameter URL mining from Wayback Machine |
| interactsh-client | OOB interaction detection for blind SSRF, XXE, RCE |

### Exploitation
| Tool | Purpose |
|------|---------|
| metasploit (msfconsole) | Exploitation framework |
| msfvenom | Payload generator |
| searchsploit | ExploitDB offline search |
| sqlmap | Automated SQL injection exploitation |
| commix | Automated OS command injection |
| SSTImap (`/opt/SSTImap/`) | SSTI detection + RCE (Jinja2, Twig, Freemarker, Velocity, ERB) |
| jwt_tool (`/opt/jwt_tool/`) | JWT attack automation (alg:none, key confusion, brute force) |
| XSStrike (`/opt/XSStrike/`) | Context-aware XSS scanner |
| GraphQLmap (`/opt/GraphQLmap/`) | GraphQL introspection, injection, mutation abuse |
| NoSQLMap (`/opt/NoSQLMap/`) | NoSQL injection (MongoDB, CouchDB, Redis) |
| smuggler (`/opt/smuggler/`) | HTTP request smuggling detection |
| phpggc | PHP deserialization gadget chain generator |
| webshells (`/opt/webshells/`) | PHP, ASPX, JSP webshell collection |

### Post-Exploitation & Pivoting
| Tool | Purpose |
|------|---------|
| linPEAS, winPEAS | Privilege escalation enumeration |
| pspy | Unprivileged process spy (detects hidden cron/root commands) |
| chisel (`/opt/chisel`) | HTTP tunneling / SOCKS pivoting |
| ligolo-proxy | Transparent tunnel and pivot (preferred over chisel for L3 pivoting) |
| mimikatz | Windows credential extraction |
| PayloadsAllTheThings (`/opt/PayloadsAllTheThings/`) | Reference payload library |

### Active Directory
| Tool | Purpose |
|------|---------|
| impacket suite | secretsdump, GetUserSPNs, GetNPUsers, psexec, wmiexec, smbclient |
| bloodhound-python | AD attack path collection |
| certipy | ADCS ESC testing |
| responder | LLMNR/NBT-NS poisoning |
| crackmapexec | SMB/WinRM lateral movement |
| kerbrute | Kerberos user enumeration and password spray |
| ldapdomaindump | LDAP enumeration |

### Password Cracking
| Tool | Purpose |
|------|---------|
| john | Password cracker |
| hashcat | GPU-accelerated hash cracker |
| hydra, medusa | Parallel network login brute force |
| cewl | Custom wordlist generation from web content |
| crunch | Wordlist generation by pattern |

### Network & Infrastructure
| Tool | Purpose |
|------|---------|
| smbclient, enum4linux | SMB enumeration |
| showmount | NFS mount enumeration |
| snmpwalk, rpcclient | SNMP/RPC enumeration |
| testssl.sh, sslscan | SSL/TLS configuration testing |
| openssl | Certificate inspection, encryption |
| grpcurl | gRPC service testing (list, describe, call) |

### OSINT & Anonymity
| Tool | Purpose |
|------|---------|
| tor, proxychains4 | Traffic anonymization and proxying |
| exiftool | File metadata extraction |
| macchanger | MAC address randomization |
| trufflehog | Secret and credential discovery in repos/files |
| mariadb (mysql client) | Database access after credential recovery |

### Utilities
| Tool | Purpose |
|------|---------|
| curl, wget | HTTP clients |
| jq | JSON processing |
| strings, file | Binary analysis |
| md5sum, sha256sum | Hash computation |
| shred | Secure file deletion |
| gpg | File encryption/decryption |

## 9. /opt/opsec/ Toolkit

| Script | Purpose |
|--------|---------|
| `revshell.py` | Staged reverse shell launcher with encoding options |
| `stealth_session.py` | Rate-limited HTTP session wrapper for low-noise scanning |
| `c2-handler.py` | Lightweight C2 listener for PoC sessions |
| `exfil-check.py` | Verify data exfiltration path before exploitation |

Usage: `mcp__kali-mcp__run` with full path `/opt/opsec/<script>.py`

## 10. Wordlists

| Path | Contents |
|------|----------|
| `/usr/share/wordlists/rockyou.txt` | Common passwords |
| `/usr/share/seclists/Discovery/Web-Content/` | Directory and file wordlists |
| `/usr/share/seclists/Passwords/` | Password lists |
| `/usr/share/seclists/Usernames/` | Username lists |
| `/mnt/c/dev/pentest-framework/templates/nuclei-custom/` | Custom org nuclei templates |

## 11. Optimal Usage Patterns

### Web Application Assessment
```
1. web_enumeration(target, enumeration_type="full")
2. header_analysis(url)
3. ssl_analysis(url, port=443)
4. form_analysis(url + "/login")
5. web_audit(url, audit_type="comprehensive")
6. run("nuclei -u <url> -severity critical,high,medium -json -o /tmp/nuclei.json")
7. run("dalfox url '<url>?param=test' --waf-evasion -o /tmp/dalfox.txt")
```

### Network Reconnaissance
```
1. network_discovery(target, discovery_type="comprehensive")
2. port_scan(target, scan_type="full")
3. exploit_search(search_term="<service_version>")
```

### Subdomain & DNS Enumeration
```
1. subdomain_enum(url, enum_type="comprehensive")
2. dns_enum(domain, record_types="all")
3. run("gau <domain> --o /tmp/gau.txt")
4. run("katana -u https://<domain> -d 3 -jc -json -o /tmp/katana.json")
```

### Parameter Discovery → Injection
```
1. run("arjun -u https://target/endpoint -m POST -oJ /tmp/params.json")
2. run("paramspider -d target.com --output /tmp/urls.txt")
3. run("cat /tmp/urls.txt | dalfox pipe --waf-evasion -o /tmp/xss.txt")
4. run("sqlmap -u 'https://target?param=test' --batch --os-shell")
```

### Session-Persistent Engagement
```
1. session_create(session_name="target_YYYY-MM-DD", target="target.com")
2. recon_auto(target="target.com", depth="deep")
3. session_results(limit=10)
4. save_output(content="key findings", category="evidence")
5. create_report(title="Assessment Report", findings="<findings>")
```

### OOB / Blind Vulnerability Detection
```
1. run("interactsh-client -v -o /tmp/interactsh.log &")
2. # Use the generated payload URL in SSRF/XXE/RCE test points
3. # Monitor /tmp/interactsh.log for callbacks
```

## 12. Key Constraints

- Pipes in `run()`: avoid — save to files, then read
- For-loops in `run()`: avoid — use xargs or tool's built-in concurrency
- Sessions: use for every engagement to organize evidence per target
- Rate limiting: tune thread counts to avoid detection or blocking
- Authorization: only use on authorized targets, CTF, or own infrastructure
