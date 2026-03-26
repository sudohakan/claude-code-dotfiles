# Finekra Deploy On-Prem — Local Build & Publish for Customer Delivery

Build/publish Finekra projects for on-premise customer delivery. Outputs to `C:\Users\Hakan\Downloads\Publish\<folder>`, then packages selected folders + extras into `publish.zip`.

## Usage

```
/finekra-deploy-onprem <projects>
```

- `<projects>`: Comma-separated short names (see Project Map)

**Examples:**
```
/finekra-deploy-onprem api, panel
/finekra-deploy-onprem api, panel, erpjob
/finekra-deploy-onprem all
```

## Project Map

| Short Name | Publish Folder | Repo | Runnable csproj | TFM | Type |
|------------|---------------|------|-----------------|-----|------|
| api | Api | Backend/Paratic-Platinum | ParaticPlatinum/ParaticPlatinum.csproj | net8.0 | dotnet |
| panel | Panel | Frontend/Paratic-Platinum-React | React build | — | react |
| b2bpanel | B2bPanel | Frontend/Paratic-B2B-React | React build | — | react |
| operationpanel | OperationPanel | Frontend/Paratic-Operation-React | React build | — | react |
| operationapi | OperationApi | Backend/Paratic-Platinum | ParaticOperation/ParaticOperation.csproj | net8.0 | dotnet |
| job | Job | Backend/Paratic-Platinum | ParaticJob/ParaticJob.csproj | net8.0 | dotnet |
| erpjob | ErpMatch | Backend/Paratic-Platinum | ErpJob/ErpJob.csproj | net8.0 | dotnet |
| mainerp | ErpMikro | Backend/Paratic-Platinum | ErpIntegration.Mikro/ErpIntegration.Mikro.csproj | net8.0 | dotnet |
| netsiserp | ErpNetsis | Backend/Paratic-Platinum | ErpIntegration.Netsis.NetCollec/ErpIntegration.Netsis.NetCollec.csproj | net8.0 | dotnet |
| logoerp | ErpLogo | Backend/Finekra-Logo | LogoApi/LogoApi.csproj | net8.0 | dotnet |
| scheduler | Scheduler | Backend/ParaticTransactionV2 | ParaticTransactionV2/ParaticTransactionV2.csproj | net8.0 | dotnet |
| posscheduler | PosScheduler | Backend/Paratic-Pos-Transaction | ParaticPos/ParaticPos.csproj | net5.0 | dotnet |
| tosscheduler | TosScheduler | Backend/Paratic-Tos-Transaction | Paratic-Tos-Transaction/Paratic-Tos-Transaction.csproj | net5.0 | dotnet |
| dbsscheduler | DbsScheduler | Backend/Paratic-Dbs-Transaction | ParaticPos/ParaticDbs.csproj | net8.0 | dotnet |
| fileaccessapi | FileAccessApi | Backend/Paratic-Dbs-Transaction (FineAccessApi branch) | ParaticPos/ParaticDbs.csproj | net8.0 | dotnet |
| b2bapi | B2bApi | Backend/Paratic-Platinum | ParaticB2B/ParaticB2B.csproj | net8.0 | dotnet |

