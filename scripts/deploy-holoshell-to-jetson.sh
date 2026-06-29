#!/usr/bin/env bash
# deploy-holoshell-to-jetson.sh
# Sync the HoloShell surface to the Jetson, the sovereign node that HOSTS
# Brittney Studio so the laptop/Quest are just screens. The Jetson serves it via
# systemd `holoshell-surface` (always-on, $0: brain + agents + surface all on the
# Jetson).
#
# Build on the laptop first:
#   pnpm --filter @holoscript/aibrittney build
#   pnpm --filter @holoscript/llm-provider build
#   node packages/holoshell/compile.mjs
#
# Usage: bash scripts/deploy-holoshell-to-jetson.sh [--restart]
set -euo pipefail

windows_home() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command '[Environment]::GetFolderPath("UserProfile")' 2>/dev/null | tr -d '\r'
  fi
}

host_resolves() {
  local host="$1"
  if command -v getent >/dev/null 2>&1 && getent hosts "$host" >/dev/null 2>&1; then
    return 0
  fi
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command "try { [Net.Dns]::GetHostAddresses('$host') | Out-Null; exit 0 } catch { exit 1 }" >/dev/null 2>&1
    return $?
  fi
  return 1
}

prefer_windows_openssh() {
  case "$(uname -s 2>/dev/null || true)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
  esac
  if grep -qi microsoft /proc/version 2>/dev/null && command -v ssh.exe >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

resolve_bin() {
  local configured="$1"
  local windows_name="$2"
  local posix_name="$3"
  local env_name="$4"
  if [ -n "$configured" ]; then
    printf '%s' "$configured"
  elif prefer_windows_openssh && command -v "$windows_name" >/dev/null 2>&1; then
    printf '%s' "$windows_name"
  elif command -v "$posix_name" >/dev/null 2>&1; then
    printf '%s' "$posix_name"
  elif command -v "$windows_name" >/dev/null 2>&1; then
    printf '%s' "$windows_name"
  else
    echo "[deploy] $posix_name not found on PATH (set $env_name=/path/to/$posix_name)" >&2
    exit 1
  fi
}

uses_windows_exe() {
  case "$(basename "$1" | tr '[:upper:]' '[:lower:]')" in
    *.exe) return 0 ;;
    *) return 1 ;;
  esac
}

tool_path() {
  local path_value="$1"
  if uses_windows_exe "$SCP_BIN" || uses_windows_exe "$NODE_BIN"; then
    if command -v wslpath >/dev/null 2>&1; then
      wslpath -w "$path_value"
      return
    elif command -v cygpath >/dev/null 2>&1; then
      cygpath -w "$path_value"
      return
    fi
  fi
  printf '%s' "$path_value"
}

key_path() {
  if [ -n "${JETSON_KEY:-}" ]; then
    printf '%s' "$JETSON_KEY"
    return
  fi
  if uses_windows_exe "$SSH_BIN"; then
    local wh
    wh="$(windows_home || true)"
    if [ -n "$wh" ]; then
      printf '%s\\.ssh\\jetson_ed25519' "$wh"
      return
    fi
  fi
  local wh
  wh="$(windows_home || true)"
  if [ -n "$wh" ] && command -v wslpath >/dev/null 2>&1; then
    wslpath -u "$wh\\.ssh\\jetson_ed25519"
    return
  fi
  printf '%s/.ssh/jetson_ed25519' "$HOME"
}

jetson_target() {
  if [ -n "${JETSON_HOST:-}" ]; then
    case "$JETSON_HOST" in
      *@*) printf '%s' "$JETSON_HOST" ;;
      *) printf '%s@%s' "${JETSON_USER:-username}" "$JETSON_HOST" ;;
    esac
    return
  fi
  local host="holojetson.local"
  if ! host_resolves "$host"; then
    host="${JETSON_IP:-192.168.0.119}"
  fi
  printf '%s@%s' "${JETSON_USER:-username}" "$host"
}

SSH_BIN="$(resolve_bin "${SSH_BIN:-}" ssh.exe ssh SSH_BIN)"
SCP_BIN="$(resolve_bin "${SCP_BIN:-}" scp.exe scp SCP_BIN)"
KEY="$(key_path)"
J="$(jetson_target)"
HL="$(cd "$(dirname "$0")/.." && pwd)"
HS="${HOLOSCRIPT_REPO:-$(cd "$HL/../HoloScript" && pwd)}"
MODEL_LIBRARY="${HOLOSHELL_MODEL_LIBRARY_PATH:-$HOME/.ai-ecosystem/model-library/library.json}"
ROOT=/mnt/nvme/holo/holoscript-root
SURF=/mnt/nvme/holo/holoshell-surface
FOUNDER_FIXTURE="$HL/.tmp/holoshell/founder-prompt-fixtures.json"
NODE_BIN="${NODE_BIN:-}"

