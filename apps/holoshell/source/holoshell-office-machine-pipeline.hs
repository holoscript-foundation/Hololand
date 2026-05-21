// HoloShell Office Machine data pipeline.
// Object-manifest form for HoloScript CLI validation.
// Implements snapshot -> parse -> preview -> approval -> export -> diff -> rollback
// for spreadsheets (Excel) and documents (Word, PowerPoint, M365 Copilot).

object "OfficeMachinePipelineManifest" {
  type: "office_machine_pipeline_manifest"
  id: "holoshell-office-machine-pipeline"
  name: "HoloShell Office Machine Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-office-machine-room.holo"
  policySource: "apps/holoshell/source/holoshell-office-machine-policy.hsplus"
  legacyAdapterMatrix: "apps/holoshell/source/holoshell-office-machine-legacy-adapter.hsplus"
  receiptValidator: "packages/framework/src/board/holoshell-office-machine-receipts.ts"
  evidencePack: "bench-logs/holoshell-human-os-frontier/office-machine-product-ratchet.md"
}

object "OfficeMachineCommand" {
  type: "command_pipeline"
  commandId: "office_machine"
  naturalIntent: "Open a local document snapshot, preview it safely, approve or reject changes, export with a custody token, diff against the cloud version, and rollback if needed."
  actor: "brittney"
  autonomyLevel: "read_only_by_default_guarded_approval_break_glass_cloud"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["local_document_snapshots", "cloud_sync_exports", "preview_pane", "approval_gate", "export_token", "diff_view", "rollback_recovery", "break_glass_gate", "replay"]
  pipeline: ["load_snapshot", "parse_document", "preview_document", "approve_or_reject", "export_with_token", "diff_vs_cloud", "rollback_if_needed", "write_receipt", "replay"]
}

object "LoadSnapshotStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "load_snapshot"
  order: 1
  action: "detect_local_document_snapshots_and_cloud_sync_exports"
  permissionEnvelope: "read_only"
  supportedFormats: ["xlsx", "docx", "pptx", "csv"]
  output: "DocumentSnapshot[]"
}

object "ParseDocumentStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "parse_document"
  order: 2
  action: "parse_document_metadata_and_structure"
  permissionEnvelope: "read_only"
  validates: ["file_type", "file_size", "last_modified", "sheet_names", "page_count", "slide_count"]
  privacyRule: "previews show redacted names and safe metadata; raw private content stays local"
  output: "DocumentSnapshot"
}

object "PreviewDocumentStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "preview_document"
  order: 3
  action: "render_safe_preview_in_grid_or_page_mode"
  permissionEnvelope: "read_only"
  previewModes: ["grid", "page"]
  rawPrivateDataPublished: false
  output: "DocumentPreview"
}

object "ApproveOrRejectStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "approve_or_reject"
  order: 4
  action: "approve_or_reject_document_changes_with_fresh_gesture"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  blockedAutomation: ["auto_approve", "silent_export"]
  output: "OfficeMachineApprovalReceipt"
}

object "ExportWithTokenStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "export_with_token"
  order: 5
  action: "export_document_with_custody_token_reference_hash"
  permissionEnvelope: "guarded_execute"
  custodyTokenRequired: true
  rawCredentialCaptured: false
  tokenReferenceHashOnly: true
  output: "OfficeMachineExportReceipt"
}

object "DiffVsCloudStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "diff_vs_cloud"
  order: 6
  action: "generate_diff_against_last_known_good_cloud_version"
  permissionEnvelope: "guarded_execute"
  diffAgainst: "last known good cloud version"
  output: "OfficeMachineDiffReceipt"
}

object "RollbackIfNeededStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "rollback_if_needed"
  order: 7
  action: "rollback_to_last_known_good_with_receipt"
  permissionEnvelope: "guarded_execute"
  rollbackEnabled: true
  rollbackReceiptRequired: true
  output: "OfficeMachineRollbackReceipt"
}

object "WriteReceiptStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "write_receipt"
  order: 8
  action: "write_custody_and_approval_receipts"
  permissionEnvelope: "read_only"
  receiptRequired: true
  output: "OfficeMachineReceiptBundle"
}

object "ReplayStep" {
  type: "pipeline_step"
  commandId: "office_machine"
  phase: "replay"
  order: 9
  action: "replay_from_snapshot_hash_and_approval_receipts"
  permissionEnvelope: "read_only"
  replayStates: ["idle", "snapshot_loaded", "previewing", "draft", "approved", "exported", "diff_generated", "rollback", "receipt_written"]
}

object "BreakGlassCloudAccount" {
  type: "break_glass_gate"
  commandId: "office_machine"
  phase: "break_glass"
  requiresFreshUserGesture: true
  auditTokenRecorded: true
  description: "Direct cloud / M365 account access. Audit token recorded. Close after use."
  appliesTo: ["open_cloud_access", "access_m365_account", "sync_cloud_version"]
}