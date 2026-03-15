# Label Session — Manual Session Naming

When this command is executed, create or update a simple session label for the current work.

## Behavior
- Ask for a short label if one is not provided in the command arguments
- Store the label in the current project's memory area when possible
- If no project memory directory exists, store it in `~/.claude/session-env/`
- Show the active label and remind the user to reuse it when resuming work
