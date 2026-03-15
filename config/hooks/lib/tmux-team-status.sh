#!/usr/bin/env bash
# tmux-team-status.sh — Lightweight agent teams status for tmux status bar
# Called by tmux via #(~/.claude/hooks/lib/tmux-team-status.sh)
# Updates every status-interval (10s recommended)
# Output: "team-name | N agents | X/Y done | Nm" or empty if no active team

set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
TEAMS_DIR="${CLAUDE_DIR}/teams"
TASKS_DIR="${CLAUDE_DIR}/tasks"

# Find the most recently modified team config (= active team)
latest_config=""
latest_mtime=0

for cfg in "${TEAMS_DIR}"/*/config.json; do
  [ -f "$cfg" ] || continue
  # Use stat for mtime (GNU/Linux)
  mtime=$(stat -c '%Y' "$cfg" 2>/dev/null || stat -f '%m' "$cfg" 2>/dev/null || echo 0)
  if [ "$mtime" -gt "$latest_mtime" ]; then
    latest_mtime=$mtime
    latest_config=$cfg
  fi
done

# No active team — output nothing
[ -z "$latest_config" ] && exit 0

# Check if team has active members (at least one isActive: true)
if ! grep -q '"isActive": true' "$latest_config" 2>/dev/null; then
  exit 0
fi

# Parse team name
team_name=$(grep -o '"name": *"[^"]*"' "$latest_config" | head -1 | sed 's/"name": *"//;s/"//')
[ -z "$team_name" ] && exit 0

# Count active agents (isActive: true)
agent_count=$(grep -c '"isActive": true' "$latest_config" 2>/dev/null || echo 0)

# Find task directory — match by team name first, then by team directory name
task_dir=""
team_dir_name=$(basename "$(dirname "$latest_config")")

# Try exact team name match first
if [ -d "${TASKS_DIR}/${team_dir_name}" ]; then
  task_dir="${TASKS_DIR}/${team_dir_name}/"
# Fallback: try team name from config
elif [ -d "${TASKS_DIR}/${team_name}" ]; then
  task_dir="${TASKS_DIR}/${team_name}/"
fi

# Count tasks by status
total=0
completed=0
blocked=0

if [ -n "$task_dir" ] && [ -d "$task_dir" ]; then
  for tf in "${task_dir}"/*.json; do
    [ -f "$tf" ] || continue
    total=$((total + 1))
    status=$(grep -o '"status": *"[^"]*"' "$tf" 2>/dev/null | head -1 | sed 's/"status": *"//;s/"//')
    case "$status" in
      completed) completed=$((completed + 1)) ;;
    esac
    # Check if blocked (blockedBy has non-empty array)
    if grep -qP '"blockedBy":\s*\[[^\]]+\]' "$tf" 2>/dev/null; then
      blocked=$((blocked + 1))
    fi
  done
fi

# Calculate team uptime from createdAt in config
created_at=$(grep -o '"createdAt": *[0-9]*' "$latest_config" | head -1 | sed 's/"createdAt": *//')
duration=""
if [ -n "$created_at" ]; then
  now_ms=$(($(date +%s) * 1000))
  elapsed_ms=$((now_ms - created_at))
  elapsed_s=$((elapsed_ms / 1000))
  if [ "$elapsed_s" -lt 60 ]; then
    duration="${elapsed_s}s"
  elif [ "$elapsed_s" -lt 3600 ]; then
    duration="$((elapsed_s / 60))m"
  else
    hours=$((elapsed_s / 3600))
    mins=$(((elapsed_s % 3600) / 60))
    if [ "$mins" -gt 0 ]; then
      duration="${hours}h${mins}m"
    else
      duration="${hours}h"
    fi
  fi
fi

# Build output
output="${team_name} | ${agent_count} agents | ${completed}/${total} done"

# Add blocked count if any
if [ "$blocked" -gt 0 ]; then
  output="${output} | ${blocked} blocked"
fi

# Add duration
if [ -n "$duration" ]; then
  output="${output} | ${duration}"
fi

echo "$output"
