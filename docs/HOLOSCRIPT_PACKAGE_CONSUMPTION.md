# HoloScript Package Consumption - HoloLand

Status: active package-boundary decision.
Last reviewed: 2026-06-29.

## Decision

HoloLand does not need every HoloScript package.

HoloLand should consume a small, named HoloScript surface that supports the
builder-proof loop and enterprise gates:

```text
HoloScript source -> validation -> runtime/render projection -> interaction -> receipt
```

Additional HoloScript packages can be linked only when a specific HoloLand proof,
enterprise gate, HoloShell surface, or active deployment names them. Broad
`@holoscript/*` override lists are drift: they make old package gardening look
like active product work.

## Required Active Set

These packages are required by the current HoloLand reboot spine.

| Package | Class | Why HoloLand needs it |
| --- | --- | --- |
| `@holoscript/core` | source/runtime contract | Parser, AST, trait, runtime-visible contract, care/trust/robot source references, and broad legacy bridge dependency. |
| `@holoscript/cli` | validation tool | Local direct CLI entrypoint for native proof validation. This is a tool dependency, not a human package surface. |
| `@holoscript/framework` | enterprise/agent gate contract | Enterprise gate manifests, device safety envelopes, workflow admission, and HoloShell agent/receipt boundary references. |
| `@holoscript/agent-protocol` | agent protocol contract | Agent intent, handoff context, PWG/follow-up receipts, and headless agent examples. |
| `@holoscript/ui` | enterprise semantic UI contract | The customer-success enterprise package gate declares semantic room panels, action controls, and receipt panel projection. |

## Conditional Active Set

These packages are not universal HoloLand dependencies. They are allowed only
while their named lane is active.

| Package | Lane | Keep while |
| --- | --- | --- |
| `@holoscript/aibrittney` | HoloShell/Brittney | HoloShell maps upstream Brittney runtime events into avatar, shell, and operator receipts. |
| `@holoscript/runtime` | source-first examples / playground | `examples/fresh/**` and the old playground need runtime helpers until those examples graduate to current proof gates. |
| `@holoscript/std` | source-first examples | `examples/fresh/**` imports standard math/time/vector helpers. Keep as source-example support, not as a product-wide dependency. |

## Bridge Debt Set

These packages are consumed by legacy or bridge surfaces. They should not be
expanded unless the bridge has a current proof receipt.

| Package | Current consumer | Treatment |
| --- | --- | --- |
| `@holoscript/mvc-schema` | `packages/platform/renderer`, `packages/platform/services` | Bridge debt. Keep only while renderer/services remain active proof bridges. |
| `@holoscript/crdt` | `packages/platform/services` | Bridge debt. Keep only if services retain active deployment evidence. |
| `@holoscript/r3f-renderer` | `packages/adapters/react-three` | Bridge debt. Do not treat R3F compile as HoloLand theatre; keep only as a legacy adapter fixture or generated target proof. |

## Not Needed By Current HoloLand

The old package garden listed many HoloScript plugins and tooling packages as
overrides. Current code/package scans did not find active package declarations
for those packages in HoloLand. They should stay out of root dependencies unless
a new enterprise gate or proof lane names them.

Examples of packages not currently needed globally:

- `@holoscript/formatter`
- `@holoscript/fs`
- `@holoscript/linter`
- `@holoscript/lsp`
- `@holoscript/network`
- `@holoscript/auth`
- `@holoscript/engine`
- marketplace packages
- scientific/domain plugins
- industry vertical plugins
- `@holoscript/snn-webgpu`
- `@holoscript/registry`

If one of these becomes necessary, the rule is:

1. add or update the HoloScript source/enterprise gate that consumes it,
2. add the package to this document with a proof-loop reason,
3. add the narrow local override in `pnpm-workspace.yaml`,
4. run a receipt check that proves the package is used.

## Root Dependency Policy

The root `package.json` should declare only active proof/gate dependencies.
As of this review, that set is:

- `@holoscript/agent-protocol`
- `@holoscript/core`
- `@holoscript/framework`
- `@holoscript/ui`

`pnpm-workspace.yaml` may additionally override conditional/bridge packages so
legacy workspaces do not fetch HoloScript from npm during local validation.

## Local HoloLand Peer Policy

Private `@hololand/*` packages must use `workspace:*` for local peer links.
Semver peer ranges such as `^1.0.0` can cause pnpm to query npm before proof
scripts run. That is package-manager noise, not a HoloScript proof.

## Evidence

Read-only scans on 2026-06-29 found HoloScript declarations for:

- `@holoscript/agent-protocol`: 1 package declaration.
- `@holoscript/core`: 27 package declarations.
- `@holoscript/crdt`: 1 package declaration.
- `@holoscript/framework`: 1 package declaration.
- `@holoscript/mvc-schema`: 2 package declarations.
- `@holoscript/r3f-renderer`: 1 package declaration.
- `@holoscript/runtime`: 2 package declarations.

The customer-success enterprise gate declares:

- `@holoscript/core`
- `@holoscript/framework`
- `@holoscript/ui`
- `@holoscript/agent-protocol`

HoloShell source references `@holoscript/aibrittney` as an upstream runtime
contract. `examples/fresh/**` references `@holoscript/runtime` and
`@holoscript/std`.

Validation on 2026-06-29:

- `corepack pnpm@10.28.2 check:native-proof` passed with parser validation and
  local hardware receipt.
- `corepack pnpm@10.28.2 check:native-proof -- --skip-hardware` passed through
  the root wrapper, proving pnpm argument forwarding reaches the proof harness.
