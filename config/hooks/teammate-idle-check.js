#!/usr/bin/env node

/**
 * TeammateIdle Hook
 * Runs when an agent team teammate is about to go idle.
 * Exit code 2 = send feedback and keep teammate working.
 * Exit code 0 = allow teammate to go idle.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

async function main() {
  if (process.argv.includes('--self-test')) {
    process.stdout.write(JSON.stringify({ ok: true, hook: 'teammate-idle-check' }));
    process.exit(0);
  }

  let input = "";
  const stdinTimeout = setTimeout(() => process.exit(0), 3000);
  for await (const chunk of process.stdin) {
    input += chunk;
  }
  clearTimeout(stdinTimeout);

  try {
    const event = JSON.parse(input);
    const teamName = event.team_name || "";

    // Check if there are pending tasks in the team's task directory
    const tasksDir = path.join(os.homedir(), ".claude", "tasks", teamName);

    if (!fs.existsSync(tasksDir)) {
      // No task directory — teammate can go idle
      process.exit(0);
    }

    const teammateName = event.teammate_name || "";
    const taskFiles = fs.readdirSync(tasksDir).filter((f) => f.endsWith(".json"));
    let pendingTasks = 0;
    let roleMatchTasks = 0;
    const roleTag = `[ROLE: ${teammateName}]`;

    for (const file of taskFiles) {
      try {
        const task = JSON.parse(
          fs.readFileSync(path.join(tasksDir, file), "utf8")
        );
        // Check both blocked flag and blockedBy array
        const isBlocked = task.blocked === true ||
          (Array.isArray(task.blockedBy) && task.blockedBy.length > 0);

        if (task.status === "pending" && !isBlocked && !task.owner) {
          pendingTasks++;
          const desc = (task.description || "") + " " + (task.subject || "");
          // Only match if task explicitly has THIS teammate's role tag
          // Untagged tasks do NOT auto-match — they require explicit assignment
          if (desc.includes(roleTag)) {
            roleMatchTasks++;
          }
        }
      } catch {
        // Skip malformed task files
      }
    }

    if (roleMatchTasks > 0) {
      // There are pending tasks matching this teammate's role
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: `${roleMatchTasks} pending task(s) matching your role (${teammateName}). Run TaskList and self-claim the next unblocked task.`,
        })
      );
      process.exit(2);
    }

    if (pendingTasks > 0) {
      // There are pending tasks but none match this role — notify team leader
      process.stderr.write(`No tasks matching role ${teammateName}, but ${pendingTasks} total pending. Notify team leader.\n`);
      process.exit(0);
    }

    // No pending tasks — teammate can go idle
    process.exit(0);
  } catch {
    // Parse error — allow idle
    process.exit(0);
  }
}

main();
