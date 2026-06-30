// HoloShell asset folder to playable shard v2 data pipeline.
// Object-manifest form is used so the local HoloScript CLI can validate it.

object "AssetShardPipelineV2Manifest" {
  type: "asset_shard_pipeline_manifest"
  id: "holoshell-asset-shard-pipeline-v2"
  name: "HoloShell Asset Folder to Playable Shard Pipeline v2"
  version: "0.2.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  roomSource: "apps/holoshell/source/holoshell-asset-shard-2-room.holo"
  policySource: "apps/holoshell/source/holoshell-asset-shard-2-policy.hsplus"
  workflowSource: "apps/holoshell/source/holoshell-asset-shard-workflow.hsplus"
  workflowAdapter: "scripts/holoshell-asset-shard-workflow.mjs"
  approvalAdapter: "scripts/holoshell-shard-import-approval.mjs"
  visualWitnessAdapter: "scripts/holoshell-visual-witness.mjs"
  evidencePack: ".bench-logs/holoshell-human-os-frontier/2026-05-18/asset-shard-2-evidence-pack.md"
}

object "AssetShardIntakeCommand" {
  type: "command_pipeline"
  commandId: "asset_folder_to_playable_shard_v2"
  naturalIntent: "Turn this local folder into a playable HoloLand shard, verify it works, and show what changed."
  actor: "brittney"
  autonomyLevel: "guarded"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["local_folder", "asset_classifier", "preview_holo", "hololand_shard", "visual_witness", "holomesh_tasks"]
  pipeline: ["scan", "classify", "generate_preview", "validate", "approve_import", "import_if_approved", "visual_witness", "task_file", "rollback"]
}

object "AssetShardScanStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "scan"
  order: 1
  adapter: "scripts/holoshell-asset-shard-workflow.mjs"
  action: "scan_local_folder"
  permissionEnvelope: "read_only"
  pathPolicy: "absolute_path_kept_in_private_receipt_only"
  output: ".tmp/holoshell/shard-workflow-latest.json"
}

object "AssetShardClassifyStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "classify"
  order: 2
  action: "classify_and_hash_assets"
  permissionEnvelope: "read_only"
  assetKinds: ["model", "image", "audio", "media", "source", "manifest", "unknown"]
  blockedKinds: ["credential_like", "symlink_escape", "unreadable"]
  output: ".tmp/holoshell/shard-workflow-latest.json"
}

object "AssetShardPreviewStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "generate_preview"
  order: 3
  adapter: "scripts/holoshell-asset-shard-workflow.mjs"
  action: "write_preview_holo"
  permissionEnvelope: "write_tmp"
  output: ".tmp/holoshell/shard-preview.holo"
}

object "AssetShardValidateStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "validate"
  order: 4
  adapter: "holoscript_cli"
  action: "parse_preview_and_policy_sources"
  permissionEnvelope: "read_only"
  outputs: [".tmp/holoshell/shard-preview.holo", "apps/holoshell/source/holoshell-asset-shard-2-room.holo", "apps/holoshell/source/holoshell-asset-shard-2-policy.hsplus"]
}

object "AssetShardApprovalStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "approve_import"
  order: 5
  adapter: "scripts/holoshell-shard-import-approval.mjs"
  action: "mint_nonce_bound_import_bundle"
  permissionEnvelope: "guarded_execute"
  defaultExecution: "not_requested"
  output: ".tmp/holoshell/shard-import-approval-latest.json"
}

object "AssetShardImportStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "import_if_approved"
  order: 6
  adapter: "scripts/holoshell-shard-import-approval.mjs"
  action: "execute_nonce_bound_runtime_import"
  permissionEnvelope: "guarded_execute"
  requiresConfirm: "import"
  sourceAssetsMutated: false
  output: ".tmp/holoshell/shard-import-latest.json"
}

object "AssetShardVisualWitnessStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "visual_witness"
  order: 7
  adapter: "scripts/holoshell-visual-witness.mjs"
  action: "render_preview_or_imported_shard"
  permissionEnvelope: "read_only"
  status: "missing_in_current_workflow"
  expectedOutput: ".tmp/holoshell/visual-witness.json"
}

object "AssetShardTaskFileStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "task_file"
  order: 8
  adapter: "C:/Users/josep/.ai-ecosystem/scripts/room-add-tasks.mjs"
  action: "file_gap_tasks"
  permissionEnvelope: "guarded_execute"
  output: ".bench-logs/holoshell-human-os-frontier/2026-05-18/asset-shard-2-holomesh-tasks.json"
}

object "AssetShardRollbackStep" {
  type: "pipeline_step"
  commandId: "asset_folder_to_playable_shard_v2"
  phase: "rollback"
  order: 9
  action: "delete_generated_tmp_outputs_only"
  permissionEnvelope: "guarded_execute"
  sourceAssetsMutated: false
  rollbackScope: ".tmp/holoshell generated shard workflow and imported shard files"
}
