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

#### 2d. Start app pool
```bash
ssh Administrator@172.16.220.54 "C:\Windows\System32\inetsrv\appcmd.exe start apppool /apppool.name:<SITE>"
```

### Step 3: Verify

1. Confirm app pool state: `appcmd list apppool /apppool.name:<SITE>` → must show "Started"
2. For web projects: `curl -s -o /dev/null -w "%{http_code}" <URL>` → must return 200
3. If app pool won't start → STOP and report

### Step 4: Report

One-line summary per project:
```
✓ panel (hakan.finekra.com) — deployed, app pool running, HTTP 200
✓ api (hakan-api.finekra.com) — deployed, app pool running
```

## Critical Rules

1. **NEVER overwrite appsettings*.json** — always backup before transfer, restore after
2. **NEVER overwrite web.config** — always backup before transfer, restore after
3. **NEVER stop entire IIS** — only the specific application pool
4. **Verify build/publish success** before any file transfer
5. **Verify app pool restart** after every deploy
6. **If any step fails** → stop immediately, do not continue to next project
7. **Report each step** as it completes — user sees live progress
8. **Continuous improvement** — when user feedback reveals a gap in this skill (missing steps, wrong flow, failed edge case, etc.), update the skill file immediately, verify the fix, then continue the task

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
