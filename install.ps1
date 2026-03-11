# ============================================================
# Claude Code Portable Installer - Hakan's Configuration
# ============================================================
# Usage: PowerShell -ExecutionPolicy Bypass -File install.ps1
# Parameters:
#   -SkipPlugins    : Skip plugin installation
#   -SkipHakanMCP   : Skip HakanMCP installation
#   -Force          : Run without confirmation prompts
# ============================================================

param(
    [switch]$SkipPlugins,
    [switch]$SkipHakanMCP,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ClaudeDir = "$env:USERPROFILE\.claude"
$BackupDir = "$env:USERPROFILE\.claude-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

function Write-Step($step, $total, $msg) {
    Write-Host ""
    Write-Host "[$step/$total] $msg" -ForegroundColor Yellow
}

function Install-IfMissing($name, $testCmd, $installCmd, $manualMsg) {
    if (Get-Command $testCmd -ErrorAction SilentlyContinue) {
        $ver = & $testCmd --version 2>$null
        Write-Host "  [OK] $name : $ver" -ForegroundColor Green
        return $true
    }
    Write-Host "  [--] $name not found, installing..." -ForegroundColor Cyan
    try {
        Invoke-Expression $installCmd
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        if (Get-Command $testCmd -ErrorAction SilentlyContinue) {
            $ver = & $testCmd --version 2>$null
            Write-Host "  [OK] $name installed: $ver" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  [!!] $name installed but not found in PATH. Restart your terminal." -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "  [!!] $name automatic installation failed." -ForegroundColor Red
        Write-Host "       $manualMsg" -ForegroundColor DarkGray
        return $false
    }
}

# ========================================
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "   Claude Code Portable Installer" -ForegroundColor Cyan
Write-Host "   Hakan's Full Configuration" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

$totalSteps = 10

# -- STEP 1: Check package manager --
Write-Step 1 $totalSteps "Checking package manager..."
$hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)
if ($hasWinget) {
    Write-Host "  [OK] winget available" -ForegroundColor Green
} else {
    Write-Host "  [!!] winget not found. Software may need to be installed manually." -ForegroundColor Yellow
    Write-Host "       Install 'App Installer' from the Microsoft Store." -ForegroundColor DarkGray
}

# -- STEP 2: Install dependencies --
Write-Step 2 $totalSteps "Checking and installing dependencies..."

# --- Git ---
$gitOk = Install-IfMissing "Git" "git" `
    "winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements" `
    "Manual: https://git-scm.com/downloads"

# --- Node.js ---
$nodeOk = Install-IfMissing "Node.js" "node" `
    "winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements" `
    "Manual: https://nodejs.org/en/download/"

if (-not $nodeOk) {
    Write-Host ""
    Write-Host "  CRITICAL: Cannot continue without Node.js." -ForegroundColor Red
    Write-Host "  Install Node.js, restart your terminal, and run the script again." -ForegroundColor Red
    exit 1
}

# Check Node.js version (HakanMCP requires >= 20)
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVer = (node --version 2>$null) -replace 'v',''
    $nodeMajor = [int]($nodeVer -split '\.')[0]
    if ($nodeMajor -lt 20) {
        Write-Host "  [!!] Node.js $nodeVer detected, but HakanMCP requires >= 20." -ForegroundColor Red
        Write-Host "       Update Node.js: winget install -e --id OpenJS.NodeJS.LTS" -ForegroundColor DarkGray
    }
}

# --- npm check (comes with Node) ---
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "  [OK] npm : $(npm --version)" -ForegroundColor Green
} else {
    Write-Host "  [!!] npm not found. Check your Node.js installation." -ForegroundColor Yellow
}

# --- jq ---
Install-IfMissing "jq" "jq" `
    "winget install -e --id jqlang.jq --accept-source-agreements --accept-package-agreements" `
    "Manual: winget install jqlang.jq" | Out-Null

