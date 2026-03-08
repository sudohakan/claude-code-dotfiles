#!/usr/bin/env node
/**
 * Unit tests for gsd-statusline.js logic
 * Run: node config/hooks/test/gsd-statusline.test.js
 *
 * The statusline hook reads from stdin and writes to stdout, so we test
 * by spawning it as a child process with crafted JSON input.
 */

const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const HOOK_PATH = path.join(__dirname, '..', 'gsd-statusline.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  PASS  ${name}`);
    passed++;
  } catch (e) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

function runHook(inputObj) {
  const input = JSON.stringify(inputObj);
  try {
    const out = execFileSync(process.execPath, [HOOK_PATH], {
      input,
      timeout: 5000,
      encoding: 'utf8',
      windowsHide: true,
    });
    return out;
  } catch (e) {
    // Hook may exit 0 with output on stderr
    return e.stdout || '';
  }
}

// Strip ANSI escape codes for easier assertion
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '').replace(/\x1b\[5;31m/g, '');
}

// ===================== Context percentage scaling =====================
console.log('\n--- Context percentage scaling ---');

test('100% remaining -> 0% used displayed', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'TestModel' },
    workspace: { current_dir: '/tmp/test' },
    context_window: { remaining_percentage: 100 },
  }));
  assert.ok(out.includes('0%'), `Expected 0% in: "${out}"`);
});

test('20% remaining (80% raw used) -> 100% scaled', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'TestModel' },
    workspace: { current_dir: '/tmp/test' },
    context_window: { remaining_percentage: 20 },
  }));
  assert.ok(out.includes('100%'), `Expected 100% in: "${out}"`);
});

test('60% remaining (40% raw used) -> 50% scaled', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'TestModel' },
    workspace: { current_dir: '/tmp/test' },
    context_window: { remaining_percentage: 60 },
  }));
  assert.ok(out.includes('50%'), `Expected 50% in: "${out}"`);
});

test('0% remaining -> 125% capped to 100%', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'TestModel' },
    workspace: { current_dir: '/tmp/test' },
    context_window: { remaining_percentage: 0 },
  }));
  // Should be capped at 100% by Math.min
  assert.ok(out.includes('100%'), `Expected 100% in: "${out}"`);
});

// ===================== Status line formatting =====================
console.log('\n--- Status line formatting ---');

test('shows model name', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'Claude Opus' },
    workspace: { current_dir: '/tmp/myproject' },
  }));
  assert.ok(out.includes('Claude Opus'), `Expected model name in: "${out}"`);
});

test('shows directory basename', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'Test' },
    workspace: { current_dir: '/home/user/my-project' },
  }));
  assert.ok(out.includes('my-project'), `Expected dir name in: "${out}"`);
});

test('no context info when remaining is null', () => {
  const out = stripAnsi(runHook({
    model: { display_name: 'Test' },
    workspace: { current_dir: '/tmp/test' },
  }));
  assert.ok(!out.includes('%'), `Expected no percentage in: "${out}"`);
});

test('progress bar has 10 segments', () => {
  const out = runHook({
    model: { display_name: 'Test' },
    workspace: { current_dir: '/tmp/test' },
    context_window: { remaining_percentage: 50 },
  });
  // Count filled + empty blocks
  const blocks = (out.match(/[█░]/g) || []).length;
  assert.strictEqual(blocks, 10, `Expected 10 bar segments, got ${blocks}`);
});

test('handles missing model gracefully', () => {
  const out = stripAnsi(runHook({
    workspace: { current_dir: '/tmp/test' },
  }));
  assert.ok(out.includes('Claude'), `Expected fallback model name in: "${out}"`);
});

// ===================== Summary =====================
console.log(`\n${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ''}`);
process.exit(failed > 0 ? 1 : 0);