if [ -z "$NODE_BIN" ]; then
  if command -v node >/dev/null 2>&1; then
    NODE_BIN=node
  elif command -v node.exe >/dev/null 2>&1; then
    NODE_BIN=node.exe
  else
    echo "[deploy] node not found on PATH (set NODE_BIN=/path/to/node)" >&2
    exit 1
  fi
fi

node_path() {
  tool_path "$1"
}

SSH_KEY="$(tool_path "$KEY")"
SSH_OPTS=(-i "$SSH_KEY" -o BatchMode=yes -o "ConnectTimeout=${JETSON_SSH_CONNECT_TIMEOUT:-10}" -o StrictHostKeyChecking=accept-new)

echo "[deploy] HoloScript repo: $HS"
echo "[deploy] Jetson target: $J"
echo "[deploy] ssh: $SSH_BIN | scp: $SCP_BIN | key: <configured>"
echo "[deploy] generating founder prompt fixtures ..."
"$NODE_BIN" "$(node_path "$HL/scripts/holoshell-founder-prompt-fixtures.mjs")" \
  --out "$(node_path "$FOUNDER_FIXTURE")" \
  --limit "${HOLOSHELL_FOUNDER_PROMPT_LIMIT:-48}" \
  --json >/dev/null

echo "[deploy] ensuring Jetson layout under /mnt/nvme/holo ..."
"$SSH_BIN" "${SSH_OPTS[@]}" "$J" "mkdir -p $SURF/packages/holoshell/dist $SURF/scripts $SURF/model-library $SURF/.tmp/holoshell $SURF/apps/holoshell/source $ROOT/packages/aibrittney $ROOT/packages/llm-provider $ROOT/compositions/skills"

echo "[deploy] syncing platform-neutral dists + brain + native resources + surface ..."
"$SCP_BIN" "${SSH_OPTS[@]}" -q -r "$(tool_path "$HS/packages/aibrittney/dist")" "$J:$ROOT/packages/aibrittney/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q -r "$(tool_path "$HS/packages/llm-provider/dist")" "$J:$ROOT/packages/llm-provider/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HS/compositions/model-fleet.hsplus")" "$J:$ROOT/compositions/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q -r "$(tool_path "$HS/compositions/skills")" "$J:$ROOT/compositions/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/packages/holoshell/serve.mjs")" "$J:$SURF/packages/holoshell/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/packages/holoshell/dist/operate-room.html")" "$J:$SURF/packages/holoshell/dist/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/scripts/holoshell-brittney-turn.mjs")" "$J:$SURF/scripts/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/scripts/holoshell-agent-dispatch.mjs")" "$J:$SURF/scripts/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/scripts/holoshell-founder-prompt-fixtures.mjs")" "$J:$SURF/scripts/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/apps/holoshell/source/holoshell-founder-prompt-fixtures.hsplus")" "$J:$SURF/apps/holoshell/source/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$HL/apps/holoshell/source/holoshell-agent-dispatch.hsplus")" "$J:$SURF/apps/holoshell/source/"
"$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$FOUNDER_FIXTURE")" "$J:$SURF/.tmp/holoshell/founder-prompt-fixtures.json"

if [ -f "$MODEL_LIBRARY" ]; then
  "$SCP_BIN" "${SSH_OPTS[@]}" -q "$(tool_path "$MODEL_LIBRARY")" "$J:$SURF/model-library/library.json"
else
  echo "[deploy] model library not found at $MODEL_LIBRARY; live server will use installed Ollama list only"
fi

if [ "${1:-}" = "--restart" ]; then
  echo "[deploy] restarting holoshell-surface ..."
  "$SSH_BIN" "${SSH_OPTS[@]}" "$J" "sudo -n systemctl restart holoshell-surface && sleep 3 && echo active=\$(sudo systemctl is-active holoshell-surface)"
fi

echo "[deploy] done -> http://holojetson.local:8747 (the laptop just opens this; see scripts/brittney-studio-launch.ps1)"
