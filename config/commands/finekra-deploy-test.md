# Finekra Deploy Test — SSH-Based Test Server Deployment

Deploy Finekra projects to the test server (172.16.220.54) via SSH. Builds locally, transfers via SCP, manages IIS app pools remotely.

## Usage

```
/finekra-deploy-test <projects> [--alt]
```

- `<projects>`: Comma-separated short names (see Project Map)
- `--alt`: Use alternate IIS sites when primary environment is busy (user will state "dolu")

**Examples:**
```
/finekra-deploy-test panel, api
/finekra-deploy-test api, job, mainerp
/finekra-deploy-test panel --alt
```

## Approval Philosophy

Runs autonomously. **Only stop for user input when a decision could cause service disruption or data loss.**

**Requires approval (STOP and ask):**
- Build/publish failure that can't be auto-resolved
- SSH connectivity failure
- App pool won't restart after deploy

**Auto-decided (just inform):**
- ApiforContext.js URL updates for test environment
- Branch verification and auto-switch to master for dependency projects
- File transfer progress
- App pool stop/start

## Project Map

| Short Name | Repo | Runnable Project | IIS Site | Alt Site |
|------------|------|-----------------|----------|----------|
| panel | Frontend/Paratic-Platinum-React | React build | hakan.finekra.com | hakan.finekra.com-2 |
| operation-panel | Frontend/Paratic-Operation-React | React build | hakan-operationpanel.finekra.com | — |
| api | Backend/Paratic-Platinum | ParaticPlatinum | hakan-api.finekra.com | hakan-api.finekra.com-2 |
| job | Backend/Paratic-Platinum | ParaticJob | hakan-job.finekra.com | — |
| mainerp | Backend/Paratic-Platinum | ErpIntegration.Mikro | hakan-mainerp.finekra.com | — |
| netsiserp | Backend/Paratic-Platinum | NetsisErpJob | hakan-netsiserpjob.finekra.com | — |
| logoerp | Backend/Finekra-Logo | Finekra.Erp | hakan-logoerpjob.finekra.com | — |
| operationapi | Backend/Paratic-Platinum | ParaticOperation | hakan-operationapi.finekra.com | — |
| posscheduler | Backend/Paratic-Pos-Transaction | ParaticPos | hakan-posscheduler.finekra.com | — |
| scheduler | Backend/ParaticTransactionV2 | ParaticTransactionV2 | hakan-scheduler.finekra.com | — |
| fileaccessapi | Backend/Paratic-Dbs-Transaction | FileAccessApi (FineAccessApi branch) | hakan-fileaccessapi.finekra.com | — |

**Base paths:**
- Repos: `C:\Users\Hakan\source\repos\Finekra\`
- Remote deploy: `C:\inetpub\test-ftp\<IIS Site Name>\`

## Execution Flow

### Step 0: Preflight

1. Verify SSH: `ssh -o ConnectTimeout=5 Administrator@172.16.220.54 "echo ok"`
2. If SSH fails → STOP
3. **Branch safety check** for each repo involved:
   - Show current branch name
   - If a project is being deployed as a **dependency** (not the primary task branch), it MUST be on `master` or a branch derived from recent master. If not:
     - `git.exe stash` if dirty
     - `git.exe checkout master && git.exe pull`
     - Inform user: "API switched to master for deploy (was on <old-branch>)"
   - If a project is the **primary task target** (user's task branch), use current branch as-is
   - **How to determine primary vs dependency:** The user specifies which task they're deploying (e.g., "Task-13473 deploy"). Projects with changes on that task branch are primary. All others are dependencies and should use master.
   - **Implicit dependencies — always include:** Panel and API are always mutual dependencies. Any deploy implicitly requires both to be current:
     - Panel deployed → API must also be deployed (dependency)
     - API deployed → Panel must also be deployed (dependency)
     - Any job/scheduler deployed → both Panel and API must also be deployed (dependencies)
   - User does NOT need to explicitly list dependencies — they are auto-included
4. If no task context is given, ASK which branch each project should use before proceeding

### Step 1: Build / Publish

**React projects:**
1. Read `src/util/ApiforContext.js`
2. Ensure test URLs are set (auto-fix if wrong, inform user):
   - **panel**: `apiUrl: "https://hakan-api.finekra.com/api"` (or `http://localhost:8931/api` with --alt)
   - **operation-panel**: `apiUrl: "https://hakan-api.finekra.com/api"`, `operationApiUrl: "http://172.16.220.54:8283/api"`
3. Build via Windows: `cmd.exe /c "set NODE_OPTIONS=--openssl-legacy-provider && npm run build"`
4. If build fails → STOP

**.NET projects:**
1. `dotnet publish <Project>/<Project>.csproj -c Release -o ./publish/<Project>`
2. If publish fails → STOP

