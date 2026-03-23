#!/usr/bin/env node

/**
 * PostToolUse Lint & Format Hook v1.0.0
 *
 * Runs after Write/Edit tool calls to:
 *   1. Lint the changed file (always on)
 *   2. Auto-format the changed file (off by default, enable via ENABLE_AUTOFORMAT=1)
 *
 * Config:
 *   env.ENABLE_AUTOFORMAT = "1"  → enable auto-formatting (default: disabled)
 *
 * Supported file types & tools:
 *   .js/.jsx/.ts/.tsx/.mjs/.cjs → eslint (lint), prettier/biome (format)
 *   .py                         → ruff check / flake8 / pylint (lint), ruff format / black (format)
 *   .go                         → go vet (lint), gofmt (format)
 *   .rs                         → cargo clippy (lint), rustfmt (format)
 *   .css/.scss/.less/.json/.md/.yaml/.yml/.html → prettier (format only)
 *   .sh/.bash                   → shellcheck (lint only)
 *   .c/.cpp/.h/.hpp             → clang-tidy (lint), clang-format (format)
 *
 * Exit codes:
 *   0  = success (lint passed or no linter found)
 *   Lint warnings are reported via stderr but do NOT block.
 */

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ENABLE_AUTOFORMAT = process.env.ENABLE_AUTOFORMAT === "1";

// Self-test
if (process.argv.includes("--self-test")) {
  process.stdout.write(
    JSON.stringify({
      ok: true,
      hook: "posttooluse-lint-format",
      autoformat: ENABLE_AUTOFORMAT,
    })
  );
  process.exit(0);
}

/**
 * Try to run a command. Returns { ok, stdout, stderr }.
 * Searches project-local binaries first (npx, node_modules/.bin).
 */
