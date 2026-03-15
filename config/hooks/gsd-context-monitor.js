#!/usr/bin/env node
// Context Monitor - PostToolUse/AfterTool hook (Gemini uses AfterTool)
// Reads context metrics from the statusline bridge file and injects
// warnings when context usage is high.
//
// How it works:
// 1. The statusline hook writes metrics to /tmp/claude-ctx-{session_id}.json
// 2. This hook reads those metrics after each tool use
// 3. When remaining context drops below thresholds, it injects a warning
//    as additionalContext, which the agent sees in its conversation
// 4. At COMPACT_URGENT threshold, it tells the agent to write session-continuity.md
//    and ask the user to run /compact
//
// Thresholds (remaining_percentage):
//   CHECKPOINT      (remaining <= 45%): Suggest smaller context usage
//   WARNING         (remaining <= 35%): Agent should wrap up current task
//   CRITICAL        (remaining <= 25%): Agent MUST save state and inform user
//   COMPACT_SUGGEST (remaining <= 15%): Suggest /compact to user
//   COMPACT_URGENT  (remaining <= 10%): Write session-continuity.md, then urge /compact
//
// Session Continuity Integration:
//   At COMPACT_URGENT, the hook instructs the agent to write .memory/session-continuity.md
//   with current state (project, phase, status, next step, blockers, key decisions)
//   before asking the user to /compact. The post-compact context resumes by reading this file.
//
// Debounce: 10 tool uses between warnings to avoid spam
// Severity escalation bypasses debounce

const fs = require('fs');
const os = require('os');
const path = require('path');
const { findMemoryDir, getMemoryDirCandidates } = require('./lib/paths');

const CHECKPOINT_THRESHOLD = 45;      // remaining <= 45% (used ~55%) -> auto-checkpoint
const WARNING_THRESHOLD = 35;         // remaining <= 35% (used ~65%)
const CRITICAL_THRESHOLD = 25;        // remaining <= 25% (used ~75%)
const COMPACT_SUGGEST_THRESHOLD = 15; // remaining <= 15% (used ~85%) -> suggest /compact
const COMPACT_URGENT_THRESHOLD = 10;  // remaining <= 10% (used ~90%) -> write session-continuity + urge /compact
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 10;

if (process.argv.includes('--self-test')) {
  process.stdout.write(JSON.stringify({ ok: true, hook: 'gsd-context-monitor' }));
  process.exit(0);
}

/**
 * Resolve the memory directory for session-continuity.md.
 * Uses the first existing candidate, or creates the Claude projects memory dir.
 */
function resolveMemoryDir(cwd) {
  const existing = findMemoryDir(cwd);
  if (existing) return existing;

  // Create the Claude projects memory dir as fallback
  const candidates = getMemoryDirCandidates(cwd);
  const projectMemDir = candidates[candidates.length - 1];
  try {
    fs.mkdirSync(projectMemDir, { recursive: true });
    return projectMemDir;
  } catch (e) {
    return null;
  }
}

