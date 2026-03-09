#!/usr/bin/env node
// Context Monitor - PostToolUse/AfterTool hook (Gemini uses AfterTool)
// Reads context metrics from the statusline bridge file and injects
// warnings when context usage is high. Also auto-saves session state
// at checkpoints so context exhaustion doesn't lose work.
//
// How it works:
// 1. The statusline hook writes metrics to /tmp/claude-ctx-{session_id}.json
// 2. This hook reads those metrics after each tool use
// 3. When remaining context drops below thresholds, it injects a warning
//    as additionalContext, which the agent sees in its conversation
// 4. At CRITICAL threshold, it auto-saves a checkpoint file
//
// Thresholds (remaining_percentage):
//   CHECKPOINT      (remaining <= 45%): Auto-save session state, suggest subagents
//   WARNING         (remaining <= 35%): Agent should wrap up current task
//   CRITICAL        (remaining <= 25%): Agent MUST save state and inform user
//   COMPACT_SUGGEST (remaining <= 15%): Suggest /compact to user
//   COMPACT_URGENT  (remaining <= 10%): Strongly urge /compact + auto-save session-continuity
//
// Debounce: 5 tool uses between warnings to avoid spam
// Severity escalation bypasses debounce

const fs = require('fs');
const os = require('os');
const path = require('path');

const CHECKPOINT_THRESHOLD = 45;      // remaining <= 45% (used ~55%) -> auto-checkpoint
const WARNING_THRESHOLD = 35;         // remaining <= 35% (used ~65%)
const CRITICAL_THRESHOLD = 25;        // remaining <= 25% (used ~75%)
const COMPACT_SUGGEST_THRESHOLD = 15; // remaining <= 15% (used ~85%) -> suggest /compact
const COMPACT_URGENT_THRESHOLD = 10;  // remaining <= 10% (used ~90%) -> urge /compact
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 5;
const CHECKPOINT_INTERVAL = 15;  // min tool uses between checkpoints

// Inline helper: memory dir candidates (avoids lib/paths dependency)
function getMemoryDirCandidates(cwd) {
  const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  const projectKey = cwd.replace(/[:\\/]/g, '-').replace(/^-+/, '');
  return [
    path.join(cwd, 'memory'),
    path.join(claudeDir, 'projects', projectKey, 'memory'),
  ];
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
    let warnData = { callsSinceWarn: 0, callsSinceCheckpoint: 0, lastLevel: null, checkpointSaved: false };
    let firstWarn = true;

    try {
      warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
      if (warnData.callsSinceCheckpoint == null) warnData.callsSinceCheckpoint = 0;
      if (warnData.checkpointSaved == null) warnData.checkpointSaved = false;
      firstWarn = false;
    } catch (e) {
      // File doesn't exist or corrupted — use defaults
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;
    warnData.callsSinceCheckpoint = (warnData.callsSinceCheckpoint || 0) + 1;

    // Auto-checkpoint: write context state to project memory dir
    const shouldCheckpoint = remaining <= CHECKPOINT_THRESHOLD &&
      warnData.callsSinceCheckpoint >= CHECKPOINT_INTERVAL;

    if (shouldCheckpoint) {
      warnData.callsSinceCheckpoint = 0;
      warnData.checkpointSaved = true;
      try {
        // Find memory dir - check common locations
        const memoryDirs = getMemoryDirCandidates(cwd);
        for (const memDir of memoryDirs) {
          if (fs.existsSync(memDir)) {
            const checkpointPath = path.join(memDir, 'auto-checkpoint.md');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const content = `# Auto-Checkpoint — ${timestamp}\n` +
              `**Context:** ${usedPct}% used, ${remaining}% remaining\n` +
              `**Session:** ${sessionId}\n` +
              `**CWD:** ${cwd}\n\n` +
              `> This file was automatically created by the context monitor.\n` +
              `> In a new session, read \`memory/session-continuity.md\` and this file.\n` +
              `> You can resume with \`claude --resume\`.\n`;
            fs.writeFileSync(checkpointPath, content);
            break;
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

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

    // Checkpoint zone (45-35%): only inject message every CHECKPOINT_INTERVAL calls
    if (isCheckpointOnly && !shouldCheckpoint) {
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
    fs.writeFileSync(warnPath, JSON.stringify(warnData), { mode: 0o600 });

    // Auto-save session-continuity at compact_urgent (90%+ used)
    if (isCompactUrgent) {
      try {
        const memoryDirs2 = getMemoryDirCandidates(cwd);
        for (const memDir of memoryDirs2) {
          if (fs.existsSync(memDir)) {
            const checkpointPath = path.join(memDir, 'auto-checkpoint.md');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            const content = `# Auto-Checkpoint (Pre-Compact) — ${timestamp}\n` +
              `**Context:** ${usedPct}% used, ${remaining}% remaining\n` +
              `**Session:** ${sessionId}\n` +
              `**CWD:** ${cwd}\n` +
              `**Action:** /compact recommended — session-continuity.md should be updated\n\n` +
              `> This file was automatically created by the context monitor at 90% threshold.\n` +
              `> Detail loss may occur after compact — verify session-continuity.md.\n`;
            fs.writeFileSync(checkpointPath, content);
            break;
          }
        }
      } catch (e) {
        // Silent fail
      }
    }

    // Build message
    let message;
    if (isCompactUrgent) {
      message = `CONTEXT COMPACT URGENT (${usedPct}%, ${remaining}% remaining): ` +
        'Context above 90%! First update session-continuity.md (what was done, what remains, decisions), ' +
        'then suggest user to run /compact. ' +
        'Work can continue in the same session after compact. ' +
        'Do NOT start new large tasks, finish or pause current work.';
    } else if (isCompactSuggest) {
      message = `CONTEXT COMPACT SUGGEST (${usedPct}%, ${remaining}% remaining): ` +
        'Context at 85% threshold. Good time to run /compact — ' +
        'finish current work, check if session-continuity.md is up to date, ' +
        'then suggest /compact to the user. ' +
        'Compact loses detail but does not break workflow.';
    } else if (isCritical) {
      message = `CONTEXT CRITICAL (${usedPct}%, ${remaining}% remaining): ` +
        'Update session-continuity.md IMMEDIATELY — what was done, what remains, decisions. ' +
        'Notify user: "Context is nearly full, continue with /compact or `claude --resume`." ' +
        'Do NOT start new tasks. Finish current work or save state.';
    } else if (isWarning) {
      message = `CONTEXT WARNING (${usedPct}%, ${remaining}% remaining): ` +
        'Use ONLY subagents for new large tasks. Main context for coordination only. ' +
        'Finish current work, prepare to update session-continuity.md. ' +
        'If using GSD, consider /gsd:pause-work.';
    } else {
      message = `CONTEXT CHECKPOINT (${usedPct}%, ${remaining}% remaining): ` +
        'Context halfway used. From now on, use subagents for research and large tasks. ' +
        'Keep main context clean — write long tool outputs to file, not context.';
    }

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
