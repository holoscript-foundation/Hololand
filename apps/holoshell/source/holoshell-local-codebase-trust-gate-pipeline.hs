// HoloShell Local Codebase Trust Gate Pipeline
//
// Object manifest for turning local repo codebase intelligence into a visible,
// deterministic, replayable readiness input.

object "LocalCodebaseTrustPipelineManifest" {
  type: "pipeline_manifest"
  id: "holoshell-local-codebase-trust-gate"
  workflow: "ready-to-build-hololand-world"
  defaultExecution: "read_only"
  humanJob: "know whether codebase facts came from this computer before claiming HoloLand world-build readiness"
  roomSource: "apps/holoshell/source/holoshell-local-codebase-trust-gate-room.holo"
  policySource: "apps/holoshell/source/holoshell-local-codebase-trust-gate-policy.hsplus"
  outputEvidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-20/local-codebase-trust-evidence-pack.md"
  receiptRequired: true
}

object "GraphStatusStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "graph_status"
  order: 0
  adapter: "mcp.holoscript.net:holo_graph_status"
  mutationClass: "none"
  warningWhen: "cache_stale || graphAuthoritative == false || runtime_namespace_mismatch"
  output: "GraphUnavailableReceipt"
}

object "RootAbsorbAttemptStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "root_absorb_attempt"
  order: 1
  adapter: "mcp.holoscript.net:holo_absorb_repo"
  rootDirs: ["C:/Users/josep/Documents/GitHub/HoloScript", "C:/Users/josep/Documents/GitHub/Hololand"]
  mutationClass: "none"
  expectedFailureWhen: "mcp_runtime_cannot_see_windows_roots"
  output: "GraphUnavailableReceipt"
}

object "LocalSourceFilesBundleStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "local_source_files_bundle"
  order: 2
  adapter: "proposed:scripts/holoshell-local-codebase-absorb-bundle.mjs"
  mutationClass: "none"
  inputs: ["HoloScript selected source", "HoloLand selected source"]
  excludes: [".git", "node_modules", "dist", "build", ".tmp", ".env", "secrets", "browser profiles"]
  validates: ["relative_paths_only", "content_hashes", "byte_cap", "file_cap", "redaction_pass"]
  output: "LocalCodebaseSnapshotReceipt"
}

object "SourceFilesAbsorbStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "source_files_absorb"
  order: 3
  adapter: "mcp.holoscript.net:holo_absorb_repo"
  payload: "sourceFiles from LocalCodebaseSnapshotReceipt"
  mutationClass: "guarded_execute"
  authoritativeWhen: "sourceFiles accepted && replay hash matches && graph freshness is current"
  output: "CodebaseAbsorbReplayReceipt"
}

object "ReadinessClaimStep" {
  type: "pipeline_step"
  workflow: "ready-to-build-hololand-world"
  phase: "readiness_claim"
  order: 4
  action: "merge_graph_bundle_and_absorb_replay"
  output: "CodebaseTrustReceipt"
  readinessStates: ["trusted", "trusted_from_source_files", "warning", "blocked"]
  blocksFlagshipWhen: ["warning", "blocked"]
  replayPlanRequired: true
}
