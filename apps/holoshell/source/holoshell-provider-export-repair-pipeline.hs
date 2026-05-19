// HoloShell provider export repair pipeline.
// Parseable source shape for failed account export and partial archive recovery.

object "ProviderExportRepairPipelineManifest" {
  type: "pipeline_manifest"
  id: "holoshell-provider-export-repair"
  workflow: "provider-export-repair"
  defaultExecution: "preserve_evidence_no_import"
  humanJob: "recover from a failed provider export or partial archive"
  roomSource: "apps/holoshell/source/holoshell-provider-export-repair-room.holo"
  policySource: "apps/holoshell/source/holoshell-provider-export-repair-policy.hsplus"
  receiptPack: "HoloShellProviderExportRepairReceiptPack"
  receiptRequired: true
}

object "ObserveProviderFailureStep" {
  type: "pipeline_step"
  workflow: "provider-export-repair"
  phase: "observe_failure"
  order: 1
  adapter: "provider_status_receipt_json"
  mutationClass: "read_only"
  validates: ["provider", "redacted_account", "failure_kind", "wait_state", "link_expiry", "managed_account_block"]
  output: "ProviderExportFailureReceipt"
}

object "PreservePartialArchiveStep" {
  type: "pipeline_step"
  workflow: "provider-export-repair"
  phase: "preserve_partial_archive"
  order: 2
  adapter: "local_quarantine_part_scanner"
  mutationClass: "read_only"
  validates: ["part_labels", "part_hashes", "missing_parts", "corrupt_parts", "unexpected_executables", "private_path_receipt"]
  output: "PartialArchiveEvidenceReceipt"
}

object "PlanRepairStep" {
  type: "pipeline_step"
  workflow: "provider-export-repair"
  phase: "plan_repair"
  order: 3
  adapter: "HoloScript planPartialArchiveRepair"
  mutationClass: "fresh_user_gesture_if_provider_mutation"
  validates: ["previous_evidence_preserved", "approval_nonce", "import_block", "delete_block", "rollback_note"]
  output: "ProviderExportRepairPlanReceipt"
}

object "VerifyAfterRepairStep" {
  type: "pipeline_step"
  workflow: "provider-export-repair"
  phase: "verify_after_repair"
  order: 4
  adapter: "HoloScript AccountExportArchiveReceipt validator"
  mutationClass: "read_only_verify"
  validates: ["all_parts_present", "unpack_manifest", "sensitivity_scan", "unexpected_executable_count"]
  output: "AccountExportArchiveReceipt"
}

object "ReplayLessonStep" {
  type: "pipeline_step"
  workflow: "provider-export-repair"
  phase: "replay_lesson"
  order: 5
  adapter: "HoloScript ExportRepairReplayReceipt validator"
  mutationClass: "read_only"
  validates: ["replay_key", "missing_evidence", "plain_language_lesson", "raw_private_data_not_published"]
  output: "ExportRepairReplayReceipt"
  replayableWithoutProviderAccess: true
}
