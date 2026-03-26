---
description: "Playbook Extract — automated data exfiltration from pentest targets using existing findings and access"
---

# Playbook Extract

Automated data collection pipeline. Reads findings.json + loot.md, identifies all accessible data sources, downloads everything to the local data directory.

```
/playbook-extract <domain> [flags]
```

| Argument | Required | Description |
|----------|----------|-------------|
| `<domain>` | Yes | Target domain (must have existing data in data dir) |
| `--full` | No | Download everything including large files (logs, DB dumps) |
| `--delta` | No | Only download files not already saved |
| `--verify` | No | Verify existing files are still accessible without re-downloading |

**Data dir:** `/mnt/c/dev/pentest-framework/data/<domain>/`

## Execution Flow

### Phase 0: Load Context

1. Read `findings.json` — extract all confirmed accessible endpoints
2. Read `loot.md` — extract all credentials, tokens, session info
3. Read `operations.json` — identify previously discovered resources
4. Build access inventory: what files/endpoints are accessible with what auth

### Phase 1: Unauthenticated File Harvest

Download all files accessible without authentication. Sources:

| Category | Pattern | Save to |
|----------|---------|---------|
| Config files | `.env`, `.env.example`, `composer.*`, `package.json`, `artisan` | `exposed-files/` |
| Source code | `resources/views/**/*.blade.php` (recursive discovery) | `exposed-files/blade/` |
| Bootstrap cache | `bootstrap/cache/*.php` | `exposed-files/` |
| Build configs | `webpack.mix.js`, `tailwind.config.js`, `phpunit.xml`, `mix-manifest.json` | `exposed-files/` |
| Vendor metadata | `vendor/composer/installed.json` | `exposed-files/` |
| CDN assets | CSS/JS/images from writable CDN folders | `exposed-files/cdn/` |
| Logs | `storage/logs/laravel.log` (first 5MB + last 5MB, or `--full` for complete) | `extracted/` |
| Public files | `robots.txt`, `.htaccess`, `README.md` | `exposed-files/` |
| Session samples | Decrypt own cookie → read session file as format reference | `extracted/` |

**Discovery method for blade templates:**
```
Try common Laravel directory names:
auth/, admin/auth/, layouts/, components/, user/, admin/, emails/,
vendor/notifications/, vendor/mail/html/, partials/

Within each: index, create, edit, show, list, header, footer, message, layout, email, button

Also try names derived from route map in loot.md (e.g., user.points → user/points/index.blade.php)
```

### Phase 2: Authenticated Data Harvest

Use credentials from loot.md to access protected resources:

| Auth Method | Data Source | Save to |
|-------------|------------|---------|
| Web session (cookie auth) | Account pages, settings, tickets, orders | `extracted/` |
| API key | Service catalogs, balance, order history | `extracted/` |
| IMAP credentials | Email inbox dump | `extracted/` |
| CDN token | Upload capability test, existing file inventory | `extracted/` |
| Sanctum/JWT | API endpoints accessible to authenticated users | `extracted/` |

For each child/sibling panel: login, collect CDN token, dump accessible data.

### Phase 3: Log Intelligence Extraction

Parse downloaded logs for intelligence:

| Target | Regex/Pattern | Save to |
|--------|---------------|---------|
| Email addresses | `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` | `extracted/log-emails.txt` |
| Server paths | `/home/[a-zA-Z0-9/_.-]+` | `extracted/log-paths.txt` |
| DB table names | `table.*'[a-zA-Z_]+'` | `extracted/log-db-tables.txt` |
| SQL queries | `SQLSTATE`, query strings | `extracted/log-db-queries.txt` |
| Error distribution | Exception class names | `extracted/log-errors.txt` |
| Tokens/secrets | `token=`, `key=`, `secret=`, `password=` | `extracted/log-secrets.txt` |
| IP addresses | IPv4 pattern | `extracted/log-ips.txt` |
| User agents | `User-Agent:` header in logs | `extracted/log-useragents.txt` |

### Phase 4: Findings-Based Extraction

For each finding in findings.json, check if there is extractable data not yet saved:

| Finding Type | Action |
|--------------|--------|
| File exposure | Download the file if not in exposed-files/ |
| API endpoint accessible | Call and save response |
| Credential confirmed | Use to access additional resources |
| XSS/injection confirmed | Save proof-of-concept |
| Information disclosure | Extract and categorize the disclosed info |

### Phase 5: Index and Verify

1. Update `extracted/README.md` — index of all extracted files with descriptions
2. Update `loot.md` — add any new credentials, tokens, or intelligence found during extraction
3. Verify file integrity — check all downloaded files are non-empty and valid
4. Generate summary: total files, total size, categories, new vs existing

## Output Format

```
=== Playbook Extract Complete ===
Target:    <domain>
Data dir:  /mnt/c/dev/pentest-framework/data/<domain>/

exposed-files/  XX files  XX MB
extracted/      XX files  XX MB

New data:       XX files  XX MB
Verified:       XX/XX files still accessible
Failed:         XX files no longer accessible

Categories:
  Config files:     XX
  Source code:      XX (blade templates)
  Logs:             XX MB
  CDN assets:       XX
  API responses:    XX
  Intelligence:     XX (emails, paths, errors, etc.)
================================
```

## Rules

- Follow OPSEC profile from pentest-operations.md (stealth UA rotation, timing)
- Use Range headers for large files (logs) unless `--full` is specified
- Save to Windows path `/mnt/c/dev/pentest-framework/data/<domain>/`
- Never overwrite existing files unless `--full` re-download
- Use parallel downloads (background curl) where possible
- Update loot.md after extraction, not during
- Log all download attempts to operations.json
