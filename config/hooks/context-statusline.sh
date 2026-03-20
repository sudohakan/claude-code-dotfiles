#!/bin/bash
# Simple statusline: shows context window usage percentage
# Input: JSON on stdin with context_window.context_window_size and transcript_path

INPUT=$(cat)
SIZE=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('context_window',{}).get('context_window_size',0))" 2>/dev/null)
TRANSCRIPT=$(echo "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('transcript_path',''))" 2>/dev/null)

if [ "$SIZE" = "0" ] || [ -z "$SIZE" ]; then
  echo "ctx: ?"
  exit 0
fi

# Read transcript JSONL to get token usage from most recent message
if [ -n "$TRANSCRIPT" ] && [ -f "$TRANSCRIPT" ]; then
  USED=$(tail -50 "$TRANSCRIPT" 2>/dev/null | python3 -c "
import json, sys
total = 0
for line in sys.stdin:
    line = line.strip()
    if not line: continue
    try:
        obj = json.loads(line)
        usage = obj.get('usage', {})
        if usage:
            total = usage.get('input_tokens', 0) + usage.get('output_tokens', 0) + usage.get('cache_read_input_tokens', 0) + usage.get('cache_creation_input_tokens', 0)
    except: pass
print(total)
" 2>/dev/null)
else
  USED=0
fi

if [ "$USED" = "0" ] || [ -z "$USED" ]; then
  echo "ctx: ~0%"
  exit 0
fi

PCT=$(python3 -c "print(round($USED / $SIZE * 100))" 2>/dev/null)
echo "ctx: ${PCT}%"
