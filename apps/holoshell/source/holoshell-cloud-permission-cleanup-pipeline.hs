// HoloShell cloud permission cleanup data-flow.

environment {
  skybox: "night"
  ambient_light: 0.25
}

object "provider_account_receipt" {
  geometry: "cube"
  color: "#1f6feb"
  position: { x: -4.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  input_path: "input.permission_subject_receipt"
  format: "json"
  schema: "PermissionSubjectReceipt"
}

object "shared_inventory_reader" {
  geometry: "cube"
  color: "#2ea043"
  position: { x: -3, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "shared files; folders; link visibility; direct subjects; inherited permission chain"
  redacts: "raw account labels; absolute local paths; file contents; raw OAuth tokens"
  emits: "CloudShareInventoryReceipt"
  permissionEnvelope: "read_only"
}

object "provider_export_normalizer" {
  geometry: "cube"
  color: "#7dcfff"
  position: { x: -2.25, y: 1.35, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  accepts: "google_drive_permissions; microsoft_graph_driveitems"
  reads: "provider metadata export; item ids; item names; link scopes; roles; subject labels; inheritance markers"
  blocks: "file contents; raw OAuth tokens; cookies; absolute local paths; unredacted account labels"
  emits: "ProviderMetadataInventoryWitnessReceipt; CloudSharedItemExposure[] with providerItemIdHash and redacted subjects"
  validation: "provider export witness must prove source format, export hash, field allowlist, redaction, blocked fields absent, and skipped record counts before inventory receipt is written"
}

object "exposure_diff_classifier" {
  geometry: "cube"
  color: "#d29922"
  position: { x: -1.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "inventory receipt; intended sharing policy; provider org boundary"
  emits: "public links; external editors; unknown groups; inherited access; domain-wide access"
  validation: "risk classes must be itemized before any revoke action"
}

object "itemized_revoke_plan" {
  geometry: "cube"
  color: "#e0af68"
  position: { x: 0, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "exposure diff; selected items; approval nonce; rollback limits"
  blocks: "bulk revoke without item review; delete; move; owner transfer; org policy mutation"
  emits: "CloudPermissionRevokePlanReceipt"
  permissionEnvelope: "guarded_execute"
}

object "post_revoke_verifier" {
  geometry: "cube"
  color: "#9ece6a"
  position: { x: 1.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "post-revoke inventory; provider audit page; residual inherited access"
  emits: "CloudPermissionCleanupVerificationReceipt; CloudPermissionCleanupReplayReceipt"
  validation: "clean claim requires zero residual risky access and replay-ready receipts"
}
