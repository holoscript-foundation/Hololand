// HoloShell partial-download recovery data pipeline.
// Object-manifest form is used so the local HoloScript CLI can validate it.

object "PartialDownloadRecoveryPipelineManifest" {
  type: "partial_download_recovery_pipeline_manifest"
  id: "holoshell-partial-download-recovery-pipeline"
  name: "HoloShell Partial Download Recovery Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-partial-download-recovery-room.holo"
  policySource: "apps/holoshell/source/holoshell-partial-download-recovery-policy.hsplus"
  parentWorkflow: "apps/holoshell/source/holoshell-downloads-import-shelf-pipeline.hs"
  evidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-recovery-evidence-pack.md"
}

object "PartialDownloadRecoveryCommand" {
  type: "command_pipeline"
  commandId: "partial_download_recovery"
  naturalIntent: "Recover a failed or partial download, verify whether it is complete, retry safely, and hand off only verified files to HoloLand."
  actor: "brittney"
  autonomyLevel: "read_only_by_default_guarded_retry_break_glass_delete_or_execute"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["downloads_folder", "browser_download_history", "partial_files", "duplicate_groups", "range_hashes", "archive_integrity", "retry_plan", "quarantine", "import_shelf", "discard_receipts", "holomesh_tasks"]
  pipeline: ["root_selection", "partial_detection", "evidence_freeze", "completeness_validation", "retry_plan", "guarded_retry", "quarantine", "import_shelf_handoff", "discard_receipt", "task_file", "replay"]
}

object "RootSelectionStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "root_selection"
  order: 1
  action: "select_approved_local_roots_and_browser_download_state"
  permissionEnvelope: "read_only"
  allowedRoots: ["Downloads", "browser download cache", "Desktop drop zone"]
  privateAbsolutePathPolicy: "private_receipt_only"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-root-selection.json"
}

object "PartialDetectionStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "partial_detection"
  order: 2
  action: "detect_partial_downloads_without_opening_private_content"
  permissionEnvelope: "read_only"
  validates: ["crdownload", "part", "tmp", "download_lock", "mtime_still_changing", "public_path_redaction"]
  output: "PartialFileReceipt"
}

object "EvidenceFreezeStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "evidence_freeze"
  order: 3
  action: "hash_existing_bytes_and_record_file_lock_state"
  permissionEnvelope: "read_only"
  validates: ["byte_count", "range_hash", "mtime", "lock_owner_known", "source_url_redacted"]
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-evidence-freeze.json"
}

object "CompletenessValidationStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "completeness_validation"
  order: 4
  action: "prove_completeness_before_rename_import_or_delete"
  permissionEnvelope: "read_only"
  validates: ["expected_size", "actual_size", "final_hash", "archive_open_test", "checksum_or_signature_when_available"]
  unsafeAssumptionRejected: "extension_rename_means_complete"
  output: "DownloadIntegrityReceipt"
}

object "RetryPlanStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "retry_plan"
  order: 5
  action: "create_safe_retry_or_discard_plan"
  permissionEnvelope: "read_only"
  planTypes: ["resume_range_download", "restart_to_quarantine", "keep_failed_bytes", "discard_stale_partial", "compare_duplicate_complete_file"]
  networkMutationExecuted: false
  output: "RetryPlanReceipt"
}

object "GuardedRetryStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "guarded_retry"
  order: 6
  action: "execute_retry_only_after_nonce_bound_approval"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  overwriteAllowed: false
  writesToQuarantineFirst: true
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-retry-receipt.json"
}

object "QuarantineStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "quarantine"
  order: 7
  action: "hold_unverified_or_recovered_files_behind_preview_only_gate"
  permissionEnvelope: "guarded_execute"
  executableLaunchAllowed: false
  autoExtractAllowed: false
  rawPrivateDataPublished: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-quarantine-receipt.json"
}

object "ImportShelfHandoffStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "import_shelf_handoff"
  order: 8
  action: "handoff_verified_complete_files_to_downloads_import_shelf"
  permissionEnvelope: "guarded_execute"
  requires: ["verified_complete", "public_path_redacted", "preview_safe", "final_hash"]
  sourceFileMutationPerformed: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-import-handoff.json"
}

object "DiscardReceiptStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "discard_receipt"
  order: 9
  action: "discard_stale_partial_only_after_exact_confirmation"
  permissionEnvelope: "break_glass"
  requiresFreshUserGesture: true
  rollbackScope: "recycle bin when available; permanent delete requires separate receipt"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-discard-receipt.json"
}

object "TaskFileStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "task_file"
  order: 10
  adapter: "C:/Users/josep/.ai-ecosystem/scripts/room-add-tasks.mjs"
  action: "file_gap_tasks"
  permissionEnvelope: "guarded_execute"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/partial-download-recovery-holomesh-tasks.json"
}

object "ReplayStep" {
  type: "pipeline_step"
  commandId: "partial_download_recovery"
  phase: "replay"
  order: 11
  action: "replay_from_root_hash_partial_hashes_retry_plan_hash_final_hash_and_decision_receipt"
  permissionEnvelope: "read_only"
  replayStates: ["detected", "evidence_frozen", "completeness_checked", "retry_planned", "quarantined", "handoff_ready", "receipt_written"]
}
