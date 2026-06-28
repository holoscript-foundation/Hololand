#!/usr/bin/env bash
# deploy-holoshell-to-jetson.sh
# Sync the HoloShell surface to the Jetson — the sovereign node that HOSTS Brittney
# Studio so the laptop/Quest are just SCREENS (founder 2026-06-17: "the laptop should
# be a screen for the jetson"). The Jetson serves it via systemd `holoshell-surface`
# (always-on, $0: brain + agents + surface all on the Jetson).
#
# WHY this is a file sync, not a build-on-the-Orin: aibrittney/dist and llm-provider/dist
# use ONLY node built-ins (the LLM-provider SDK adapters are dynamically `import()`-ed,
# loaded only if used), so the dists are platform-neutral JS. Build on the laptop, copy here.
#
# Prereqs (build on the laptop first):
#   pnpm --filter @holoscript/aibrittney build
#   pnpm --filter @holoscript/llm-provider build
#   node packages/holoshell/compile.mjs            # → dist/operate-room.html
# First-time setup of the systemd unit: scripts/holoshell-surface.service (install once, see its header).
#
# Usage:  bash scripts/deploy-holoshell-to-jetson.sh [--restart]
set -euo pipefail

KEY="${JETSON_KEY:-$HOME/.ssh/jetson_ed25519}"
J="${JETSON_HOST:-username@holojetson.local}"
HL="$(cd "$(dirname "$0")/.." && pwd)"
HS="${HOLOSCRIPT_REPO:-$(cd "$HL/../HoloScript" && pwd)}"
MODEL_LIBRARY="${HOLOSHELL_MODEL_LIBRARY_PATH:-$HOME/.ai-ecosystem/model-library/library.json}"
ROOT=/mnt/nvme/holo/holoscript-root          # HOLOSCRIPT_REPO on the Jetson (dists + brain)
SURF=/mnt/nvme/holo/holoshell-surface        # the serve + turn handler + html
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
  case "$NODE_BIN" in
    *node.exe)
      if command -v wslpath >/dev/null 2>&1; then
        wslpath -w "$1"
      elif command -v cygpath >/dev/null 2>&1; then
        cygpath -w "$1"
      else
        printf '%s' "$1"
      fi
      ;;
    *)
      printf '%s' "$1"
      ;;
  esac
}

echo "[deploy] HoloScript repo: $HS"
echo "[deploy] generating founder prompt fixtures ..."
"$NODE_BIN" "$(node_path "$HL/scripts/holoshell-founder-prompt-fixtures.mjs")" \
  --out "$(node_path "$FOUNDER_FIXTURE")" \
  --limit "${HOLOSHELL_FOUNDER_PROMPT_LIMIT:-48}" \
  --json >/dev/null

echo "[deploy] ensuring Jetson layout under /mnt/nvme/holo ..."
ssh -i "$KEY" "$J" "mkdir -p $SURF/packages/holoshell/dist $SURF/scripts $SURF/model-library $SURF/.tmp/holoshell $SURF/apps/holoshell/source $ROOT/packages/aibrittney $ROOT/packages/llm-provider $ROOT/compositions/skills"

echo "[deploy] syncing platform-neutral dists + brain + native resources + surface ..."
scp -i "$KEY" -q -r "$HS/packages/aibrittney/dist"     "$J:$ROOT/packages/aibrittney/"
scp -i "$KEY" -q -r "$HS/packages/llm-provider/dist"   "$J:$ROOT/packages/llm-provider/"
scp -i "$KEY" -q    "$HS/compositions/model-fleet.hsplus" "$J:$ROOT/compositions/"
scp -i "$KEY" -q -r "$HS/compositions/skills"          "$J:$ROOT/compositions/"
scp -i "$KEY" -q    "$HL/packages/holoshell/serve.mjs" "$J:$SURF/packages/holoshell/"
scp -i "$KEY" -q    "$HL/packages/holoshell/dist/operate-room.html" "$J:$SURF/packages/holoshell/dist/"
scp -i "$KEY" -q    "$HL/scripts/holoshell-brittney-turn.mjs" "$J:$SURF/scripts/"
scp -i "$KEY" -q    "$HL/scripts/holoshell-founder-prompt-fixtures.mjs" "$J:$SURF/scripts/"
scp -i "$KEY" -q    "$HL/apps/holoshell/source/holoshell-founder-prompt-fixtures.hsplus" "$J:$SURF/apps/holoshell/source/"
scp -i "$KEY" -q    "$FOUNDER_FIXTURE" "$J:$SURF/.tmp/holoshell/founder-prompt-fixtures.json"

if [ -f "$MODEL_LIBRARY" ]; then
  scp -i "$KEY" -q "$MODEL_LIBRARY" "$J:$SURF/model-library/library.json"
else
  echo "[deploy] model library not found at $MODEL_LIBRARY; live server will use installed Ollama list only"
fi

if [ "${1:-}" = "--restart" ]; then
  echo "[deploy] restarting holoshell-surface ..."
  ssh -i "$KEY" "$J" "sudo systemctl restart holoshell-surface && sleep 3 && echo active=\$(sudo systemctl is-active holoshell-surface)"
fi
echo "[deploy] done → http://holojetson.local:8747  (the laptop just opens this; see scripts/brittney-studio-launch.ps1)"
