#!/usr/bin/env node

/**
 * Hook Runner — Platform-aware path resolver for Claude Code hooks.
 * Resolves hook scripts via os.homedir() to avoid $HOME / Git Bash path issues on Windows.
 * Usage: node hook-runner.js <hook-script-name> [args...]
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const scriptName = process.argv[2];

if (!scriptName) {
  process.stderr.write('Usage: node hook-runner.js <script-name> [args...]\n');
  process.exit(1);
}

const scriptPath = path.join(os.homedir(), '.claude', 'hooks', scriptName);

if (!fs.existsSync(scriptPath)) {
  process.stderr.write(`Hook script not found: ${scriptPath}\n`);
  process.exit(1);
}

const args = [scriptPath, ...process.argv.slice(3)];
const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => process.exit(code || 0));
child.on('error', (err) => {
  process.stderr.write(`Failed to run hook ${scriptName}: ${err.message}\n`);
  process.exit(1);
});
