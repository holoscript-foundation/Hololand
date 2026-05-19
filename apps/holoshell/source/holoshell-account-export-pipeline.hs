// HoloShell account export pipeline.
// Parseable source shape for provider account export custody.

object "AccountExportPipelineManifest" {
  type: "pipeline_manifest"
  id: "holoshell-account-export"
  workflow: "browser-account-export"
  defaultExecution: "stage_only_no_account_mutation"
  humanJob: "export account data to this computer, verify the archive, show receipts"
  roomSource: "apps/holoshell/source/holoshell-account-export-room.holo"
  policySource: "apps/holoshell/source/holoshell-account-export-policy.hsplus"
  receiptPack: "HoloShellAccountExportReceiptPack"
  userPackSource: "apps/holoshell/source/holoshell-account-export-user-pack.hsplus"
  userRoomSource: "apps/holoshell/source/holoshell-account-export-user-room.holo"
  receiptRequired: true
}

object "ProviderPlanStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "provider_plan"
  order: 1
  adapter: "HoloScript ProviderExportPlanReceipt"
  mutationClass: "draft_only"
  validates: ["redacted_account", "selected_products", "delivery_method", "archive_size", "cloud_handoff"]
  output: "ProviderExportPlanReceipt"
}

object "BrowserWitnessStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "browser_witness"
  order: 2
  adapter: "scripts/holoshell-os-ui-capture.mjs"
  mutationClass: "read_only_capture"
  validates: ["target_browser", "profile_boundary", "visible_window", "action_bridge_status"]
  output: "OSUICaptureReceipt"
}

object "ProviderRequestStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "provider_request"
  order: 3
  adapter: "manual_provider_page"
  mutationClass: "fresh_user_gesture"
  directAutomationAllowed: false
  validates: ["fresh_user_gesture", "hidden_automation_false", "rollback_note"]
  output: "ProviderExportRequestReceipt"
}

object "ProviderReadyStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "provider_ready"
  order: 4
  adapter: "email_or_provider_notification_observer"
  mutationClass: "read_only"
  waitsFor: ["provider_ready_state", "download_link_hash", "cloud_destination_ready_state"]
  output: "ProviderExportReadyReceipt"
}

object "LocalArchiveDownloadStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "local_download"
  order: 5
  adapter: "browser_download_observer"
  mutationClass: "guarded_download"
  validates: ["disk_space", "download_folder", "archive_parts", "partial_files_absent"]
  output: "LocalArchiveDownloadReceipt"
}

object "ArchiveVerificationStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "archive_verification"
  order: 6
  adapter: "HoloScript AccountExportArchiveReceipt validator"
  mutationClass: "read_only_verify"
  validates: ["part_hashes", "unpack_manifest", "sensitivity_scan", "unexpected_executable_count"]
  output: "AccountExportArchiveReceipt"
}

object "ReplayStep" {
  type: "pipeline_step"
  workflow: "browser-account-export"
  phase: "replay"
  order: 7
  action: "merge_account_export_receipts"
  output: "AccountExportReplayReceipt"
  replayStates: ["planned", "requested", "waiting", "ready", "downloaded", "verified", "needs_attention"]
  rollbackNoteRequired: true
  exportIsNotDeletion: true
}
