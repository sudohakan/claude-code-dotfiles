#!/usr/bin/env node
/**
 * PostToolUse hook — periodic MCP health check
 * Runs every 50 tool calls. Uses a counter file at /tmp/claude-mcp-healthcheck-counter.json.
 * On failure, attempts reconnect once and logs result to stderr.
 */
if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'mcp-health-check' }));
  process.exit(0);
}

const { execSync } = require('child_process');
const fs = require('fs');

const COUNTER_FILE = '/tmp/claude-mcp-healthcheck-counter.json';
const CHECK_INTERVAL = 50;
const RETRY_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readCounter() {
  try {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    return typeof data.count === 'number' ? data.count : 0;
  } catch {
    return 0;
  }
}

function writeCounter(count) {
  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count }), 'utf8');
  } catch {
    // Non-fatal — /tmp write failure shouldn't block the hook
  }
}

async function runHealthCheck() {
  try {
    // Check all scopes
    const output = execSync('claude mcp list 2>&1 || true', { encoding: 'utf8', timeout: 10000 });

    const failedPattern = /^(\S+)\s+.*(?:failed|error|disconnected|not connected)/gim;
    const failedServers = [];
    let match;
    while ((match = failedPattern.exec(output)) !== null) {
      failedServers.push(match[1]);
    }

    if (failedServers.length === 0) {
      return;
    }

    process.stderr.write(`\n[mcp-health-check] ${failedServers.length} unhealthy MCP server(s) detected, attempting reconnect...\n`);

    for (const server of failedServers) {
      await sleep(RETRY_DELAY_MS);
      try {
        execSync(`claude mcp reconnect ${server} 2>&1 || true`, { encoding: 'utf8', timeout: 15000 });
        process.stderr.write(`  [ok] ${server} reconnected\n`);
      } catch {
        process.stderr.write(`  [fail] ${server} reconnect failed\n`);
      }
    }
  } catch {
    // Silent — don't block tool execution
  }
}

async function main() {
  const current = readCounter() + 1;
  writeCounter(current);

  if (current % CHECK_INTERVAL !== 0) {
    return; // Not time yet
  }

  await runHealthCheck();
}

main();
