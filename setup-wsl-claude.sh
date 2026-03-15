#!/bin/bash

#############################################
# Claude Code WSL Setup Script
# Run this inside WSL Ubuntu terminal:
#   bash ~/.claude/setup-wsl-claude.sh
#############################################

set -e

echo "=========================================="
echo "  Claude Code WSL Setup"
echo "=========================================="
echo ""

# --- 1. Node.js (via NodeSource LTS) ---
echo "[1/7] Installing Node.js LTS..."
if command -v node &>/dev/null; then
  echo "  Node.js already installed: $(node --version)"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
  echo "  Installed: $(node --version)"
fi

# --- 2. Claude Code ---
echo ""
echo "[2/7] Installing Claude Code..."
if command -v claude &>/dev/null; then
  echo "  Claude Code already installed: $(claude --version 2>/dev/null || echo 'installed')"
else
  sudo npm install -g @anthropic-ai/claude-code
  echo "  Claude Code installed."
fi

# --- 3. Symlink ~/.claude → /mnt/c/Users/Hakan/.claude ---
echo ""
echo "[3/7] Setting up .claude symlink..."
WINDOWS_CLAUDE_DIR="/mnt/c/Users/Hakan/.claude"

if [ -L "$HOME/.claude" ]; then
  CURRENT_TARGET=$(readlink "$HOME/.claude")
  echo "  Symlink already exists: $HOME/.claude → $CURRENT_TARGET"
elif [ -d "$HOME/.claude" ]; then
  echo "  WARNING: $HOME/.claude is a directory (not a symlink)."
  echo "  Backing up to $HOME/.claude.bak and creating symlink..."
  mv "$HOME/.claude" "$HOME/.claude.bak"
  ln -s "$WINDOWS_CLAUDE_DIR" "$HOME/.claude"
  echo "  Symlink created: $HOME/.claude → $WINDOWS_CLAUDE_DIR"
else
  ln -s "$WINDOWS_CLAUDE_DIR" "$HOME/.claude"
  echo "  Symlink created: $HOME/.claude → $WINDOWS_CLAUDE_DIR"
fi

# Verify symlink
if [ -f "$HOME/.claude/settings.json" ]; then
  echo "  Verification: settings.json accessible via symlink ✓"
else
  echo "  WARNING: settings.json not found via symlink. Check path."
fi

# --- 4. tmux configuration ---
echo ""
echo "[4/7] Configuring tmux..."
if ! command -v tmux &>/dev/null; then
  sudo apt-get install -y tmux
fi

# Write tmux config
cat > "$HOME/.tmux.conf" << 'TMUXCONF'
# Claude Code tmux configuration

# Use 256 colors
set -g default-terminal "screen-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# Increase scrollback buffer
set -g history-limit 50000

# Enable mouse support (useful for split panes)
set -g mouse on

# Start window numbering at 1
set -g base-index 1
setw -g pane-base-index 1

# Faster escape time (better for Claude Code)
set -sg escape-time 10

# Status bar
set -g status-style bg=colour235,fg=colour136
set -g status-left '#[fg=colour46,bold] #S '
set -g status-right '#[fg=colour166] %Y-%m-%d %H:%M '
set -g status-left-length 30

# Pane border colors
set -g pane-border-style fg=colour240
set -g pane-active-border-style fg=colour46

# Activity monitoring
setw -g monitor-activity on
set -g visual-activity off

# Renumber windows when one is closed
set -g renumber-windows on
TMUXCONF
echo "  tmux configured: ~/.tmux.conf"

# --- 5. SSH Server ---
echo ""
echo "[5/7] Setting up SSH server..."
if ! dpkg -l openssh-server &>/dev/null 2>&1; then
  sudo apt-get install -y openssh-server
fi

# Ensure SSH is configured for password auth
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true
sudo sed -i 's/#Port 22/Port 22/' /etc/ssh/sshd_config 2>/dev/null || true

# Start SSH service
sudo service ssh start 2>/dev/null || sudo service sshd start 2>/dev/null || true
echo "  SSH server configured and started."
echo "  NOTE: WSL SSH may need to be restarted after Windows reboot:"
echo "    sudo service ssh start"

# --- 6. Tailscale ---
echo ""
echo "[6/7] Installing Tailscale..."
if command -v tailscale &>/dev/null; then
  echo "  Tailscale already installed."
else
  curl -fsSL https://tailscale.com/install.sh | sh
  echo "  Tailscale installed."
fi
echo ""
echo "  To activate Tailscale, run:"
echo "    sudo tailscale up"
echo "  Then install Tailscale on your phone and log in with the same account."

# --- 7. Verification ---
echo ""
echo "[7/7] Verification..."
echo "  Node.js: $(node --version 2>/dev/null || echo 'NOT FOUND')"
echo "  npm: $(npm --version 2>/dev/null || echo 'NOT FOUND')"
echo "  Claude Code: $(claude --version 2>/dev/null || echo 'NOT FOUND')"
echo "  tmux: $(tmux -V 2>/dev/null || echo 'NOT FOUND')"
echo "  SSH: $(ssh -V 2>&1 | head -1)"
echo "  Tailscale: $(tailscale version 2>/dev/null || echo 'NOT FOUND')"
echo "  Symlink: $(readlink "$HOME/.claude" 2>/dev/null || echo 'NOT A SYMLINK')"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Quick Start:"
echo "  1. Start tmux session:  tmux new -s claude"
echo "  2. Run Claude Code:     claude"
echo "  3. Detach from tmux:    Ctrl+B, then D"
echo "  4. Reattach later:      tmux attach -t claude"
echo ""
echo "Remote Access (from phone):"
echo "  1. Run: sudo tailscale up"
echo "  2. Install Tailscale on phone, same account"
echo "  3. From phone (Termius): ssh $(whoami)@<tailscale-ip>"
echo "  4. Reattach: tmux attach -t claude"
echo ""
