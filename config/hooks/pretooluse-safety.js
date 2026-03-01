#!/usr/bin/env node

/**
 * PreToolUse Safety Hook v1.1.0
 * Detects dangerous commands and warns before execution.
 * If the user has approved, does not ask again in the same session.
 * Runs as a Claude Code hook — reads JSON from stdin.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const DANGEROUS_PATTERNS = [
  // Git destructive
  { pattern: /git\s+push\s+.*--force/i, reason: "Force push may cause data loss" },
  { pattern: /git\s+reset\s+--hard/i, reason: "Hard reset deletes uncommitted changes" },
  { pattern: /git\s+clean\s+-[a-z]*f/i, reason: "git clean permanently deletes untracked files" },
  { pattern: /git\s+branch\s+-D/i, reason: "Uppercase -D deletes branch even if unmerged" },
  { pattern: /git\s+checkout\s+--\s+\./i, reason: "Discards all unstaged changes" },

  // File system destructive
  { pattern: /rm\s+-[a-z]*r[a-z]*f|rm\s+-[a-z]*f[a-z]*r/i, reason: "Recursive force delete — irreversible" },
  { pattern: /rmdir\s+\/s/i, reason: "Windows recursive directory delete" },

  // Database destructive
  { pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)/i, reason: "Database structure permanently deleted" },
  { pattern: /TRUNCATE\s+TABLE/i, reason: "Table data permanently deleted" },
  { pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/im, reason: "DELETE without WHERE clause — deletes all records" },

  // Deploy/infra
  { pattern: /terraform\s+destroy/i, reason: "Infrastructure resources will be deleted" },
  { pattern: /kubectl\s+delete\s+namespace/i, reason: "Kubernetes namespace will be deleted" },
];

// --- Session-based allowlist ---
// Approved commands are stored in a temp file, valid for the entire session.
// Claude Code gets a new PID each session — old allowlists are cleaned up.
const ALLOWLIST_DIR = path.join(os.tmpdir(), "claude-safety-allowlist");
const SESSION_ID = process.env.CLAUDE_SESSION_ID || process.ppid?.toString() || "default";
const ALLOWLIST_FILE = path.join(ALLOWLIST_DIR, `session-${SESSION_ID}.json`);
const ALLOWLIST_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

function loadAllowlist() {
  try {
    if (!fs.existsSync(ALLOWLIST_FILE)) return [];
    const stat = fs.statSync(ALLOWLIST_FILE);
    // Clean up stale allowlist files
    if (Date.now() - stat.mtimeMs > ALLOWLIST_MAX_AGE_MS) {
      fs.unlinkSync(ALLOWLIST_FILE);
      return [];
    }
    return JSON.parse(fs.readFileSync(ALLOWLIST_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveToAllowlist(command) {
  try {
    fs.mkdirSync(ALLOWLIST_DIR, { recursive: true });
    const list = loadAllowlist();
    // Normalize: trim + collapse whitespace
    const normalized = command.trim().replace(/\s+/g, " ");
    if (!list.includes(normalized)) {
      list.push(normalized);
    }
    fs.writeFileSync(ALLOWLIST_FILE, JSON.stringify(list, null, 2));
  } catch {
    // If allowlist cannot be written, fail silently — security is not blocked
  }
}

function isAllowed(command) {
  const list = loadAllowlist();
  const normalized = command.trim().replace(/\s+/g, " ");
  return list.includes(normalized);
}

function cleanupOldAllowlists() {
  try {
    if (!fs.existsSync(ALLOWLIST_DIR)) return;
    for (const f of fs.readdirSync(ALLOWLIST_DIR)) {
      const fp = path.join(ALLOWLIST_DIR, f);
      const stat = fs.statSync(fp);
      if (Date.now() - stat.mtimeMs > ALLOWLIST_MAX_AGE_MS) {
        fs.unlinkSync(fp);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}

// Self-test: node pretooluse-safety.js --test
if (process.argv.includes("--test")) {
  const TEST_COMMANDS = [
    { cmd: "git push --force origin main", shouldBlock: true },
    { cmd: "git reset --hard HEAD~3", shouldBlock: true },
    { cmd: "rm -rf /", shouldBlock: true },
    { cmd: "DROP TABLE users", shouldBlock: true },
    { cmd: "terraform destroy", shouldBlock: true },
    { cmd: "git status", shouldBlock: false },
    { cmd: "npm install", shouldBlock: false },
    { cmd: "ls -la", shouldBlock: false },
  ];

  let passed = 0, failed = 0;
  for (const { cmd, shouldBlock } of TEST_COMMANDS) {
    const blocked = DANGEROUS_PATTERNS.some(({ pattern }) => pattern.test(cmd));
    const ok = blocked === shouldBlock;
    console.log(`${ok ? "✓" : "✗"} "${cmd}" → ${blocked ? "BLOCK" : "ALLOW"} (expected: ${shouldBlock ? "BLOCK" : "ALLOW"})`);
    ok ? passed++ : failed++;
  }

  // Allowlist test
  const testFile = path.join(os.tmpdir(), "claude-safety-allowlist", "session-test.json");
  try {
    const origSession = SESSION_ID;
    saveToAllowlist("rm -rf /test");
    const allowed = isAllowed("rm -rf /test");
    console.log(`${allowed ? "✓" : "✗"} Allowlist: save + check works`);
    allowed ? passed++ : failed++;
    // Cleanup test file
    try { fs.unlinkSync(testFile); } catch {}
  } catch {
    console.log("✗ Allowlist: save + check failed");
    failed++;
  }

  console.log(`\n${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ""}`);
  process.exit(failed > 0 ? 1 : 0);
}

// Approve mode: node pretooluse-safety.js --approve "command"
if (process.argv.includes("--approve")) {
  const idx = process.argv.indexOf("--approve");
  const cmd = process.argv[idx + 1];
  if (cmd) {
    saveToAllowlist(cmd);
    console.log(`✓ Approved: ${cmd}`);
  }
  process.exit(0);
}

async function main() {
  // Clean up old allowlist files in the background
  cleanupOldAllowlists();

  let input = "";
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  try {
    const event = JSON.parse(input);

    // Only check Bash tool calls
    if (event.tool_name !== "Bash") {
      return;
    }

    const command = event.tool_input?.command || "";

    for (const { pattern, reason } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        // If already in allowlist, pass through
        if (isAllowed(command)) {
          return; // Allow silently
        }

        // First time — block and add to allowlist (if user approves in Claude UI, passes next time)
        saveToAllowlist(command);

        const result = {
          decision: "block",
          reason: `⚠️ Dangerous command detected: ${reason}\nCommand: ${command}\nRequires explicit user approval.\n(Once approved, won't be asked again this session)`
        };
        process.stdout.write(JSON.stringify(result));
        return;
      }
    }
  } catch (e) {
    // Parse error — fail silently, do not block the hook
  }
}

main();
