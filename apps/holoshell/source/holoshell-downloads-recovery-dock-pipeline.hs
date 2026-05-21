// HoloShell Downloads Recovery Dock data pipeline.
// Object-manifest form for HoloScript CLI validation.
// Extends downloads-import-shelf-pipeline with recovery-specific steps.

object "DownloadsRecoveryDockPipelineManifest" {
  type: "downloads_recovery_dock_pipeline_manifest"
  id: "holoshell-downloads-recovery-dock-pipeline"
  name: "HoloShell Downloads Recovery Dock Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-downloads-recovery-dock-room.holo"
  policySource: "apps/holoshell/source/holoshell-downloads-recovery-dock-policy.hsplus"
  shelfPipelineRef: "apps/holoshell/source/holoshell-downloads-import-shelf-pipeline.hs"
  receiptValidator: "packages/framework/src/board/holoshell-downloads-shelf-receipts.ts"
  evidencePack: "bench-logs/holoshell-human-os-frontier/downloads-recovery-dock-product-ratchet.md"
}

object "DownloadsRecoveryDockCommand" {
  type: "command_pipeline"
  commandId: "downloads_recovery_dock"
  naturalIntent: "See which downloads were interrupted or quarantined, resume or discard each one, and move verified files to the import shelf with receipts for every action."
  actor: "brittney"
  autonomyLevel: "read_only_by_default_guarded_resume_break_glass_discard"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["interrupted_downloads", "complete_downloads", "quarantined_downloads", "pending_consent_downloads", "import_shelf_handoff", "witness_strip", "replay"]
  pipeline: ["detect_interrupted", "check_completeness", "classify_lane", "resume_or_retry", "forensic_export_or_discard", "import_handoff", "witness_receipt", "replay"]
}

object "DetectInterruptedStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "detect_interrupted"
  order: 1
  action: "scan_for_interrupted_incomplete_and_quarantined_downloads"
  permissionEnvelope: "read_only"
  output: "DownloadShelfReceipt[]"
}

object "CheckCompletenessStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "check_completeness"
  order: 2
  action: "verify_integrity_badge_and_resume_capability"
  permissionEnvelope: "read_only"
  validates: ["integrityBadge", "resumeCapable", "lastChunkHash"]
  output: "DownloadShelfReceipt"
}

object "ClassifyLaneStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "classify_lane"
  order: 3
  action: "classify_download_into_recovery_lane"
  permissionEnvelope: "read_only"
  lanes: ["interrupted", "completeness", "retry", "quarantine", "import_shelf_handoff"]
  output: "DownloadShelfReceipt"
}

object "ResumeOrRetryStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "resume_or_retry"
  order: 4
  action: "resume_interrupted_or_retry_pending_consent_with_fresh_gesture"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  blockedAutomation: ["auto_resume", "silent_retry"]
  output: "DownloadShelfReceipt"
}

object "ForensicExportOrDiscardStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "forensic_export_or_discard"
  order: 5
  action: "export_quarantined_for_review_or_discard_interrupted"
  permissionEnvelope: "break_glass"
  requiresFreshUserGesture: true
  receiptRequired: true
  output: "recovery_witness_receipt"
}

object "ImportHandoffStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "import_handoff"
  order: 6
  action: "move_verified_complete_files_to_import_shelf"
  permissionEnvelope: "guarded_execute"
  requiresIntegrityBadge: "green"
  handoffTarget: "holoshell-downloads-import-shelf-room"
  output: "DownloadShelfReceipt"
}

object "WitnessReceiptStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "witness_receipt"
  order: 7
  action: "sign_and_anchor_witness_strip_entries_via_SubstrateMetadata"
  permissionEnvelope: "read_only"
  substrateMetadataAnchored: true
  output: "recovery_witness_receipt"
}

object "ReplayStep" {
  type: "pipeline_step"
  commandId: "downloads_recovery_dock"
  phase: "replay"
  order: 8
  action: "replay_from_witness_strip_and_receipt_hashes"
  permissionEnvelope: "read_only"
  replayStates: ["idle", "interrupted_detected", "completeness_checked", "resume_attempted", "forensic_exported", "quarantined", "import_handoff", "receipt_written"]
}