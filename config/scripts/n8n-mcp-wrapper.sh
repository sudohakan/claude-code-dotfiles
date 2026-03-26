#!/bin/bash
ENV_FILE="/mnt/c/dev/n8n/.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  while IFS='=' read -r key value; do
    key=$(echo "$key" | tr -d '\r')
    value=$(echo "$value" | tr -d '\r')
    [[ -z "$key" || "$key" == \#* ]] && continue
    export "$key=$value"
  done < "$ENV_FILE"
  set +a
fi
export N8N_API_URL="${N8N_API_URL:-http://localhost:5678}"
export MCP_MODE="stdio"
export DISABLE_CONSOLE_OUTPUT="true"
export LOG_LEVEL="error"
exec npx -y n8n-mcp@latest