# --- Python (required for Dippy hook) ---
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pyVer = python --version 2>&1
    Write-Host "  [OK] Python : $pyVer" -ForegroundColor Green
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pyVer = python3 --version 2>&1
    Write-Host "  [OK] Python : $pyVer" -ForegroundColor Green
} else {
    Write-Host "  [!!] Python not found. Required for Dippy hook." -ForegroundColor Yellow
    Write-Host "       Install: winget install -e --id Python.Python.3.12" -ForegroundColor DarkGray
}

# -- STEP 3: Install Claude Code CLI --
Write-Step 3 $totalSteps "Installing Claude Code CLI..."

if (Get-Command claude -ErrorAction SilentlyContinue) {
    $claudeVer = claude --version 2>$null
    Write-Host "  [OK] Claude CLI already installed: $claudeVer" -ForegroundColor Green
} else {
    Write-Host "  Installing Claude CLI (npm global)..." -ForegroundColor Cyan
    try {
        npm install -g @anthropic-ai/claude-code 2>&1 | Out-Null
        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        if (Get-Command claude -ErrorAction SilentlyContinue) {
            $claudeVer = claude --version 2>$null
            Write-Host "  [OK] Claude CLI installed: $claudeVer" -ForegroundColor Green
        } else {
            Write-Host "  [OK] Claude CLI installed but not yet visible in PATH." -ForegroundColor Yellow
            Write-Host "       The 'claude' command will work after reopening the terminal." -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "  [!!] Claude CLI installation failed: $_" -ForegroundColor Red
        Write-Host "       Manual: npm install -g @anthropic-ai/claude-code" -ForegroundColor DarkGray
    }
}

# -- STEP 4: Back up existing configuration --
Write-Step 4 $totalSteps "Backing up existing configuration..."

if (Test-Path $ClaudeDir) {
    if (-not $Force) {
        $answer = Read-Host "  Existing $ClaudeDir found. Create backup? (Y/N)"
        if ($answer -ne "N") {
            Copy-Item -Path $ClaudeDir -Destination $BackupDir -Recurse
            Write-Host "  Backup: $BackupDir" -ForegroundColor Green
        }
    } else {
        Copy-Item -Path $ClaudeDir -Destination $BackupDir -Recurse
        Write-Host "  Backup: $BackupDir" -ForegroundColor Green
    }
} else {
    Write-Host "  Fresh install, no backup needed." -ForegroundColor Green
}

# -- STEP 5: Directory structure --
Write-Step 5 $totalSteps "Creating directory structure..."

$dirs = @(
    "$ClaudeDir\hooks", "$ClaudeDir\docs", "$ClaudeDir\commands\gsd",
    "$ClaudeDir\agents", "$ClaudeDir\get-shit-done", "$ClaudeDir\skills",
    "$ClaudeDir\plugins", "$ClaudeDir\projects", "$ClaudeDir\profiles",
    "$ClaudeDir\cache"
)
foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Host "  Directories created." -ForegroundColor Green

# -- STEP 6: Copy configuration files --
Write-Step 6 $totalSteps "Copying configuration files..."

$configDir = "$ScriptDir\config"

# Core files
foreach ($file in @("CLAUDE.md", "settings.json", "settings.local.json", "package.json", "gsd-file-manifest.json")) {
    $src = "$configDir\$file"
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination "$ClaudeDir\$file" -Force
        Write-Host "  + $file" -ForegroundColor DarkGray
    }
}

# Hooks (js files only - Dippy is cloned separately)
Get-ChildItem "$configDir\hooks\*" -File | Copy-Item -Destination "$ClaudeDir\hooks\" -Force
# Hook shared libraries
if (Test-Path "$configDir\hooks\lib") {
    if (-not (Test-Path "$ClaudeDir\hooks\lib")) {
        New-Item -ItemType Directory -Path "$ClaudeDir\hooks\lib" -Force | Out-Null
    }
    Copy-Item -Path "$configDir\hooks\lib\*" -Destination "$ClaudeDir\hooks\lib\" -Recurse -Force
}
Write-Host "  + hooks/ (js files + lib)" -ForegroundColor DarkGray

