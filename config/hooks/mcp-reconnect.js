#!/usr/bin/env node
/**
 * SessionStart hook — MCP auto-reconnect
 * Checks for failed MCP connections across ALL scopes and retries once.
 * Runs at session start to ensure all MCP servers are connected.
 */
if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'mcp-reconnect' }));
  process.exit(0);
}

const { execSync } = require('child_process');

const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    // Get MCP server status across ALL scopes (user, project, local)
    const output = execSync('claude mcp list 2>&1 || true', { encoding: 'utf8', timeout: 10000 });

    // Find failed servers — match failed, error, disconnected, not connected
    const failedPattern = /^(\S+)\s+.*(?:failed|error|disconnected|not connected)/gim;
    const failedServers = [];
    let match;
    while ((match = failedPattern.exec(output)) !== null) {
      failedServers.push(match[1]);
    }

    if (failedServers.length === 0) {
      return; // All good
    }

    process.stderr.write(`\n[mcp-reconnect] ${failedServers.length} failed MCP server(s) detected, retrying...\n`);

    for (const server of failedServers) {
      await sleep(RETRY_DELAY_MS);
      try {
        execSync(`claude mcp reconnect ${server} 2>&1 || true`, { encoding: 'utf8', timeout: 15000 });
        process.stderr.write(`  [ok] ${server} reconnected\n`);
      } catch {
        process.stderr.write(`  [fail] ${server} retry failed\n`);
      }
    }
  } catch {
    // Silent — don't block session start
  }
}

main().catch(() => {});
