// HoloShell unified permission cleanup data-flow.
// Covers shared drives, API tokens, and OAuth grants in a single pipeline.

environment {
  skybox: "night"
  ambient_light: 0.25
}

object "provider_account_receipt" {
  geometry: "cube"
  color: "#1f6feb"
  position: { x: -5.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  input_path: "input.permission_subject_receipt"
  format: "json"
  schema: "PermissionSubjectReceipt"
}

object "shared_drive_inventory_reader" {
  geometry: "cube"
  color: "#f7768e"
  position: { x: -3.6, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "shared files; folders; link visibility; external editors; domain-wide access; inherited chains"
  redacts: "raw account labels; absolute local paths; file contents; raw OAuth tokens"
  emits: "CloudShareInventoryReceipt"
  category: "shared_drives"
  permissionEnvelope: "read_only"
}

object "api_token_inventory_reader" {
  geometry: "cube"
  color: "#e0af68"
  position: { x: -1.8, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "token scopes; creation date; last used date; service identifier; rotatability"
  redacts: "raw token values; refresh tokens; secret hashes; admin tokens"
  emits: "ApiTokenInventoryReceipt"
  category: "api_tokens"
  permissionEnvelope: "read_only"
}

object "oauth_grant_inventory_reader" {
  geometry: "cube"
  color: "#ff9e64"
  position: { x: 0, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "granted scopes; application name; grant date; last used date; revocation URL"
  redacts: "raw access tokens; cookie dumps; background consent records; wildcard scopes"
  emits: "OAuthGrantInventoryReceipt"
  category: "oauth_grants"
  permissionEnvelope: "read_only"
}

object "cross_category_exposure_classifier" {
  geometry: "cube"
  color: "#d29922"
  position: { x: 1.8, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "shared drive inventory; API token inventory; OAuth grant inventory; intended sharing policy; provider org boundary"
  classifies: "shared drive risk; API token staleness; OAuth grant overbreadth; cross-category exposure"
  emits: "PermissionExposureDiffReceipt"
  validation: "risk classes must be itemized per category before any revoke action"
}

object "batch_revocation_planner" {
  geometry: "cube"
  color: "#e0af68"
  position: { x: 3.6, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "exposure diff; selected items per category; approval nonce; rollback limits"
  blocks: "bulk revoke without item review; revoke admin token; transfer owner; delete cloud file; org policy mutation"
  emits: "PermissionBatchRevocationReceipt"
  permissionEnvelope: "guarded_execute"
  batchCap: 50
  requiresFreshGesture: true
}

object "post_revoke_verifier" {
  geometry: "cube"
  color: "#9ece6a"
  position: { x: 5.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "post-revoke inventory per category; provider audit page; residual inherited access; rollback availability"
  emits: "PermissionCleanupVerificationReceipt; PermissionCleanupReplayReceipt"
  validation: "clean claim requires zero residual risky access and replay-ready receipts across all categories"
}