let input = '';
// Timeout guard: if stdin doesn't close within 3s (e.g. pipe issues on
// Windows/Git Bash), exit silently instead of hanging. See #775.
const stdinTimeout = setTimeout(() => process.exit(0), 3000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd || process.cwd();

    if (!sessionId) {
      process.exit(0);
    }

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    let metrics;
    try {
      metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    } catch (e) {
      // File doesn't exist or can't be read — no metrics available
      process.exit(0);
    }
    const now = Math.floor(Date.now() / 1000);

    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) {
      process.exit(0);
    }

    const remaining = metrics.remaining_percentage;
    const usedPct = metrics.used_pct;

    // Track tool call count for checkpoint interval
    const warnPath = path.join(tmpDir, `claude-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null, continuitySaved: false };
    let firstWarn = true;

    try {
      warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
      firstWarn = false;
    } catch (e) {
      // File doesn't exist or corrupted — use defaults
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    // No warning needed above checkpoint threshold
    if (remaining > CHECKPOINT_THRESHOLD) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData), { mode: 0o600 });
      process.exit(0);
    }

    const isCompactUrgent = remaining <= COMPACT_URGENT_THRESHOLD;
    const isCompactSuggest = remaining <= COMPACT_SUGGEST_THRESHOLD;
    const isCritical = remaining <= CRITICAL_THRESHOLD;
    const isWarning = remaining <= WARNING_THRESHOLD;
    const isCheckpointOnly = !isWarning && !isCritical;
    const currentLevel = isCompactUrgent ? 'compact_urgent'
      : isCompactSuggest ? 'compact_suggest'
      : isCritical ? 'critical'
      : isWarning ? 'warning'
      : 'checkpoint';

    // Checkpoint zone (45-35%): do not inject chat context, just track state
    if (isCheckpointOnly) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData), { mode: 0o600 });
      process.exit(0);
    }

    // Warning/Critical/Compact: debounce logic
    if ((isWarning || isCritical || isCompactSuggest || isCompactUrgent) && !firstWarn) {
      const severityOrder = { checkpoint: 0, warning: 1, critical: 2, compact_suggest: 3, compact_urgent: 4 };
      const severityEscalated = (severityOrder[currentLevel] || 0) > (severityOrder[warnData.lastLevel] || 0);
      if (warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
        fs.writeFileSync(warnPath, JSON.stringify(warnData), { mode: 0o600 });
        process.exit(0);
      }
    }

    // Reset debounce counter
    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;

    // Resolve memory dir for session-continuity path
    const memDir = resolveMemoryDir(cwd);
    const continuityPath = memDir ? path.join(memDir, 'session-continuity.md') : null;
    // Use absolute path to avoid ugly cross-filesystem relative paths on WSL
    const continuityDisplayPath = continuityPath || '.memory/session-continuity.md';

    // Build message based on severity
    let message;
    if (isCompactUrgent) {
      if (!warnData.continuitySaved) {
        message = [
          `CONTEXT ${usedPct}% — SESSION CONTINUITY REQUIRED.`,
          `You MUST write ${continuityDisplayPath} BEFORE doing anything else.`,
          `Content (keep under 12 lines):`,
          `  - project: current project/workspace`,
          `  - phase: what you were working on`,
          `  - status: completed items and current state`,
          `  - next_step: what to do after compact`,
          `  - blockers: any unresolved issues`,
          `  - key_decisions: important decisions made this session`,
          `After writing, tell the user: "Context is at ${usedPct}%. I've saved session state to session-continuity.md. Please run /compact so I can continue."`,
          `IMPORTANT: After /compact, your FIRST action must be to read ${continuityDisplayPath} to restore context.`,
          `Do NOT start any new work until session-continuity.md is written.`
        ].join('\n');
        warnData.continuitySaved = true;
      } else {
        message = `CONTEXT ${usedPct}%: session-continuity.md should already be saved. Ask the user to run /compact NOW. After /compact, your FIRST action must be to read ${continuityDisplayPath}. Do not start new work.`;
      }
    } else if (isCompactSuggest) {
      message = [
        `CONTEXT ${usedPct}%: approaching compact threshold.`,
        `Prepare to write ${continuityDisplayPath} with current state.`,
        `Avoid starting new large tasks. Suggest /compact to the user when current work completes.`
      ].join('\n');
    } else if (isCritical) {
      message = [
        `CONTEXT ${usedPct}%: high usage.`,
        `Prepare ${continuityDisplayPath} content mentally. Do not start new tasks.`,
        `Finish current work quickly and be ready to save state.`
      ].join('\n');
    } else if (isWarning) {
      message = `CONTEXT ${usedPct}%: keep main context small, use subagents for large reads. Be mindful of context budget.`;
    } else {
      message = `CONTEXT ${usedPct}%: keep outputs on disk and avoid broad reads in main context.`;
    }

    fs.writeFileSync(warnPath, JSON.stringify(warnData), { mode: 0o600 });

    const output = {
      hookSpecificOutput: {
        hookEventName: data.hook_event_name || "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    // Silent fail -- never block tool execution
    process.exit(0);
  }
});