# Docs
Copy-Item -Path "$configDir\docs\*" -Destination "$ClaudeDir\docs\" -Force
Write-Host "  + docs/" -ForegroundColor DarkGray

# Commands (all *.md files + gsd/ subdirectory)
Get-ChildItem "$configDir\commands\*.md" | Copy-Item -Destination "$ClaudeDir\commands\" -Force
Copy-Item -Path "$configDir\commands\gsd\*" -Destination "$ClaudeDir\commands\gsd\" -Force
Write-Host "  + commands/ (all commands + GSD)" -ForegroundColor DarkGray

# Agents
Copy-Item -Path "$configDir\agents\*" -Destination "$ClaudeDir\agents\" -Force
Write-Host "  + agents/" -ForegroundColor DarkGray

# GSD Core
Copy-Item -Path "$configDir\get-shit-done\*" -Destination "$ClaudeDir\get-shit-done\" -Recurse -Force
Write-Host "  + get-shit-done/" -ForegroundColor DarkGray

# Skills
Copy-Item -Path "$configDir\skills\*" -Destination "$ClaudeDir\skills\" -Recurse -Force
Write-Host "  + skills/ (3 skill sets)" -ForegroundColor DarkGray

# Plugin configs
Copy-Item -Path "$configDir\plugins\known_marketplaces.json" -Destination "$ClaudeDir\plugins\" -Force
Copy-Item -Path "$configDir\plugins\blocklist.json" -Destination "$ClaudeDir\plugins\" -Force
Write-Host "  + plugins/ (marketplace config)" -ForegroundColor DarkGray

# Project registry (preserve existing)
$registrySrc = "$configDir\project-registry.json"
$registryDst = "$ClaudeDir\project-registry.json"
if ((Test-Path $registrySrc) -and -not (Test-Path $registryDst)) {
    Copy-Item -Path $registrySrc -Destination $registryDst -Force
    Write-Host "  + project-registry.json" -ForegroundColor DarkGray
} elseif (Test-Path $registryDst) {
    Write-Host "  ~ project-registry.json (existing preserved)" -ForegroundColor DarkGray
}

Write-Host "  All files copied." -ForegroundColor Green

# -- STEP 7: Fix paths --
Write-Step 7 $totalSteps "Fixing file paths..."

$settingsPath = "$ClaudeDir\settings.json"
$settingsContent = Get-Content $settingsPath -Raw
$oldUser = "C:/Users/Hakan"
$newUser = "C:/Users/$env:USERNAME"
$oldUserWin = "C:\\Users\\Hakan"
$newUserWin = "C:\\Users\\$env:USERNAME"

if ($env:USERNAME -ne "Hakan") {
    # settings.json
    $settingsContent = $settingsContent -replace [regex]::Escape($oldUser), $newUser
    $settingsContent = $settingsContent -replace [regex]::Escape($oldUserWin), $newUserWin
    Set-Content -Path $settingsPath -Value $settingsContent -NoNewline

    # Paths inside CLAUDE.md
    $claudeMdPath = "$ClaudeDir\CLAUDE.md"
    if (Test-Path $claudeMdPath) {
        $claudeMd = Get-Content $claudeMdPath -Raw
        $claudeMd = $claudeMd -replace [regex]::Escape("~/.claude"), "~/.claude"
        Set-Content -Path $claudeMdPath -Value $claudeMd -NoNewline
    }

    Write-Host "  Paths updated: Hakan -> $env:USERNAME" -ForegroundColor Green
} else {
    Write-Host "  Same username, no changes needed." -ForegroundColor Green
}

# .claude.json (home)
$homeConfig = "$env:USERPROFILE\.claude.json"
$srcHomeConfig = "$ScriptDir\home-config\.claude.json"
if (Test-Path $homeConfig) {
    Write-Host "  Existing .claude.json preserved." -ForegroundColor Yellow
} else {
    $homeConfigContent = Get-Content $srcHomeConfig -Raw
    if ($env:USERNAME -ne "Hakan") {
        $homeConfigContent = $homeConfigContent -replace [regex]::Escape($oldUserWin), $newUserWin
    }
    Set-Content -Path $homeConfig -Value $homeConfigContent -NoNewline
    Write-Host "  .claude.json created." -ForegroundColor Green
}

