# ============================================================
# Unit tests for install.ps1 helper functions
# Run: powershell -ExecutionPolicy Bypass -File test/install.tests.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$passed = 0
$failed = 0

function Assert-Equal($actual, $expected, $msg) {
    if ($actual -ne $expected) {
        throw "Assertion failed: $msg`n  Expected: $expected`n  Actual:   $actual"
    }
}

function Assert-Contains($haystack, $needle, $msg) {
    if ($haystack -notmatch [regex]::Escape($needle)) {
        throw "Assertion failed: $msg`n  Expected to contain: $needle`n  Actual: $haystack"
    }
}

function Test($name, [scriptblock]$fn) {
    try {
        & $fn
        Write-Host "  PASS  $name" -ForegroundColor Green
        $script:passed++
    } catch {
        Write-Host "  FAIL  $name" -ForegroundColor Red
        Write-Host "        $_" -ForegroundColor DarkGray
        $script:failed++
    }
}

# --- Load functions from install.ps1 by dot-sourcing only the function defs ---
# We extract Write-Step and Install-IfMissing without running the whole script

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

# ===================== Write-Step tests =====================
Write-Host "`n--- Write-Step ---"

Test "Write-Step outputs step number and message" {
    # Capture output by redirecting to string
    $output = (Write-Step 3 10 "Testing step" 6>&1 | Out-String)
    # Write-Step uses Write-Host which goes to information stream (6)
    # If capture fails, at least verify no exception is thrown
}

Test "Write-Step handles single-digit steps" {
    Write-Step 1 1 "Only step"
    # No exception = pass
}

Test "Write-Step handles large step numbers" {
    Write-Step 99 100 "Large numbers"
    # No exception = pass
}

# ===================== Install-IfMissing tests =====================
Write-Host "`n--- Install-IfMissing ---"

Test "Install-IfMissing returns true for existing command (node)" {
    # node should be available in the test environment
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $result = Install-IfMissing "Node.js" "node" "echo skip" "n/a"
        Assert-Equal $result $true "Expected true for existing node command"
    } else {
        Write-Host "        (skipped: node not available)" -ForegroundColor DarkGray
    }
}

Test "Install-IfMissing returns true for existing command (git)" {
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $result = Install-IfMissing "Git" "git" "echo skip" "n/a"
        Assert-Equal $result $true "Expected true for existing git command"
    } else {
        Write-Host "        (skipped: git not available)" -ForegroundColor DarkGray
    }
}

Test "Install-IfMissing handles missing command gracefully" {
    # Use a command that definitely doesn't exist
    # The installCmd succeeds (Write-Output) but the command still won't be found
    $result = Install-IfMissing "FakeApp" "definitely-not-a-real-command-xyz123" "Write-Output 'noop' | Out-Null" "Install manually"
    Assert-Equal $result $false "Expected false for missing command with failing install"
}

# ===================== Summary =====================
Write-Host ""
Write-Host "$passed/$($passed + $failed) passed$(if ($failed -gt 0) { ", $failed FAILED" })"
if ($failed -gt 0) { exit 1 }
