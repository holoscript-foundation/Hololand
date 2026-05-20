// HoloShell Install/Update Native Room Gate — data pipeline.
// Object-manifest form used so the local HoloScript CLI can validate it.
//
// Wires: package inventory -> machine preflight -> approval gate ->
//   break-glass mutation -> admin boundary -> PATH/startup/registry deltas ->
//   launch witness -> tool-ready token -> HoloMesh task filing -> replay.
//
// Receipt validator (HoloScript substrate):
//   packages/framework/src/board/holoshell-package-mutation-receipt.ts
// Bridge script:
//   scripts/holoshell-package-custody.mjs
// Room:
//   apps/holoshell/source/holoshell-install-update-room.holo
// Policy:
//   apps/holoshell/source/holoshell-install-update-policy.hsplus

object "InstallUpdatePipelineManifest" {
  type: "install_update_pipeline_manifest"
  id: "holoshell-install-update-native-room-gate"
  name: "HoloShell Install/Update Native Room Gate Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-install-update-room.holo"
  policySource: "apps/holoshell/source/holoshell-install-update-policy.hsplus"
  bridgeScript: "scripts/holoshell-package-custody.mjs"
  receiptValidator: "packages/framework/src/board/holoshell-package-mutation-receipt.ts"
  receiptSchema: "hololand.holoshell.package-custody.v0.1.0"
  evidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-19/install-update-safe-wrapper-evidence-pack.md"
}

object "InstallUpdateCommand" {
  type: "command_pipeline"
  commandId: "install_update_tool_custody"
  naturalIntent: "Install or update a world-building tool safely, show what changed, verify it launches, and spawn a tool-ready world object."
  actor: "brittney"
  autonomyLevel: "read_only_inventory_guarded_launch_break_glass_mutation"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["package_identity", "machine_preflight", "approval_packet", "admin_boundary", "path_startup_registry_deltas", "launch_verification", "tool_ready_token", "holomesh_tasks", "replay"]
  pipeline: ["inventory", "preflight", "plan", "approval_gate", "admin_boundary", "mutation", "delta_record", "launch_verify", "tool_ready", "task_file", "replay"]
}

object "InventoryStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "inventory"
  order: 1
  action: "list_installed_packages_and_check_available_versions"
  permissionEnvelope: "read_only"
  validates: ["packageId", "publisher", "source", "currentVersion", "availableVersion", "installerType"]
  output: ".tmp/holoshell/install-update-inventory.json"
}

object "PreflightStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "preflight"
  order: 2
  action: "check_disk_network_admin_process_and_package_manager"
  permissionEnvelope: "read_only"
  validates: ["diskFreeBytes", "networkPolicy", "adminRequired", "adminSession", "runningProcessConflicts", "packageManagerAvailable"]
  output: ".tmp/holoshell/install-update-preflight.json"
}

object "PlanStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "plan"
  order: 3
  action: "build_dry_run_mutation_plan_with_command_preview"
  permissionEnvelope: "read_only"
  validates: ["plannedMutations", "commandPreview", "downloadUrl", "installerHash", "pathChanges", "registryChanges", "startupChanges"]
  dryRunOnly: true
  output: ".tmp/holoshell/install-update-plan.json"
}

object "ApprovalGateStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "approval_gate"
  order: 4
  action: "mint_break_glass_approval_packet_with_fresh_human_gesture"
  permissionEnvelope: "break_glass"
  breakGlass: true
  requiresFreshHumanGesture: true
  rollbackLimitsMustBeVisible: true
  validates: ["approvalId", "approvalNonce", "approvedCommandPreview", "rollbackLimits", "expiresAt"]
  executionAllowed: false
  output: ".tmp/holoshell/install-update-approval.json"
}

object "AdminBoundaryStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "admin_boundary"
  order: 5
  action: "halt_and_render_admin_boundary_if_admin_required"
  permissionEnvelope: "break_glass"
  rule: "if adminRequired and not adminSession, halt and surface admin boundary; never silently elevate"
  adminAmbientElevationAllowed: false
  output: ".tmp/holoshell/install-update-admin-boundary.json"
}

object "MutationStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "mutation"
  order: 6
  action: "execute_package_mutation_only_after_approval_captured"
  permissionEnvelope: "break_glass"
  guardedByApprovalId: true
  executionAllowed: false
  liveMutationSupportedWhenNativeGatePresent: true
  note: "execution_allowed stays false in bridge mode; this step activates when the native gate supplies nonce-bound approval"
  output: "HoloShellPackageMutationReceipt"
}

object "DeltaRecordStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "delta_record"
  order: 7
  action: "record_path_startup_registry_deltas_before_and_after"
  permissionEnvelope: "guarded_execute"
  validates: ["pathDeltaBefore", "pathDeltaAfter", "startMenuEntryPresent", "programRegistryEntry", "startupEntryPresent", "fileAssociationChanges"]
  output: ".tmp/holoshell/install-update-deltas.json"
}

object "LaunchVerifyStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "launch_verify"
  order: 8
  action: "verify_binary_exists_version_command_passes_and_registry_updated"
  permissionEnvelope: "guarded_execute"
  validates: ["binaryPath", "versionCommand", "versionCommandPassed", "verifiedVersion", "startMenuEntryPresent", "programRegistryUpdated"]
  output: ".tmp/holoshell/install-update-launch-verify.json"
}

object "ToolReadyStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "tool_ready"
  order: 9
  action: "spawn_tool_ready_world_object_when_launch_verified"
  permissionEnvelope: "guarded_execute"
  spawnsTrigger: "holoshell:tool_ready_world_object"
  requires: ["launchVerified == true", "packageId", "verifiedVersion", "binaryPath", "receiptHash"]
  output: ".tmp/holoshell/install-update-tool-ready.json"
}

object "TaskFileStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "task_file"
  order: 10
  adapter: "scripts/room-add-tasks.mjs"
  action: "file_gap_and_follow_up_tasks_to_holomesh"
  permissionEnvelope: "guarded_execute"
  output: ".tmp/holoshell/install-update-holomesh-tasks.json"
}

object "ReplayStep" {
  type: "pipeline_step"
  commandId: "install_update_tool_custody"
  phase: "replay"
  order: 11
  action: "replay_from_package_id_version_binary_path_receipt_hash"
  permissionEnvelope: "read_only"
  replayInputs: ["packageId", "toVersion", "binaryPath", "versionOutputHash", "programRegistryHash"]
  replayStates: ["inventoried", "preflighted", "planned", "approval_required", "installed", "deltas_recorded", "verified", "tool_ready", "filed"]
}
