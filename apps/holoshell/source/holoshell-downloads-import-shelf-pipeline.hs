// HoloShell Downloads Import Shelf data pipeline.
// Object-manifest form is used so the local HoloScript CLI can validate it.

object "DownloadsImportShelfPipelineManifest" {
  type: "downloads_import_shelf_pipeline_manifest"
  id: "holoshell-downloads-import-shelf-pipeline"
  name: "HoloShell Downloads Import Shelf Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-downloads-import-shelf-room.holo"
  policySource: "apps/holoshell/source/holoshell-downloads-import-shelf-policy.hsplus"
  scannerAdapter: "C:/Users/josep/Documents/GitHub/HoloScript/scripts/holoshell-downloads-scanner-adapter.mjs"
  receiptValidator: "C:/Users/josep/Documents/GitHub/HoloScript/packages/framework/src/board/holoshell-downloads-shelf-receipts.ts"
  accountExportValidator: "packages/framework/src/board/holoshell-account-export-receipts.ts"
  workFileValidator: "packages/framework/src/board/holoshell-workfile-custody-receipt.ts"
  assetShardWorkflow: "apps/holoshell/source/holoshell-asset-shard-workflow.hsplus"
  evidencePack: "C:/Users/josep/Documents/GitHub/HoloScript/.bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-product-ratchet.md"
}

object "DownloadsImportShelfCommand" {
  type: "command_pipeline"
  commandId: "downloads_import_shelf"
  naturalIntent: "Clean up my Downloads folder, preview useful files, import safe objects into HoloLand, and delete junk only with receipts."
  actor: "brittney"
  autonomyLevel: "read_only_by_default_guarded_import_break_glass_delete"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["downloads_folder", "desktop_drop_zone", "file_hashes", "archive_quarantine", "installer_blocks", "duplicate_groups", "hololand_import_shelf", "delete_receipts", "holomesh_tasks"]
  pipeline: ["root_selection", "inventory_scan", "risk_classification", "hash_and_group", "preview_generation", "decision_bundle", "guarded_import", "delete_receipt", "task_file", "replay"]
}

object "RootSelectionStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "root_selection"
  order: 1
  action: "select_approved_local_roots"
  permissionEnvelope: "read_only"
  allowedRoots: ["Downloads", "Desktop drop zone"]
  privateAbsolutePathPolicy: "private_receipt_only"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-root-selection.json"
}

object "InventoryScanStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "inventory_scan"
  order: 2
  action: "scan_with_holoshell_downloads_adapter_on_approved_fixture_or_selected_folder"
  permissionEnvelope: "read_only"
  validates: ["file_count", "size_bytes", "extension", "mtime", "partial_download_state", "public_path_redaction"]
  output: "DownloadsInventoryReceipt"
}

object "RiskClassificationStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "risk_classification"
  order: 3
  action: "classify_downloaded_files_by_safe_preview_risk"
  permissionEnvelope: "read_only"
  lanes: ["safe_preview", "archive_quarantine", "installer_blocked", "duplicate_candidate", "unknown_type", "private_document"]
  executableLaunchAllowed: false
  rawPrivateDataPublished: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-risk-classification.json"
}

object "HashAndGroupStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "hash_and_group"
  order: 4
  action: "hash_files_and_group_duplicates"
  permissionEnvelope: "read_only"
  validates: ["sha256", "duplicate_hash_groups", "archive_part_hashes", "installer_hashes"]
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-hash-groups.json"
}

object "PreviewGenerationStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "preview_generation"
  order: 5
  action: "create_safe_metadata_and_thumbnail_previews"
  permissionEnvelope: "guarded_execute"
  importMode: "preview_only"
  adapters: ["image_thumbnail", "pdf_metadata", "archive_manifest", "model_preview", "spreadsheet_metadata", "text_summary"]
  rawPrivateDataPublished: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-preview.json"
}

object "DecisionBundleStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "decision_bundle"
  order: 6
  action: "mint_keep_import_delete_decision_receipt"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  selectedActionSetHashRequired: true
  output: "DownloadsDecisionReceipt"
}

object "GuardedImportStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "guarded_import"
  order: 7
  action: "copy_redacted_file_proxies_to_hololand_import_shelf"
  permissionEnvelope: "guarded_execute"
  sourceFileMutationPerformed: false
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-import-receipt.json"
}

object "DeleteReceiptStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "delete_receipt"
  order: 8
  action: "delete_selected_files_only_after_exact_confirmation"
  permissionEnvelope: "break_glass"
  requiresFreshUserGesture: true
  rollbackScope: "recycle bin when available; permanent delete requires separate receipt"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-delete-receipt.json"
}

object "TaskFileStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "task_file"
  order: 9
  adapter: "C:/Users/josep/.ai-ecosystem/scripts/room-add-tasks.mjs"
  action: "file_gap_tasks"
  permissionEnvelope: "guarded_execute"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-19/downloads-import-shelf-holomesh-tasks.json"
}

object "ReplayStep" {
  type: "pipeline_step"
  commandId: "downloads_import_shelf"
  phase: "replay"
  order: 10
  action: "replay_from_root_hash_file_hashes_policy_version_and_selected_action_set"
  permissionEnvelope: "read_only"
  replayStates: ["scanned", "classified", "hashed", "quarantined", "preview_ready", "decision_pending", "receipt_written"]
}
