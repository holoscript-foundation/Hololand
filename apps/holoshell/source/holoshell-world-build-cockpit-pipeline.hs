// HoloShell World Build Cockpit Pipeline
//
// Object-based .hs manifest for the non-developer world-build readiness loop.

object "WorldBuildCockpitPipelineManifest" {
  type: "pipeline_manifest"
  id: "holoshell-world-build-cockpit"
  workflow: "ready-to-build-hololand-world"
  defaultExecution: "read_only_preview"
  humanJob: "use local files, verify this computer, build a HoloLand preview, show what changed"
  roomSource: "apps/holoshell/source/holoshell-world-build-cockpit.holo"
  policySource: "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"
  outputEvidencePack: ".tmp/holoshell/world-build-cockpit.json"
  receiptRequired: true
}

object "HardwareAuditStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "hardware"
  order: 1
  adapter: "C:/Users/josep/.ai-ecosystem/scripts/codex-hardware-audit.mjs"
  command: "pnpm --dir C:/Users/josep/.ai-ecosystem check:codex-hardware"
  mutationClass: "none"
  validates: ["node", "pnpm", "wasm_simd", "gpu", "webgpu", "browser"]
  output: "CodexHardwareAuditReceipt"
}

object "WorktreeBoundaryStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "worktree_boundary"
  order: 2
  adapter: "git"
  commands: ["git -C C:/Users/josep/Documents/GitHub/HoloScript status --short", "git -C C:/Users/josep/Documents/GitHub/Hololand status --short"]
  mutationClass: "none"
  expectedHololandMutation: false
  output: "WorktreeBoundaryReceipt"
}

object "SourceParseStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "source_validation"
  order: 3
  adapter: "pnpm exec holoscript parse"
  mutationClass: "none"
  validates: ["apps/holoshell/source/holoshell-build-custody.hsplus", "apps/holoshell/source/holoshell-readiness-evidence.hsplus", "apps/holoshell/source/holoshell-visual-witness.hsplus", "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus", "apps/holoshell/source/holoshell-world-build-cockpit.holo", "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"]
  output: "SourceParseReceiptSet"
}

object "CodebaseGraphStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "codebase_graph"
  order: 4
  adapter: "mcp.holoscript.net:holo_graph_status"
  mutationClass: "none"
  authoritativeRequired: false
  warningWhen: "cache_stale || graphAuthoritative == false"
  output: "GraphUnavailableReceipt"
}

object "BuildCustodyStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "build_custody"
  order: 5
  adapter: "apps/holoshell/source/holoshell-build-custody.hsplus"
  mutationClass: "silent_read"
  directStopAllowed: false
  output: "BuildCustodyReceipt"
}

object "PreviewWitnessStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "preview_witness"
  order: 6
  adapter: "apps/holoshell/source/holoshell-visual-witness.hsplus"
  mutationClass: "guarded_preview"
  target: "HoloLand preview room"
  blocksPublishWhenMissing: true
  output: "VisualWitnessReceipt"
}

object "ReadinessReceiptStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "receipt"
  order: 7
  action: "merge_gate_receipts"
  output: "WorldBuildReadinessCockpitReceipt"
  readinessStates: ["ready", "ready_with_warnings", "blocked"]
  rollbackNoteRequired: true
  replayPlanRequired: true
}