**Output base:** `C:\Users\Hakan\Downloads\Publish\`

## Execution Flow

### Step 0: Preflight

1. Show current branch for each involved repo
2. Confirm correct branch is checked out (user's responsibility — skill does NOT switch branches)

### Step 1: Pre-Build Checks

**For React projects:**
1. Read `src/util/ApiforContext.js` — show current URLs to user, confirm they're correct for the target customer
2. Fix bank logo casing: rename any `.PNG` files to lowercase `.png` in:
   - `src/assets/images/BankCarts/`
   - `src/assets/images/BankLogos/`
   - Any subdirectories
   ```bash
   find src/assets/images/BankCarts -name "*.PNG" -exec sh -c 'mv "$1" "${1%.PNG}.png"' _ {} \;
   ```
3. Install deps if needed: `cmd.exe /c "npm install --legacy-peer-deps"`

### Step 2: Build / Publish

**For React projects:**
```bash
cmd.exe /c "set NODE_OPTIONS=--openssl-legacy-provider && npm run build"
```
Then clear target folder and copy build output:
```bash
rm -rf "C:\Users\Hakan\Downloads\Publish\<folder>\*"
cp -r build/* "C:\Users\Hakan\Downloads\Publish\<folder>\"
```

**For .NET projects:**
First clear the target folder, then publish directly into it:
```bash
rm -rf "C:\Users\Hakan\Downloads\Publish\<folder>\*"
cmd.exe /c "dotnet publish <csproj> -c Release -r win-x64 --self-contained -o C:\Users\Hakan\Downloads\Publish\<folder>"
```
- **MUST use `-r win-x64 --self-contained`** — on-prem customers don't have .NET runtime
- Target framework is read from csproj automatically


### Step 2.5: Self-Contained Verification (MANDATORY for .NET)

After each .NET publish, verify self-contained output:
```bash
ls "<output-folder>/aspnetcorev2_inprocess.dll"
ls "<output-folder>/hostfxr.dll"
ls "<output-folder>/coreclr.dll"
```
If ANY file is missing → STOP. Re-run with `--self-contained true`. Never deliver a non-self-contained build.

### Step 3: Post-Build Cleanup

**For .NET projects:**
1. Delete `appsettings*.json` from output
2. Delete `web.config` from output
3. These files are already configured on the customer's server — overwriting would break their environment

**For React projects:**
- Do NOT delete `web.config` — customer's server has its own, React build may not include one

**ApiforContext revert:**
- After React build, revert `ApiforContext.js` to its original state — do NOT commit build-time URL changes

### Step 4: Extras

If there are additional files to include (migration scripts, HTML templates, images, etc.):
1. Create `C:\Users\Hakan\Downloads\Publish\Extras\` folder (clear if exists)
2. Copy extra files into it (migration SQL, PDF templates, etc.)
3. These are files referenced in the PR or task that need manual handling on the customer server

### Step 5: Package (publish.zip)

1. Delete existing `C:\Users\Hakan\Downloads\Publish\publish.zip` if present
2. Create `publish.zip` containing ONLY:
   - The project folders that were built/published in this run (e.g., `Api/`, `Panel/`, `ErpMatch/`)
   - `Extras/` folder if it has content
   - Do NOT include other folders in `Publish\` that weren't part of this run
3. Use 7-Zip with maximum compression (`-mx=9`):
   ```bash
   "/mnt/c/Program Files/7-Zip/7z.exe" a -tzip -mx=9 "C:\Users\Hakan\Downloads\Publish\publish.zip" "C:\Users\Hakan\Downloads\Publish\Api" "C:\Users\Hakan\Downloads\Publish\Panel" "C:\Users\Hakan\Downloads\Publish\Extras"
   ```

### Step 6: Verify & Report

1. Confirm `publish.zip` exists and show size
2. Report per-project summary:

```
✓ Api — published (win-x64, self-contained, 312 files, appsettings/web.config removed)
✓ Panel — built (ApiforContext: finance-api.ozdilek.biz.tr, 35 files)
✓ ErpMatch — published (win-x64, self-contained, 280 files)
✓ Extras — migration.sql
✓ publish.zip — 285 MB ready for delivery
```

## Critical Rules

1. **Always `-r win-x64 --self-contained`** for .NET projects
2. **Always remove appsettings*.json and web.config** from .NET publish output
3. **Always check ApiforContext.js** before React build — wrong URL = broken customer panel
4. **Fix PNG casing** before React build — customer servers may be case-sensitive
5. **Clear target folder before writing** — no leftover files from previous builds
6. **Do NOT commit ApiforContext changes** — build-time only, revert after build
7. **publish.zip contains only this run's folders** — not everything in Publish\
8. **Delete old publish.zip before creating new one**
9. **Continuous improvement** — update this skill when user feedback reveals gaps

## Notes

- Multiple projects may share the same repo (e.g., Api, Job, ErpJob all from Paratic-Platinum)
- When publishing multiple projects from same repo, publish sequentially (shared build artifacts)
- net5.0 projects (PosScheduler, TosScheduler): use `-r win-x64 --self-contained` with their framework
- React builds require `cmd.exe` (WSL lacks Node 16/nvm)
- `all` shorthand publishes: api, panel, job, erpjob, mainerp, scheduler (most common set)
