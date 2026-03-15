#!/usr/bin/env node

/**
 * TaskCompleted Hook
 * Runs when an agent team task is being marked as complete.
 * Exit code 2 = prevent completion and send feedback.
 * Exit code 0 = allow task to complete.
 */

async function main() {
  if (process.argv.includes('--self-test')) {
    process.stdout.write(JSON.stringify({ ok: true, hook: 'task-completed-check' }));
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
    const taskDescription = event.task_description || "";
    const taskResult = event.task_result || event.description || "";

    // Only enforce quality check if task_result is provided
    // TaskUpdate API doesn't have a task_result field, so allow completion
    // when the field is absent to avoid blocking the entire task system
    if (taskResult && taskResult.trim().length > 0) {
      // Check for common incomplete markers
      const incompleteMarkers = [
        { pattern: /TODO/i, label: "TODO" },
        { pattern: /FIXME/i, label: "FIXME" },
        { pattern: /not yet implemented/i, label: "not yet implemented" },
        { pattern: /work in progress/i, label: "work in progress" },
        { pattern: /WIP/i, label: "WIP" },
        { pattern: /placeholder/i, label: "placeholder" },
      ];

      for (const marker of incompleteMarkers) {
        if (marker.pattern.test(taskResult)) {
          process.stdout.write(
            JSON.stringify({
              decision: "block",
              reason: `Task result contains "${marker.label}" marker. Please complete the remaining work before marking as done.`,
            })
          );
          process.exit(2);
        }
      }
    }

    // Task passes basic quality check
    process.exit(0);
  } catch {
    // Parse error — allow completion
    process.exit(0);
  }
}

main();
