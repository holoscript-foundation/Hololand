// HoloShell User Shell Account Export Pipeline
//
// Non-developer pipeline derived from holoshell-browser-account-export-pipeline.hs.
// Each step maps to a user-shell capability pack with Brittney intent
// translation, staged execution, and human-readable receipt names.
//
// The founder pipeline uses adapter scripts and raw receipt paths. This
// pipeline replaces those with capability pack references and Brittney
// hint surfaces so HoloLand can render the room without developer knowledge.

object "UserShellAccountExportPipelineManifest" {
  type: "user_shell_account_export_pipeline_manifest"
  id: "holoshell-user-shell-account-export"
  name: "HoloShell User Shell Account Export Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  derivedFrom: "holoshell-browser-account-export-pipeline"
  roomSource: "apps/holoshell/source/holoshell-user-shell-account-export-room.holo"
  policySource: "apps/holoshell/source/holoshell-user-shell-account-export-policy.hsplus"
  receiptValidator: "packages/framework/src/board/holoshell-account-export-receipts.ts"
  capabilityPack: "user-pack.account-export"
  brittneyTranslation: true
  executionDefault: "staged_not_run"
  humanJob: "export my account data"
}

// ── Step 1: Which account? ────────────────────────────────────────────────
// User picks provider and account; Brittney confirms the browser profile.

object "WhichAccountStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "which_account"
  order: 1
  capabilityPack: "user-pack.account-export.which-account"
  brittneyHint: "I will check which browser profile is active and confirm the account before we start."
  permissionEnvelope: "read_only"
  founderEnvelope: "SilentInspect"
  userQuestion: "Which account do I export from?"
  validates: ["provider", "redacted_account_label", "browser_profile", "session_status", "wrong_profile_blocker"]
  output: "browser_account_boundary_receipt"
  receiptRequired: true
}

// ── Step 2: What to include? ───────────────────────────────────────────────
// User chooses products and format; Brittney previews before submission.

object "WhatToIncludeStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "what_to_include"
  order: 2
  capabilityPack: "user-pack.account-export.what-to-include"
  brittneyHint: "I will show you exactly what products and data are included before you approve."
  permissionEnvelope: "guarded_execute"
  founderEnvelope: "GuardedExportPreparation"
  userQuestion: "What data should I include?"
  validates: ["fresh_user_gesture", "selected_products", "delivery_method", "destination", "cloud_handoff_warning"]
  output: "account_export_approval_receipt"
  receiptRequired: true
  requiresFreshUserGesture: true
  hiddenAutomationAllowed: false
}

// ── Step 3: Check it's ready ───────────────────────────────────────────────
// Provider wait state; Brittney watches and notifies.

object "CheckItsReadyStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "check_its_ready"
  order: 3
  capabilityPack: "user-pack.account-export.check-ready"
  brittneyHint: "Some providers take hours or days. I will watch for you and let you know when it's ready."
  permissionEnvelope: "read_only"
  founderEnvelope: "SilentInspect"
  userQuestion: "Is my export ready to download?"
  waitsFor: ["provider_ready_state", "download_link_hash", "cloud_destination_ready_state"]
  output: "provider_export_wait_receipt"
  receiptRequired: true
}

// ── Step 4: Download safely ────────────────────────────────────────────────
// Quarantined download; no auto-execute; Brittney explains the quarantine.

object "DownloadSafelyStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "download_safely"
  order: 4
  capabilityPack: "user-pack.account-export.download-safely"
  brittneyHint: "I will download your archive to a quarantined folder. Nothing runs automatically."
  permissionEnvelope: "break_glass"
  founderEnvelope: "BreakGlassAccountExport"
  userQuestion: "Download my archive safely"
  validates: ["disk_space", "download_folder", "archive_parts", "no_partial_files", "no_auto_execute"]
  blockedByDefault: ["auto_unzip", "auto_upload", "overwrite_files", "execute_downloaded_file"]
  output: "local_download_quarantine_receipt"
  receiptRequired: true
  privateAbsolutePathPolicy: "private_receipt_only"
  importMode: "preview_only"
}

// ── Step 5: Verify what you got ─────────────────────────────────────────────
// Archive verification; Brittney walks through results.

object "VerifyWhatYouGotStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "verify_what_you_got"
  order: 5
  capabilityPack: "user-pack.account-export.verify"
  brittneyHint: "I will check every file against the provider manifest and scan for anything unexpected."
  permissionEnvelope: "read_only"
  founderEnvelope: "SilentInspect"
  userQuestion: "Does my download match what the provider said?"
  validates: ["archive_hash", "file_count", "mime_scan", "sensitivity_scan", "no_unexpected_executables", "replay_key_saved"]
  output: "account_export_archive_receipt"
  receiptRequired: true
  importAllowedAfterVerification: true
  importModeBeforeVerification: "preview_only"
}

// ── Step 6: Replay or undo later ───────────────────────────────────────────
// Replay lesson: what you can redo, what you cannot, and how to revisit.

object "ReplayOrUndoStep" {
  type: "pipeline_step"
  commandId: "user_shell_account_export"
  phase: "replay_or_undo"
  order: 6
  capabilityPack: "user-pack.account-export.replay-or-undo"
  brittneyHint: "I will walk you through what can and cannot be undone after the export."
  permissionEnvelope: "read_only"
  founderEnvelope: "SilentInspect"
  userQuestion: "What can I redo or undo?"
  replayLesson: [
    "Your export receipt is saved locally. You can replay the full timeline anytime.",
    "Provider export requests may be cancelable before they are created.",
    "Once the provider creates the archive, the export itself cannot be undone, but you can delete the local copy.",
    "Exporting data is NOT deleting it from the provider. Your source data is untouched.",
    "If you imported something into HoloLand, only a redacted preview was shared. The raw archive stays local."
  ]
  rollbackStates: ["provider_cancel_possible", "local_delete", "receipt_delete", "hololand_import_undo"]
  output: "account_export_replay_receipt"
  receiptRequired: true
  exportIsNotDeletion: true
}