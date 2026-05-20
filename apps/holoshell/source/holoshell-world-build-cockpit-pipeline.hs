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
  localFileManifestSource: "apps/holoshell/source/holoshell-local-file-manifest.hsplus"
  codexHardwareAuditSource: "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus"
  sourceValidationSource: "apps/holoshell/source/holoshell-source-validation.hsplus"
  buildCustodySource: "apps/holoshell/source/holoshell-build-custody.hsplus"
  hardwareRealitySource: "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus"
  visualWitnessSource: "apps/holoshell/source/holoshell-visual-witness.hsplus"
  agentLaneSource: "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
  localCodebaseBundleAdapter: "scripts/holoshell-local-codebase-absorb-bundle.mjs"
  outputEvidencePack: ".tmp/holoshell/world-build-cockpit.json"
  receiptRequired: true
}

object "LocalFileManifestStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "local_files"
  order: 0
  adapter: "apps/holoshell/source/holoshell-local-file-manifest.hsplus"
  mutationClass: "none"
  validates: ["local_directories", "sensitive_path_redaction", "duplicate_asset_detection"]
  output: "LocalFileManifestReceipt"
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

object "LocalCodebaseBundleStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "local_codebase_bundle"
  order: 5
  adapter: "scripts/holoshell-local-codebase-absorb-bundle.mjs"
  command: "node scripts/holoshell-local-codebase-absorb-bundle.mjs --root C:/Users/josep/Documents/GitHub/HoloScript --root C:/Users/josep/Documents/GitHub/Hololand --json"
  mutationClass: "none"
  validates: ["relative_paths_only", "content_hashes", "secret_adjacent_exclusion", "byte_cap", "file_cap"]
  output: "HoloShellLocalCodebaseSnapshotReceipt"
}

object "SourceFilesAbsorbReplayStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "source_files_absorb_replay"
  order: 6
  adapter: "mcp.holoscript.net:holo_absorb_repo"
  mutationClass: "guarded_execute"
  input: "sourceFiles from HoloShellLocalCodebaseSnapshotReceipt"
  warningWhen: "hosted graph stays non_authoritative"
  output: "CodebaseAbsorbReplayReceipt"
}

object "BuildCustodyStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "build_custody"
  order: 7
  adapter: "apps/holoshell/source/holoshell-build-custody.hsplus"
  mutationClass: "silent_read"
  directStopAllowed: false
  output: "BuildCustodyReceipt"
}

object "PreviewWitnessStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "preview_witness"
  order: 8
  adapter: "apps/holoshell/source/holoshell-visual-witness.hsplus"
  mutationClass: "guarded_preview"
  target: "HoloLand preview room"
  blocksPublishWhenMissing: true
  output: "VisualWitnessReceipt"
}

object "AgentLaneStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "agent_orchestra"
  order: 9
  adapter: "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
  mutationClass: "none"
  validates: ["lane_attribution", "unattributed_shell_run_detection", "duplicate_task_detection"]
  output: "AgentLaneReceipt"
}

object "ReadinessReceiptStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "receipt"
  order: 10
  action: "merge_gate_receipts"
  output: "WorldBuildReadinessCockpitReceipt"
  readinessStates: ["ready", "ready_with_warnings", "blocked"]
  rollbackNoteRequired: true
  replayPlanRequired: true
}
