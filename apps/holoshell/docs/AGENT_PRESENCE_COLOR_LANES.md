# Agent Presence Color Lanes

**Status:** HoloShell bridge design
**Date:** 2026-05-12
**Source:** `apps/holoshell/source/holoshell-agent-presence-lanes.hsplus`
**Discovery adapter:** `scripts/holoshell-agent-lanes.mjs`
**Grok heartbeat adapter:** `scripts/holoshell-grok-heartbeat.mjs`

## Decision

The more agents are active on the hardware, the more HoloShell should know.

Codex in the hardware shell, Claude Desktop, Claude Code or Cursor, Gemini in
Antigravity, Copilot in VS Code, Grok Build, plain local shells, and HoloMesh
team presence should all appear as agent lanes. A lane is not just decoration. It is an
operational object with identity, surface, scope, color, current action, and
receipt trail.

## Can Agents See Color?

Sometimes, but color is not reliable enough to be the source of truth.

Text-only agents usually receive either plain text, stripped terminal output, or
literal ANSI escape sequences. They can reason over `\u001b[38;5;33m` if it is
preserved, but they do not inherently experience it as blue.

Browser and desktop agents may inspect rendered color through screenshots, DOM
styles, or accessibility trees, but that depends on the tool and surface.

HoloShell should therefore render color for humans and expose semantic lane data
for agents:

```json
{
  "laneId": "codex-hardware",
  "agentKind": "codex",
  "surfaceKind": "hardware_shell",
  "color": { "hex": "#0087D7", "ansiSgr": "38;5;33" },
  "semanticPrefix": "[lane:codex-hardware agent:codex surface:hardware_shell]"
}
```

The visible color helps the user scan the room. The `laneId` and receipt
metadata are what agents trust.

## Lane Table

| Lane | Surface | Human color | ANSI | Purpose |
| --- | --- | --- | --- | --- |
| `codex-hardware` | Hardware shell | `#0087D7` | `38;5;33` | Local execution, build proof, hardware validation. |
| `claude-desktop` | Desktop app | `#D97706` | `38;5;208` | Reasoning partner and broad task framing. |
| `claude-code` | IDE | `#7C3AED` | `38;5;99` | Deep codebase refactors and long-context edits. |
| `gemini-antigravity` | Browser/vision | `#10B981` | `38;5;35` | Multimodal browser and visual verification. |
| `copilot-vscode` | IDE completion | `#84CC16` | `38;5;112` | Inline acceleration and local edit suggestions. |
| `local-shell` | Terminal | `#EAB308` | `38;5;220` | Plain command execution and script adapters. |
| `grok-build` | Local coding agent | `#F43F5E` | `38;5;203` | Peer coding-agent critique, build inspection, and HoloShell workflow observations. |
| `holomesh-team` | Network presence | `#EC4899` | `38;5;205` | Team board, messages, knowledge, and task state. |

## Instance Rule

Each active agent instance should receive a stable lane identity. The lane family
comes from the agent and surface kind. The instance shade, pattern, or suffix
comes from the agent instance id when available.

Examples:

- `codex-hardware:josep-main`
- `claude-code:cursor-west-pane`
- `gemini-antigravity:browser-audit`
- `shell:pwsh-build-runner`

If HoloMesh provides a registered agent id, that id wins. If not, HoloShell may
fall back to local process evidence and session labels.

## HoloShell Behavior

HoloShell should use active lane count as a capability signal. More live lanes
means more available operating modes:

- Codex lane active: local build, hardware, filesystem, WASM, and GPU proof.
- Claude lane active: deep reasoning and long-context planning.
- Gemini/Antigravity lane active: visual and browser witness paths.
- Grok Build lane active: xAI coding-agent critique and peer observations.
- Shell lane active: direct command adapter available.
- HoloMesh lane active: team state and receipts available.

The user should see a calm lane stack: who is present, what each lane is doing,
what permissions it has, and what receipts prove its work. The user should not
need to know which terminal, IDE, app, or command created the signal.

## Rules

1. Color is a visual hint, not a trust boundary.
2. Every colored message must also carry `laneId`, `agentKind`, `surfaceKind`,
   and `semanticPrefix`.
3. Receipts record the lane that acted.
4. Mutating work records permission envelope and receipt id.
5. Accessibility requires text labels and pattern/icon support; color alone is
   insufficient.
6. HoloMesh presence can merge remote/team agents into the same lane grammar.

## First Adapter

Run:

```powershell
node scripts\holoshell-agent-lanes.mjs --self-test
```

This writes:

```text
.tmp/holoshell/agent-lanes.json
```

For Grok Heavy, also run:

```powershell
node scripts\holoshell-grok-heartbeat.mjs --refresh-agent-lanes
```

This writes `.tmp/holoshell/grok-heartbeat.json` and merges the live Grok
status, Heavy availability, and latest observation into the `grok-build` lane.

To refresh the actual Grok CLI auth/model/project-trust probe first, use:

```powershell
node scripts\holoshell-grok-heartbeat.mjs --refresh-setup --refresh-agent-lanes
```

That path calls the Grok Build setup adapter, records whether the local CLI is
authenticated with `grok.com`, whether `grok-build` is available, and whether
the repository is trusted for autonomous hook reliance. A live Grok login is
operator presence. It is not permission to mutate the repo; Grok launch and
headless prompts still require the workflow approval bundle.

The output is local runtime evidence and should not be committed unless it is
redacted and converted into a sample.

## Upstream Candidates

If the lane grammar stabilizes, upstream these to HoloScript and HoloMesh:

- `AgentPresence` schema.
- `AgentLane` schema.
- `LaneReceipt` schema.
- Stable color assignment from agent identity.
- HoloMesh presence feed fields for `laneId`, `surfaceKind`, and `colorHint`.