# -- STEP 8: Memory files --
Write-Step 8 $totalSteps "Transferring memory files..."

$newProjectKey = "C--Users-$env:USERNAME"
$memSrc = "$configDir\projects\C--Users-Hakan\.memory"
$memDst = "$ClaudeDir\projects\$newProjectKey\.memory"

if (-not (Test-Path $memDst)) {
    New-Item -ItemType Directory -Path $memDst -Force | Out-Null
}
Copy-Item -Path "$memSrc\*" -Destination "$memDst\" -Force

# Update username in memory files
if ($env:USERNAME -ne "Hakan") {
    Get-ChildItem "$memDst\*.md" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        $content = $content -replace "C:\\\\Users\\\\Hakan", "C:\\Users\\$env:USERNAME"
        $content = $content -replace "C:/Users/Hakan", "C:/Users/$env:USERNAME"
        Set-Content -Path $_.FullName -Value $content -NoNewline
    }
}
Write-Host "  Memory copied ($newProjectKey)." -ForegroundColor Green

# -- STEP 9: HakanMCP --
Write-Step 9 $totalSteps "HakanMCP setup..."

if ($SkipHakanMCP) {
    Write-Host "  HakanMCP skipped (-SkipHakanMCP)." -ForegroundColor Yellow
} else {
    # -- Dippy (git clone if not present) --
    $dippyDir = "$ClaudeDir\hooks\dippy"
    if (Test-Path $dippyDir) {
        Write-Host "  [OK] Dippy already exists: $dippyDir" -ForegroundColor Green
    } else {
        if ($gitOk -or (Get-Command git -ErrorAction SilentlyContinue)) {
            Write-Host "  Cloning Dippy..." -ForegroundColor Cyan
            try {
                git clone https://github.com/ldayton/Dippy "$dippyDir" 2>&1 | Out-Null
                Write-Host "  [OK] Dippy installed: $dippyDir" -ForegroundColor Green
            } catch {
                Write-Host "  [!!] Dippy clone failed: $_" -ForegroundColor Red
                Write-Host "       Manual: git clone https://github.com/ldayton/Dippy $dippyDir" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "  [!!] Git not available, cannot clone Dippy." -ForegroundColor Yellow
        }
    }

    # -- HakanMCP --
    $mcpDir = "C:\dev\HakanMCP"
    if (Test-Path $mcpDir) {
        Write-Host "  [OK] HakanMCP exists: $mcpDir - checking for updates..." -ForegroundColor Cyan
        try {
            Push-Location $mcpDir
            $localHash = git rev-parse HEAD 2>$null
            git fetch origin main --quiet 2>$null
            $remoteHash = git rev-parse origin/main 2>$null
            if ($localHash -ne $remoteHash -and $remoteHash) {
                Write-Host "  Updates available. Pulling latest..." -ForegroundColor Cyan
                git pull origin main --quiet 2>$null
                Write-Host "  Running npm install..." -ForegroundColor Cyan
                npm install 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  [!!] npm install failed during update." -ForegroundColor Red
                }
                Write-Host "  Running npm run build..." -ForegroundColor Cyan
                npm run build 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  [!!] npm run build failed during update." -ForegroundColor Red
                } else {
                    Write-Host "  [OK] HakanMCP updated." -ForegroundColor Green
                }
            } else {
                Write-Host "  [OK] HakanMCP is up to date." -ForegroundColor Green
            }
            # Ensure .env exists
            if ((Test-Path "$mcpDir\.env.example") -and -not (Test-Path "$mcpDir\.env")) {
                Copy-Item "$mcpDir\.env.example" "$mcpDir\.env"
                Write-Host "  [OK] .env created from .env.example - configure API keys in $mcpDir\.env" -ForegroundColor Yellow
            }
            Pop-Location
        } catch {
            Pop-Location -ErrorAction SilentlyContinue
            Write-Host "  [!!] HakanMCP update check failed: $_" -ForegroundColor Yellow
            Write-Host "       Existing installation preserved." -ForegroundColor DarkGray
        }
    } else {
        if ($gitOk -or (Get-Command git -ErrorAction SilentlyContinue)) {
            Write-Host "  Cloning HakanMCP..." -ForegroundColor Cyan
            try {
                if (-not (Test-Path "C:\dev")) {
                    New-Item -ItemType Directory -Path "C:\dev" -Force | Out-Null
                }
                git clone https://github.com/sudohakan/HakanMCP.git $mcpDir 2>&1 | Out-Null
                Push-Location $mcpDir
                Write-Host "  Running npm install..." -ForegroundColor Cyan
                npm install 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Pop-Location
                    throw "npm install failed"
                }
                Write-Host "  Running npm run build..." -ForegroundColor Cyan
                npm run build 2>&1 | Out-Null
                if ($LASTEXITCODE -ne 0) {
                    Pop-Location
                    throw "npm run build failed"
                }
                Pop-Location
                Write-Host "  [OK] HakanMCP installed: $mcpDir" -ForegroundColor Green
                # Setup .env from example
                if ((Test-Path "$mcpDir\.env.example") -and -not (Test-Path "$mcpDir\.env")) {
                    Copy-Item "$mcpDir\.env.example" "$mcpDir\.env"
                    Write-Host "  [OK] .env created from .env.example - configure API keys in $mcpDir\.env" -ForegroundColor Yellow
                }
            } catch {
                Pop-Location -ErrorAction SilentlyContinue
                Write-Host "  [!!] HakanMCP installation failed: $_" -ForegroundColor Red
                Write-Host "       Manual: git clone https://github.com/sudohakan/HakanMCP.git C:\dev\HakanMCP" -ForegroundColor DarkGray
            }
        } else {
            Write-Host "  [!!] Git not available, cannot clone HakanMCP." -ForegroundColor Yellow
        }
    }
}

