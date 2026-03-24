# WSL Health — Claude, Tmux, And MCP Readiness

When this command is executed, perform a compact health check for the WSL + tmux + Claude setup.

## Check
- Current shell context: WSL distro, user, `pwd`, and whether the current working directory is valid
- Whether the current session is inside `tmux`
- `tmux list-panes -a` and flag any pane whose path is missing, stale, or suspicious (especially `/Users/...` on WSL)
- `type -a claude` and `claude --version`
- Whether `claude` resolves to the WSL-local binary first (`~/.npm-global/bin/claude`)
- `~/.claude.json` existence and JSON parse status
- For each configured local stdio MCP server, show `command`, `cwd`, and whether those referenced paths exist
- `kali-mcp` SSE reachability at `http://localhost:8000/sse` when configured
- Whether `~/.bashrc` contains the WSL Claude wrapper and cwd recovery block
- Whether `~/.tmux.conf` contains split/new-window path propagation bindings

## Output
- Report each section as `OK`, `WARN`, or `FAIL`
- Keep the output short and operational
- Highlight exact stale panes by session/pane id
- If `claude` resolves to a Windows shim before the WSL binary, call that out explicitly
- If MCP failures are likely caused by missing `cwd`, missing binaries, or dead SSE endpoints, say which ones
- End with:
  - one-line overall verdict
  - one shortest-next-step recommendation
  - pointer to `/status` for workspace state and `/maintenance-status` for storage hygiene

## Rules
- Prefer commands available in WSL first
- Do not change files automatically
- Do not restart tmux, Claude, or MCP services unless the user explicitly asks
