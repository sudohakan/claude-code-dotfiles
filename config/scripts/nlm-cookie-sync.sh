#!/bin/bash
# Sync NotebookLM cookies from Windows to WSL
SRC="/mnt/c/Users/Hakan/.notebooklm-mcp-cli/profiles/default"
DST="/home/hakan/.notebooklm-mcp-cli/profiles/default"
if [ -f "$SRC/cookies.json" ]; then
    cp "$SRC/cookies.json" "$DST/cookies.json" 2>/dev/null
    cp "$SRC/metadata.json" "$DST/metadata.json" 2>/dev/null
fi
