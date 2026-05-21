// HoloShell family-photo backup custody data pipeline.
// Object-manifest form is used so the local HoloScript CLI can validate it.

object "FamilyPhotoBackupCustodyPipelineManifest" {
  type: "photo_backup_pipeline_manifest"
  id: "holoshell-family-photo-backup-custody-pipeline"
  name: "HoloShell Family Photo Backup Custody Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-family-photo-backup-custody-room.holo"
  policySource: "apps/holoshell/source/holoshell-family-photo-backup-custody-policy.hsplus"
  evidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-21/family-photo-backup-custody-evidence-pack.md"
}

object "PhotoBackupIntent" {
  type: "command_pipeline"
  commandId: "family_photo_backup_custody"
  naturalIntent: "Back up my family photos, prove they are safe, do not leak private media, and show what changed."
  actor: "brittney"
  autonomyLevel: "guarded"
  defaultExecution: "plan_not_copy"
  receiptRequired: true
  targets: ["photo_folders", "duplicate_groups", "privacy_envelope", "backup_target", "copy_receipt", "restore_proof", "replay", "rollback", "task_file"]
}

object "AlbumInventoryStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "album_inventory"
  order: 1
  action: "enumerate_approved_photo_roots_and_write_private_manifest"
  permissionEnvelope: "silent_read"
  publicPathPolicy: "album_labels_counts_hashes_only"
  privateReceiptPolicy: "absolute_paths_stay_local_private"
  output: ".tmp/holoshell/photo-backup-custody-latest.json"
}

object "DedupeStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "dedupe"
  order: 2
  action: "group_exact_and_near_duplicate_media"
  permissionEnvelope: "silent_read"
  duplicatePolicy: "review_only_never_delete"
  evidence: ["content_hash", "perceptual_hash", "file_size", "capture_time"]
  output: ".tmp/holoshell/photo-backup-custody-latest.json"
}

object "PrivacyEnvelopeStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "privacy_envelope"
  order: 3
  action: "choose_metadata_and_encryption_policy"
  permissionEnvelope: "guarded_choice"
  blocksCopyUntilChosen: true
  options: ["preserve_metadata_local_only", "strip_cloud_metadata", "client_side_encrypt", "provider_default"]
}

object "TargetPlanStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "target_plan"
  order: 4
  action: "resolve_backup_target_quota_account_boundary_and_delete_semantics"
  permissionEnvelope: "guarded_choice"
  targets: ["external_drive", "encrypted_archive", "cloud_provider", "nas", "phone_import"]
  blocksCopyUntil: ["target_chosen", "quota_ok", "delete_semantics_visible", "rollback_plan_present"]
}

object "CopyApprovalStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "copy_approval"
  order: 5
  action: "mint_nonce_bound_copy_approval"
  permissionEnvelope: "guarded_execute"
  requiresFreshUserGesture: true
  deletionAllowed: false
  uploadAllowedOnlyAfterPrivacyEnvelope: true
  output: ".tmp/holoshell/photo-backup-copy-approval-latest.json"
}

object "BackupCopyStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "backup_copy"
  order: 6
  action: "copy_or_upload_with_manifest"
  permissionEnvelope: "guarded_execute"
  defaultExecution: "not_requested"
  sourceMutated: false
  deleteOriginals: false
  output: ".tmp/holoshell/photo-backup-copy-latest.json"
}

object "RestoreProofStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "restore_proof"
  order: 7
  action: "restore_sample_and_compare_hashes"
  permissionEnvelope: "read_verify"
  requiredBeforeReady: true
  requiredOutputs: ["sample_restore_hash_match", "count_match", "privacy_mode_match", "rollback_plan"]
  output: ".tmp/holoshell/photo-backup-restore-proof-latest.json"
}

object "ReplaySealStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "replay_seal"
  order: 8
  action: "join_inventory_dedupe_privacy_target_copy_restore_receipts"
  permissionEnvelope: "read_only"
  replayInputs: ["album_manifest_hash", "duplicate_group_hash", "privacy_policy_hash", "target_plan_hash", "copy_manifest_hash", "restore_proof_hash"]
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-21/family-photo-backup-custody-evidence-pack.md"
}

object "DeleteBlockerStep" {
  type: "pipeline_step"
  commandId: "family_photo_backup_custody"
  phase: "delete_blocker"
  order: 9
  action: "keep_original_delete_locked_after_backup"
  permissionEnvelope: "break_glass_only"
  coolingOffRequired: true
  verifiedRestoreRequired: true
  separateApprovalRequired: true
  defaultAction: "no_delete"
}
