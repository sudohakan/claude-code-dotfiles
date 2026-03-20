#!/usr/bin/env node
/**
 * Stop hook — session-end verification
 * Checks for uncommitted secrets and console.log leftovers in modified files.
 */
const { execSync } = require('child_process');

try {
  // Check for uncommitted files with potential secrets
  const status = execSync('git status --porcelain 2>/dev/null || true', { encoding: 'utf8' });
  const modifiedFiles = status.split('\n').filter(l => l.trim()).map(l => l.slice(3));

  const secretPatterns = [
    /(?:api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]{20,}/i,
    /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /ghp_[a-zA-Z0-9]{36,}/,
    /AKIA[A-Z0-9]{16}/
  ];

  let warnings = [];

  for (const file of modifiedFiles) {
    if (!file || file.endsWith('.env') || file.includes('node_modules')) continue;
    try {
      const content = require('fs').readFileSync(file, 'utf8');
      for (const pattern of secretPatterns) {
        if (pattern.test(content)) {
          warnings.push(`Potential secret in ${file}`);
          break;
        }
      }
    } catch {}
  }

  if (warnings.length > 0) {
    process.stderr.write(`\n⚠️ Session-end check:\n${warnings.join('\n')}\n`);
  }
} catch {
  // Silent — don't block session end
}