function tryRun(cmd, cwd) {
  try {
    const result = spawnSync("sh", ["-c", cmd], {
      cwd,
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return {
      ok: result.status === 0,
      stdout: (result.stdout || "").toString().trim(),
      stderr: (result.stderr || "").toString().trim(),
      status: result.status,
    };
  } catch {
    return { ok: false, stdout: "", stderr: "", status: -1 };
  }
}

/**
 * Check if a command exists (globally or in project node_modules).
 */
function commandExists(name, cwd) {
  // Check node_modules/.bin first
  if (cwd) {
    const localBin = path.join(cwd, "node_modules", ".bin", name);
    if (fs.existsSync(localBin)) return localBin;
  }
  // Check global
  const result = spawnSync("which", [name], { stdio: "pipe", timeout: 3000 });
  return result.status === 0 ? name : null;
}

/**
 * Find the project root (nearest directory with package.json, go.mod, Cargo.toml, etc.)
 */
function findProjectRoot(filePath) {
  let dir = path.dirname(filePath);
  const markers = [
    "package.json",
    "go.mod",
    "Cargo.toml",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    ".git",
    "Makefile",
  ];
  for (let i = 0; i < 20 && dir !== path.dirname(dir); i++) {
    if (markers.some((m) => fs.existsSync(path.join(dir, m)))) return dir;
    dir = path.dirname(dir);
  }
  return path.dirname(filePath);
}

/**
 * Get linter and formatter commands for a file extension.
 * Returns { linters: string[], formatters: string[] } — each is a shell command template.
 * Use {file} as placeholder for the file path.
 */
function getTools(ext, filePath) {
  const cwd = findProjectRoot(filePath);
  const linters = [];
  const formatters = [];

  switch (ext) {
    case ".js":
    case ".jsx":
    case ".ts":
    case ".tsx":
    case ".mjs":
    case ".cjs": {
      // Lint: eslint
      const eslint = commandExists("eslint", cwd);
      if (eslint) {
        const cmd = eslint.includes("/") ? `"${eslint}"` : eslint;
        linters.push(`${cmd} --no-error-on-unmatched-pattern --max-warnings=0 "{file}"`);
      }
      // Format: prettier or biome
      const prettier = commandExists("prettier", cwd);
      const biome = commandExists("biome", cwd);
      if (biome) {
        const cmd = biome.includes("/") ? `"${biome}"` : biome;
        formatters.push(`${cmd} format --write "{file}"`);
      } else if (prettier) {
        const cmd = prettier.includes("/") ? `"${prettier}"` : prettier;
        formatters.push(`${cmd} --write "{file}"`);
      }
      break;
    }
    case ".py": {
      // Lint: ruff > flake8 > pylint
      if (commandExists("ruff", cwd)) {
        linters.push(`ruff check "{file}"`);
        formatters.push(`ruff format "{file}"`);
      } else {
        if (commandExists("flake8", cwd)) linters.push(`flake8 "{file}"`);
        else if (commandExists("pylint", cwd)) linters.push(`pylint --score=no "{file}"`);
        if (commandExists("black", cwd)) formatters.push(`black --quiet "{file}"`);
      }
      break;
    }
    case ".go": {
      if (commandExists("go", cwd)) {
        linters.push(`go vet "{file}"`);
        formatters.push(`gofmt -w "{file}"`);
      }
      break;
    }
    case ".rs": {
      if (commandExists("cargo", cwd)) {
        // clippy works on the whole project, use it at file level isn't great
        // but we can still check syntax
        linters.push(`cargo clippy --quiet --message-format=short 2>&1 | grep -i "{basename}" || true`);
        formatters.push(`rustfmt "{file}"`);
      }
      break;
    }
    case ".css":
    case ".scss":
    case ".less":
    case ".json":
    case ".yaml":
    case ".yml":
    case ".html": {
      const prettier = commandExists("prettier", cwd);
      if (prettier) {
        const cmd = prettier.includes("/") ? `"${prettier}"` : prettier;
        formatters.push(`${cmd} --write "{file}"`);
      }
      break;
    }
    case ".sh":
    case ".bash": {
      if (commandExists("shellcheck", cwd)) {
        linters.push(`shellcheck "{file}"`);
      }
      break;
    }
    case ".c":
    case ".cpp":
    case ".h":
    case ".hpp": {
      if (commandExists("clang-tidy", cwd)) {
        linters.push(`clang-tidy "{file}" -- 2>&1 | head -30`);
      }
      if (commandExists("clang-format", cwd)) {
        formatters.push(`clang-format -i "{file}"`);
      }
      break;
    }
  }

  return { linters, formatters, cwd };
}

async function main() {
  let input = "";
  const stdinTimeout = setTimeout(() => process.exit(0), 3000);
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  clearTimeout(stdinTimeout);

  try {
    const event = JSON.parse(input);

    // Only run after Write or Edit
    if (event.tool_name !== "Write" && event.tool_name !== "Edit") {
      process.exit(0);
    }

    const filePath = event.tool_input?.file_path;
    if (!filePath || !fs.existsSync(filePath)) {
      process.exit(0);
    }

    const ext = path.extname(filePath).toLowerCase();
    if (!ext) {
      process.exit(0);
    }

    const basename = path.basename(filePath);
    const { linters, formatters, cwd } = getTools(ext, filePath);

    // No tools available for this file type
    if (linters.length === 0 && formatters.length === 0) {
      process.exit(0);
    }

    const messages = [];

    // 1. Run linters (always)
    for (const lintCmd of linters) {
      const cmd = lintCmd.replace(/\{file\}/g, filePath).replace(/\{basename\}/g, basename);
      const result = tryRun(cmd, cwd);
      if (!result.ok) {
        const output = (result.stdout + "\n" + result.stderr).trim();
        if (output) {
          messages.push(`⚠ Lint [${basename}]:\n${output}`);
        }
      }
    }

    // 2. Run formatters (only if ENABLE_AUTOFORMAT is on)
    if (ENABLE_AUTOFORMAT) {
      for (const fmtCmd of formatters) {
        const cmd = fmtCmd.replace(/\{file\}/g, filePath).replace(/\{basename\}/g, basename);
        const result = tryRun(cmd, cwd);
        if (result.ok) {
          messages.push(`✓ Formatted ${basename}`);
        } else {
          const output = (result.stderr || result.stdout || "").trim();
          if (output) {
            messages.push(`⚠ Format failed [${basename}]: ${output.substring(0, 200)}`);
          }
        }
      }
    }

    // Report lint results via stderr (informational, non-blocking)
    if (messages.length > 0) {
      process.stderr.write(messages.join("\n") + "\n");
    }

    // Always exit 0 — lint warnings are informational, not blocking
    process.exit(0);
  } catch {
    // Parse error — exit silently
    process.exit(0);
  }
}

main();
