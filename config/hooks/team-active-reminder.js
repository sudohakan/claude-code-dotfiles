#!/usr/bin/env node

/**
 * Team Active Reminder — SessionStart Hook v1.0.0
 *
 * Checks if any agent team is currently active. If so, outputs a prominent
 * delegation reminder to stdout, which Claude Code injects into the session
 * context as a system-reminder at startup.
 *
 * No blocking. No tool restrictions. Pure awareness injection.
 *
 * Self-test: node team-active-reminder.js --self-test
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const TEAMS_DIR = path.join(os.homedir(), ".claude", "teams");

if (process.argv.includes("--self-test")) {
  process.stdout.write(JSON.stringify({ ok: true, hook: "team-active-reminder" }));
  process.exit(0);
}

function findActiveTeams() {
  if (!fs.existsSync(TEAMS_DIR)) return [];

  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(TEAMS_DIR);
  } catch {
    return [];
  }

  for (const entry of entries) {
    const configPath = path.join(TEAMS_DIR, entry, "config.json");
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const activeMembers = (config.members || []).filter(
        (m) => m.isActive && m.name !== "team-lead"
      );
      if (activeMembers.length > 0) {
        results.push({
          name: config.name || entry,
          members: activeMembers.map((m) => m.name),
        });
      }
    } catch {
      continue;
    }
  }

  return results;
}

const activeTeams = findActiveTeams();
if (activeTeams.length === 0) process.exit(0);

const lines = [];
for (const team of activeTeams) {
  lines.push(`Team "${team.name}" is ACTIVE — members: ${team.members.join(", ")}`);
}

const reminder = [
  "=== TEAM LEADER DELEGATION REMINDER ===",
  ...lines,
  "",
  "Before using Read / Grep / Glob / Bash for any research or discovery:",
  "  → Is this DISCOVERY? SendMessage to the right teammate instead.",
  "  → Is this VERIFICATION of teammate output? Proceed.",
  "",
  "Direct. Coordinate. Verify. Do NOT investigate.",
  "========================================",
].join("\n");

process.stdout.write(reminder + "\n");