# -- STEP 10: Plugins --
Write-Step 10 $totalSteps "Installing plugins..."

if ($SkipPlugins) {
    Write-Host "  Plugin installation skipped (-SkipPlugins)." -ForegroundColor Yellow
} else {
    $claudeAvailable = Get-Command claude -ErrorAction SilentlyContinue
    if ($claudeAvailable) {
        Write-Host "  Installing official plugins..." -ForegroundColor Cyan

        $officialPlugins = @(
            "superpowers", "code-review", "context7", "feature-dev",
            "ralph-loop", "playwright", "typescript-lsp"
        )
        foreach ($plugin in $officialPlugins) {
            try {
                claude plugins install $plugin 2>&1 | Out-Null
                Write-Host "  [OK] $plugin" -ForegroundColor DarkGreen
            } catch {
                Write-Host "  [--] $plugin (will auto-install on first launch)" -ForegroundColor DarkGray
            }
        }

        # Trail of Bits marketplace
        Write-Host "  Adding Trail of Bits marketplace..." -ForegroundColor Cyan
        try {
            claude plugins add-marketplace trailofbits https://github.com/trailofbits/skills 2>&1 | Out-Null
            $tobPlugins = @(
                "static-analysis@trailofbits", "differential-review@trailofbits",
                "insecure-defaults@trailofbits", "sharp-edges@trailofbits",
                "supply-chain-risk-auditor@trailofbits", "audit-context-building@trailofbits",
                "property-based-testing@trailofbits", "variant-analysis@trailofbits",
                "spec-to-code-compliance@trailofbits", "git-cleanup@trailofbits",
                "workflow-skill-design@trailofbits"
            )
            foreach ($plugin in $tobPlugins) {
                try {
                    claude plugins install $plugin 2>&1 | Out-Null
                    Write-Host "  [OK] $plugin" -ForegroundColor DarkGreen
                } catch {
                    Write-Host "  [--] $plugin (can be installed manually later)" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "  [--] Trail of Bits marketplace can be added later" -ForegroundColor DarkGray
        }

        # Anthropic Agent Skills marketplace
        Write-Host "  Adding Anthropic Agent Skills marketplace..." -ForegroundColor Cyan
        try {
            claude plugins add-marketplace anthropic-agent-skills https://github.com/anthropics/skills 2>&1 | Out-Null
            $anthropicPlugins = @(
                "document-skills@anthropic-agent-skills",
                "example-skills@anthropic-agent-skills",
                "claude-api@anthropic-agent-skills"
            )
            foreach ($plugin in $anthropicPlugins) {
                try {
                    claude plugins install $plugin 2>&1 | Out-Null
                    Write-Host "  [OK] $plugin" -ForegroundColor DarkGreen
                } catch {
                    Write-Host "  [--] $plugin (can be installed manually later)" -ForegroundColor DarkGray
                }
            }
        } catch {
            Write-Host "  [--] Anthropic Agent Skills marketplace can be added later" -ForegroundColor DarkGray
        }

        Write-Host "  Plugin installation complete." -ForegroundColor Green
    } else {
        Write-Host "  Claude CLI not yet in PATH. After reopening the terminal:" -ForegroundColor Yellow
        Write-Host "  claude plugins install superpowers" -ForegroundColor DarkGray
        Write-Host "  (other plugins will auto-install on first launch)" -ForegroundColor DarkGray
    }
}

# -- Dotfiles Meta (version tracking for auto-update) --
$dotfilesMeta = @{
    version = (Get-Content "$ScriptDir\VERSION" -Raw).Trim()
    repo_path = $ScriptDir
    installed_at = (Get-Date -Format 'yyyy-MM-dd')
} | ConvertTo-Json
Set-Content -Path "$ClaudeDir\dotfiles-meta.json" -Value $dotfilesMeta -NoNewline
Write-Host "  [OK] dotfiles-meta.json created (v$((Get-Content "$ScriptDir\VERSION" -Raw).Trim()))" -ForegroundColor Green

# -- SUMMARY --
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Green
Write-Host "   INSTALLATION COMPLETE" -ForegroundColor Green
Write-Host "  ============================================" -ForegroundColor Green
Write-Host ""

# Status table
Write-Host "  Status Summary:" -ForegroundColor Cyan
$checks = @(
    @{ Name = "Node.js";     Ok = (Get-Command node -ErrorAction SilentlyContinue) },
    @{ Name = "Git";         Ok = (Get-Command git -ErrorAction SilentlyContinue) },
    @{ Name = "jq";          Ok = (Get-Command jq -ErrorAction SilentlyContinue) },
    @{ Name = "Python";      Ok = (Get-Command python -ErrorAction SilentlyContinue) -or (Get-Command python3 -ErrorAction SilentlyContinue) },
    @{ Name = "Claude CLI";  Ok = (Get-Command claude -ErrorAction SilentlyContinue) },
    @{ Name = "HakanMCP";    Ok = (Test-Path "C:\dev\HakanMCP\dist\src\index.js") },
    @{ Name = "Config";      Ok = (Test-Path "$ClaudeDir\settings.json") },
    @{ Name = "Hooks";       Ok = (Test-Path "$ClaudeDir\hooks\pretooluse-safety.js") },
    @{ Name = "GSD";         Ok = (Test-Path "$ClaudeDir\get-shit-done\VERSION") },
    @{ Name = "Memory";      Ok = (Test-Path "$ClaudeDir\projects\$newProjectKey\.memory\MEMORY.md") }
)

foreach ($check in $checks) {
    if ($check.Ok) {
        Write-Host "    [OK] $($check.Name)" -ForegroundColor Green
    } else {
        Write-Host "    [--] $($check.Name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "  Next steps:" -ForegroundColor Cyan
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
    Write-Host "    1. Close and reopen terminal (to refresh PATH)" -ForegroundColor White
}
Write-Host "    -> claude login   (log in with your account)" -ForegroundColor White
Write-Host "    -> claude         (run and test)" -ForegroundColor White
Write-Host ""
Write-Host "  Detailed guide: $ScriptDir\SETUP.md" -ForegroundColor DarkGray
Write-Host ""
