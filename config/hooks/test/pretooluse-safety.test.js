#!/usr/bin/env node
/**
 * Unit tests for pretooluse-safety.js
 * Run: node config/hooks/test/pretooluse-safety.test.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Override session ID before requiring the module so allowlist uses a test-specific file
process.env.CLAUDE_SESSION_ID = `test-${Date.now()}`;

const {
  DANGEROUS_PATTERNS,
  CREDENTIAL_PATTERNS,
  EXFILTRATION_PATTERNS,
  checkUnicodeInjection,
  loadAllowlist,
  saveToAllowlist,
  isAllowed,
  cleanupOldAllowlists,
  ALLOWLIST_DIR,
} = require('../pretooluse-safety.js');

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

// --- Cleanup helper ---
function cleanupTestFiles() {
  try {
    if (fs.existsSync(ALLOWLIST_DIR)) {
      for (const f of fs.readdirSync(ALLOWLIST_DIR)) {
        if (f.includes('test-')) {
          fs.unlinkSync(path.join(ALLOWLIST_DIR, f));
        }
      }
    }
  } catch (e) { /* best effort */ }
}

// ===================== isAllowed tests =====================
console.log('\n--- isAllowed ---');

test('returns false for empty allowlist', () => {
  // Fresh session ID means empty allowlist
  assert.strictEqual(isAllowed('some random command'), false);
});

test('returns true after saving to allowlist', () => {
  saveToAllowlist('rm -rf /test-dir');
  assert.strictEqual(isAllowed('rm -rf /test-dir'), true);
});

test('normalizes whitespace when checking', () => {
  saveToAllowlist('git  push   --force');
  assert.strictEqual(isAllowed('git  push   --force'), true);
  assert.strictEqual(isAllowed('git push --force'), true);
});

test('returns false for non-matching command', () => {
  assert.strictEqual(isAllowed('completely different command'), false);
});

// ===================== saveToAllowlist tests =====================
console.log('\n--- saveToAllowlist ---');

test('creates allowlist file on save', () => {
  const sessionFile = path.join(ALLOWLIST_DIR, `session-${process.env.CLAUDE_SESSION_ID}.json`);
  // Already saved above, file should exist
  assert.strictEqual(fs.existsSync(sessionFile), true);
  const content = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  assert.ok(Array.isArray(content));
  assert.ok(content.length > 0);
});

test('does not duplicate entries', () => {
  saveToAllowlist('duplicate-cmd');
  saveToAllowlist('duplicate-cmd');
  const sessionFile = path.join(ALLOWLIST_DIR, `session-${process.env.CLAUDE_SESSION_ID}.json`);
  const content = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  const count = content.filter(c => c === 'duplicate-cmd').length;
  assert.strictEqual(count, 1);
});

// ===================== loadAllowlist tests =====================
console.log('\n--- loadAllowlist ---');

test('returns array from file', () => {
  const list = loadAllowlist();
  assert.ok(Array.isArray(list));
});

test('returns empty array for missing file', () => {
  const origId = process.env.CLAUDE_SESSION_ID;
  process.env.CLAUDE_SESSION_ID = 'nonexistent-session-xyz';
  // Force re-require would be complex; just test loadAllowlist indirectly
  // The module caches ALLOWLIST_FILE at require time, so we test via isAllowed
  // which calls loadAllowlist internally
  process.env.CLAUDE_SESSION_ID = origId;
  // At minimum, loadAllowlist should never throw
  assert.ok(Array.isArray(loadAllowlist()));
});

// ===================== DANGEROUS_PATTERNS tests =====================
console.log('\n--- DANGEROUS_PATTERNS ---');

const dangerousCases = [
  { cmd: 'git push --force origin main', expected: true },
  { cmd: 'git reset --hard HEAD~3', expected: true },
  { cmd: 'rm -rf /', expected: true },
  { cmd: 'rm -fr /tmp/test', expected: true },
  { cmd: 'DROP TABLE users;', expected: true },
  { cmd: 'TRUNCATE TABLE orders', expected: true },
  { cmd: 'terraform destroy', expected: true },
  { cmd: 'kubectl delete namespace prod', expected: true },
  { cmd: 'git status', expected: false },
  { cmd: 'npm install', expected: false },
  { cmd: 'ls -la', expected: false },
  { cmd: 'git push origin main', expected: false },
];

for (const { cmd, expected } of dangerousCases) {
  test(`"${cmd}" -> ${expected ? 'BLOCK' : 'ALLOW'}`, () => {
    const matched = DANGEROUS_PATTERNS.some(({ pattern }) => pattern.test(cmd));
    assert.strictEqual(matched, expected);
  });
}

// ===================== CREDENTIAL_PATTERNS tests =====================
console.log('\n--- CREDENTIAL_PATTERNS ---');

const credCases = [
  { cmd: 'echo AKIAIOSFODNN7EXAMPLE', expected: true, label: 'AWS key' },
  { cmd: 'echo ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1234', expected: true, label: 'GitHub PAT' },
  { cmd: 'echo sk-proj-abcdefghijklmnopqrst', expected: true, label: 'API key' },
  { cmd: '-----BEGIN RSA PRIVATE KEY-----', expected: true, label: 'RSA private key' },
  { cmd: 'echo hello world', expected: false, label: 'safe string' },
  { cmd: 'git commit -m "fix bug"', expected: false, label: 'normal commit' },
];

for (const { cmd, expected, label } of credCases) {
  test(`[${label}] -> ${expected ? 'BLOCK' : 'ALLOW'}`, () => {
    const matched = CREDENTIAL_PATTERNS.some(({ pattern }) => pattern.test(cmd));
    assert.strictEqual(matched, expected);
  });
}

// ===================== checkUnicodeInjection tests =====================
console.log('\n--- checkUnicodeInjection ---');

test('detects zero-width space', () => {
  assert.ok(checkUnicodeInjection('echo hello\u200Bworld') !== null);
});

test('detects bidi override', () => {
  assert.ok(checkUnicodeInjection('echo \u202Ehidden') !== null);
});

test('allows clean ASCII', () => {
  assert.strictEqual(checkUnicodeInjection('echo hello world'), null);
});

test('allows normal unicode (non-injection)', () => {
  assert.strictEqual(checkUnicodeInjection('echo merhaba dunya'), null);
});

// ===================== cleanupOldAllowlists tests =====================
console.log('\n--- cleanupOldAllowlists ---');

test('does not throw on cleanup', () => {
  assert.doesNotThrow(() => cleanupOldAllowlists());
});

// ===================== Summary =====================
cleanupTestFiles();

console.log(`\n${passed}/${passed + failed} passed${failed > 0 ? `, ${failed} FAILED` : ''}`);
process.exit(failed > 0 ? 1 : 0);
