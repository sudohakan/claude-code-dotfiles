#!/usr/bin/env node
/**
 * SessionStart hook — MCP auto-reconnect
 * Checks for failed MCP connections and retries once.
 * Runs at session start to ensure all MCP servers are connected.
 */
const { execSync } = require('child_process');

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  try {
    // Get MCP server status
    const output = execSync('claude mcp list -s user 2>&1 || true', { encoding: 'utf8', timeout: 10000 });

    // Find failed servers
    const failedPattern = /(\S+)\s+.*(?:failed|error|disconnected)/gi;
    const failedServers = [];
    let match;
    while ((match = failedPattern.exec(output)) !== null) {
      failedServers.push(match[1]);
    }

    if (failedServers.length === 0) {
      return; // All good
    }

    process.stderr.write(`\n🔄 ${failedServers.length} failed MCP server detected, retrying...\n`);

    for (const server of failedServers) {
      await sleep(RETRY_DELAY_MS);
      try {
        execSync(`claude mcp reconnect ${server} 2>&1 || true`, { encoding: 'utf8', timeout: 15000 });
        process.stderr.write(`  ✅ ${server} reconnected\n`);
      } catch {
        process.stderr.write(`  ❌ ${server} retry failed\n`);
      }
    }
  } catch {
    // Silent — don't block session start
  }
}

main();