### Step 2: Deploy (per project, sequentially)

For each project:

#### 2a. Backup remote appsettings (backend only)
```bash
ssh Administrator@172.16.220.54 "copy C:\inetpub\test-ftp\<SITE>\appsettings*.json C:\inetpub\test-ftp\<SITE>\appsettings-backup\"
```

#### 2b. Stop app pool
```bash
ssh Administrator@172.16.220.54 "C:\Windows\System32\inetsrv\appcmd.exe stop apppool /apppool.name:<SITE>"
```

#### 2c. Transfer files
**React:** `scp -r ./build/* Administrator@172.16.220.54:"C:\inetpub\test-ftp\<SITE>\"`
- Then restore web.config: `ssh ... "copy C:\inetpub\test-ftp\<SITE>\web.config.bak C:\inetpub\test-ftp\<SITE>\web.config"` (or backup before, restore after)

**Backend:** `scp -r ./publish/<Project>/* Administrator@172.16.220.54:"C:\inetpub\test-ftp\<SITE>\"`
- Then restore appsettings: `ssh ... "copy C:\inetpub\test-ftp\<SITE>\appsettings-backup\* C:\inetpub\test-ftp\<SITE>\"`

#### 2d. Appsettings Reconciliation (backend only)

Test environment appsettings are NOT overwritten — but they may be missing keys added in newer code. Reconcile by AI analysis:

1. **Read both files:**
   - Local (source of truth for structure): `./publish/<Project>/appsettings.json`
   - Remote (source of truth for values): `ssh ... "type C:\inetpub\test-ftp\<SITE>\appsettings.json"`
   - Also check `appsettings.Development.json` / `appsettings.Production.json` if present on either side

2. **Deep-diff analysis — determine changes:**

   | Scenario | Action |
   |----------|--------|
   | Key exists in local but NOT in remote | ADD to remote with local's default value |
   | Key exists in remote but NOT in local | KEEP in remote (may be test-specific config) |
   | Key exists in both, same value | No change |
   | Key exists in both, different value | KEEP remote value (test environment override) |
   | Structural change (object → array, type change) | ADD new structure, keep remote values where keys match |
   | New section/block added in local | ADD entire block to remote with local defaults |

3. **Merge rules:**
   - Never delete existing remote keys/sections
   - Never overwrite existing remote values (connection strings, URLs, credentials, feature flags)
   - Only ADD missing keys/sections from local
   - Preserve remote JSON formatting and key order where possible
   - Result MUST be valid JSON — validate with `python3 -c "import json; json.load(open('...'))"`

4. **Apply if changes needed:**
   ```bash
   # Write merged content to temp file, validate, then transfer
   echo '<merged_json>' | python3 -c "import sys,json; json.dump(json.load(sys.stdin),sys.stdout,indent=2)" > /tmp/appsettings-merged.json
   scp /tmp/appsettings-merged.json Administrator@172.16.220.54:"C:\inetpub\test-ftp\<SITE>\appsettings.json"
   ```

5. **Report changes made:**
   ```
   appsettings.json reconciliation for <SITE>:
   + Added: Serilog.MinimumLevel.Override.Microsoft → "Warning"
   + Added: FeatureFlags.NewPaymentFlow → false
   = Kept: ConnectionStrings.DefaultConnection (remote value preserved)
   No changes: appsettings.Development.json (already in sync)
   ```

6. **If no differences found**, skip silently — do not modify the file.

#### 2e. Start app pool
```bash
ssh Administrator@172.16.220.54 "C:\Windows\System32\inetsrv\appcmd.exe start apppool /apppool.name:<SITE>"
```

### Step 3: Verify App Pools

1. Confirm app pool state: `appcmd list apppool /apppool.name:<SITE>` → must show "Started"
2. HTTP check:
   - **React projects:** `curl -s -o /dev/null -w "%{http_code}" <URL>` → must return 200
   - **Backend API projects:** root URL returns 404 (normal — no frontend served at root). Test a known endpoint (e.g., `/swagger` → 301, or any API endpoint → 401 auth required). 401 confirms API is running.
3. If app pool won't start → STOP and report

### Step 4: Smoke Test

Run smoke tests for ALL deployed projects. Each test type applies based on project category.

#### 4a. HTTP Reachability (all web-facing projects)
```bash
curl -sk -o /dev/null -w "%{http_code}" <URL>
```
Expected: 200 (or 301/302 for redirect). 5xx or connection refused → FAIL.

#### 4b. Content Validation

| Project Type | Check | Pass Criteria |
|-------------|-------|---------------|
| panel, operation-panel | `curl -sk <URL>` body contains `<div id="root">` | React app mounted, not IIS error page |
| api, operationapi | `curl -sk <URL>/swagger` returns 200 | Swagger UI accessible |
| api, operationapi | `curl -sk <URL>/api/Health` or `<URL>/api/Account/GetLoginPageInfo` | Returns JSON (not HTML error) |
| fileaccessapi | `curl -sk <URL>/swagger` returns 200 | Swagger accessible |

