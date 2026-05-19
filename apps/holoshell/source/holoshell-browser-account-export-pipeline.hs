// HoloShell browser account export data pipeline.
// Object-manifest form is used so the local HoloScript CLI can validate it.

object "BrowserAccountExportPipelineManifest" {
  type: "browser_account_export_pipeline_manifest"
  id: "holoshell-browser-account-export-pipeline"
  name: "HoloShell Browser Account Export Pipeline"
  version: "0.3.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-browser-account-export-room.holo"
  policySource: "apps/holoshell/source/holoshell-browser-account-export-policy.hsplus"
  accountTaskSource: "apps/holoshell/source/holoshell-account-task-custody.hsplus"
  hardwareControlSource: "apps/holoshell/source/holoshell-hardware-control.hsplus"
  providerExportCustodySource: "packages/core/src/trust/ProviderExportCustodyReceipt.ts"
  userPackSource: "apps/holoshell/source/holoshell-account-export-user-pack.hsplus"
  userRoomSource: "apps/holoshell/source/holoshell-account-export-user-room.holo"
  evidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-evidence-pack.md"
}

object "BrowserAccountExportCommand" {
  type: "command_pipeline"
  commandId: "browser_account_export"
  naturalIntent: "Export my account data from a browser or provider, save it locally, verify what changed, and keep private data contained."
  actor: "brittney"
  autonomyLevel: "break_glass_for_account_mutation"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["browser_profile", "provider_account", "export_request", "provider_wait", "download_folder", "quarantine", "visual_summary", "replay", "rollback", "holomesh_tasks"]
  pipeline: ["intent_classification", "boundary_check", "approval_bundle", "provider_wait", "download_quarantine", "verify_files", "preview", "task_file", "rollback"]
}

object "IntentClassificationStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "intent_classification"
  order: 1
  adapter: "scripts/holoshell-account-task-custody.mjs"
  action: "classify_provider_export_intent"
  permissionEnvelope: "read_only"
  output: ".tmp/holoshell/account-task-custody-latest.json"
}

object "BoundaryCheckStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "boundary_check"
  order: 2
  adapter: "scripts/holoshell-action-executor.mjs"
  action: "stage_credential_adjacent_browser_open_without_execution"
  permissionEnvelope: "guarded_execute"
  browserProfileRequired: true
  cookiePolicy: "profile_cookies_visible_to_browser_only"
  screenshotPolicy: "local_only_redacted_or_manual_witness"
  accountMutationPerformed: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-open-url-plan.json"
}

object "ApprovalBundleStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "approval_bundle"
  order: 3
  adapter: "scripts/holoshell-approval-bundle.mjs"
  action: "mint_nonce_bound_browser_approval_bundle"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  executionDefault: "not_requested"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-approval-bundle.json"
}

object "ProviderWaitStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "provider_wait"
  order: 4
  action: "record_provider_async_export_state"
  permissionEnvelope: "read_only"
  expectedStates: ["not_requested", "requested", "provider_waiting", "ready_to_download", "expired", "blocked"]
  mutationPerformed: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-provider-wait.json"
}

object "DownloadQuarantineStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "download_quarantine"
  order: 5
  action: "stage_download_manifest_and_quarantine_receipt"
  permissionEnvelope: "break_glass_account_export"
  privateAbsolutePathPolicy: "private_receipt_only"
  publicPathPolicy: "repo_relative_or_opaque_export_id_only"
  downloadedArchiveExecuted: false
  rawPrivateDataPublished: false
  importMode: "preview_only"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-quarantine.json"
}

object "VerifyFilesStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "verify_files"
  order: 6
  action: "hash_archive_scan_file_types_and_redact_paths"
  permissionEnvelope: "read_only"
  requiredChecks: ["archive_hash", "file_count", "mime_scan", "absolute_path_redaction", "source_mutation_false"]
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-verification.json"
}

object "PreviewStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "preview"
  order: 7
  action: "render_hololand_import_dock_summary_without_raw_private_data"
  permissionEnvelope: "guarded_execute"
  importMode: "preview_only"
  rawPrivateDataPublished: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-visual-witness.json"
}

object "TaskFileStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "task_file"
  order: 8
  adapter: "C:/Users/josep/.ai-ecosystem/scripts/room-add-tasks.mjs"
  action: "file_gap_tasks"
  permissionEnvelope: "guarded_execute"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/browser-account-export-holomesh-tasks.json"
}

object "RollbackStep" {
  type: "pipeline_step"
  commandId: "browser_account_export"
  phase: "rollback"
  order: 9
  action: "delete_generated_receipts_or_quarantine_only_after_exact_path_confirmation"
  permissionEnvelope: "break_glass_account_export"
  rollbackScope: "local quarantine and generated receipts; provider export cancellation only when provider supports it"
  sourceFileMutationPerformed: false
}
