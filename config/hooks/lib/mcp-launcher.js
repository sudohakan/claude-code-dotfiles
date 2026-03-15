#!/usr/bin/env node

/**
 * MCP Server Launcher — Platform-aware path resolver
 * Detects Windows vs WSL and resolves paths accordingly.
 * Usage: node mcp-launcher.js <mcp-name>
 */

const os = require("os");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Detect WSL environment
const isWSL = os.platform() === "linux" &&
  fs.existsSync("/proc/version") &&
  fs.readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft");

/**
 * Convert Windows path to WSL /mnt/ path when running on WSL.
 * On Windows/Git Bash, returns the path as-is.
 */
function resolveWinPath(winPath) {
  if (!isWSL) return winPath;
  // C:\dev\foo or C:/dev/foo → /mnt/c/dev/foo
  return winPath
    .replace(/^([A-Za-z]):[\\\/]/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/");
}

// MCP server configurations — Windows paths as source of truth
const DEFAULT_MCP_CONFIGS = {
  hakanmcp: {
    type: "node",
    script: "C:/dev/HakanMCP/dist/src/index.js",
    cwd: "C:/dev/HakanMCP",
  },
  "container-use": {
    type: "binary",
    binary: "C:/Users/Hakan/bin/container-use.exe",
    args: ["stdio"],
  },
};

function loadConfigs() {
  const configFile = process.env.CLAUDE_MCP_CONFIG
    || path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude"), "mcp-config.json");

  if (!fs.existsSync(configFile)) {
    return DEFAULT_MCP_CONFIGS;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configFile, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : DEFAULT_MCP_CONFIGS;
  } catch {
    return DEFAULT_MCP_CONFIGS;
  }
}

const MCP_CONFIGS = loadConfigs();

// --- Main ---
const mcpName = process.argv[2];

if (!mcpName || !MCP_CONFIGS[mcpName]) {
  console.error(
    `Unknown MCP: ${mcpName}. Available: ${Object.keys(MCP_CONFIGS).join(", ")}`
  );
  process.exit(1);
}

const config = MCP_CONFIGS[mcpName];

if (config.type === "node") {
  const scriptPath = resolveWinPath(config.script);
  const cwdPath = config.cwd
    ? resolveWinPath(config.cwd)
    : path.dirname(scriptPath);

  if (!fs.existsSync(scriptPath)) {
    console.error(`MCP script not found: ${scriptPath}`);
    process.exit(1);
  }

  const child = spawn(process.execPath, [scriptPath], {
    stdio: "inherit",
    cwd: cwdPath,
    env: process.env,
  });

  child.on("exit", (code) => process.exit(code || 0));
  child.on("error", (err) => {
    console.error(`Failed to start ${mcpName}: ${err.message}`);
    process.exit(1);
  });
} else if (config.type === "binary") {
  const binPath = resolveWinPath(config.binary);

  if (!fs.existsSync(binPath)) {
    console.error(`MCP binary not found: ${binPath}`);
    process.exit(1);
  }

  const child = spawn(binPath, config.args || [], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => process.exit(code || 0));
  child.on("error", (err) => {
    console.error(`Failed to start ${mcpName}: ${err.message}`);
    process.exit(1);
  });
}