#### 4c. API Connectivity (panel projects only)
Verify the panel can reach its API backend:
```bash
# Extract apiUrl from deployed ApiforContext.js and test it
curl -sk -o /dev/null -w "%{http_code}" <apiUrl>/api/Account/GetLoginPageInfo
```
Expected: 200 with JSON response. This confirms panel-to-API connectivity works.

#### 4d. Process Health (backend services: job, scheduler, erp)
Services without HTTP endpoints — verify the process is alive:
```bash
ssh Administrator@172.16.220.54 "tasklist /FI \"IMAGENAME eq dotnet.exe\" /FO CSV | findstr /I <ProjectDll>"
```
If no process found, check Windows Event Log for crash:
```bash
ssh Administrator@172.16.220.54 "powershell Get-EventLog -LogName Application -Newest 5 -Source '.NET Runtime' -ErrorAction SilentlyContinue | Select-Object TimeGenerated,Message"
```

#### 4e. Cross-Service Smoke (when both panel + api deployed)
Open the login page endpoint through the full stack:
```bash
# API returns login config
curl -sk https://hakan-api.finekra.com/api/Account/GetLoginPageInfo | python3 -c "import sys,json; d=json.load(sys.stdin); print('API OK' if 'data' in d or 'statusCode' in d else 'UNEXPECTED')"
```

#### Smoke Test Rules
- Run ALL applicable tests — do not skip on first pass
- Collect all results, then report as a table
- FAIL threshold: any 5xx, connection refused, or missing expected content
- On FAIL: report which test failed, show response body snippet (first 200 chars), suggest fix
- On PASS: include response time in report

### Step 5: Report

Summary table:
```
| Project | Deploy | App Pool | Smoke Test | Notes |
|---------|--------|----------|------------|-------|
| panel   | OK     | Running  | PASS (3/3) | 200 in 0.4s |
| api     | OK     | Running  | PASS (4/4) | swagger OK, health OK |
| job     | OK     | Running  | PASS (1/1) | process alive |
```

If any smoke test failed:
```
SMOKE TEST FAILURES:
- api: /api/Health returned 503 — "Service Unavailable" (first 200 chars of body)
  Suggestion: Check appsettings.json DB connection string
```

## Critical Rules

1. **NEVER overwrite appsettings*.json** — always backup before transfer, restore after
2. **NEVER overwrite web.config** — always backup before transfer, restore after
3. **NEVER stop entire IIS** — only the specific application pool
4. **Verify build/publish success** before any file transfer
5. **Verify app pool restart** after every deploy
6. **If build/deploy fails** → stop immediately, do not continue to next project
7. **Smoke test failures do NOT block** — report all results, let user decide
8. **Report each step** as it completes — user sees live progress
9. **Continuous improvement** — when user feedback reveals a gap in this skill, update the skill file immediately, verify, then continue

## Alternate Environments (--alt)

When primary is busy, use next available:

| Env | Panel Site | Panel Port | API Site | API Port |
|-----|-----------|------------|----------|----------|
| Primary | hakan.finekra.com | 443 (https) | hakan-api.finekra.com | 443 (https) |
| Alt-2 | hakan.finekra.com-2 | 8930 | hakan-api.finekra.com-2 | 8931 |
| Alt-3 | hakan.finekra.com-3 | 8932 | hakan-api.finekra.com-3 | 8933 |
| Alt-4 | hakan.finekra.com-4 | 8934 | hakan-api.finekra.com-4 | 8935 |

Panel ApiforContext: `http://localhost:<API_PORT>/api`
User specifies which env is available — if all busy, create next (pattern: -4 → 8934/8935, etc.)

**New environment setup checklist:**
1. Create dirs, IIS sites, app pools
2. Copy web.config (panel) and appsettings.json (API) from env-2
3. Update appsettings: FrontEndUrl, BackEndUrl, SupportImgUrl → new ports
4. Update AllowedOrigins: add both `http://localhost:<panel_port>`, `http://172.16.220.54:<panel_port>`, `http://localhost:<api_port>`, `http://172.16.220.54:<api_port>`
5. Keep common origins (8283-8288, 8383, 8484) unchanged

## Technical Notes

- SSH key auth configured — no password prompt
- React build requires Windows cmd.exe (WSL has no Node 16/nvm)
- Multiple backend projects share Paratic-Platinum solution but have separate csproj
- Primary task projects use their task branch; dependency projects auto-switch to master
- fileaccessapi uses FineAccessApi branch of Dbs-Transaction repo
