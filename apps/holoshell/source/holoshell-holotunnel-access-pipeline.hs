// HoloShell HoloTunnel Access Pipeline
//
// Object manifest for the easy HoloLand access path. This consumes a sanitized
// Studio share packet and emits product-safe access state and receipts.

object "HoloTunnelAccessPipelineManifest" {
  type: "pipeline_manifest"
  id: "holoshell-holotunnel-access"
  workflow: "holotunnel-nondeveloper-access"
  defaultExecution: "stable_access_first"
  humanJob: "share or open a live HoloLand experience without tunnel mechanics"
  roomSource: "apps/holoshell/source/holoshell-holotunnel-access-card.holo"
  policySource: "apps/holoshell/source/holoshell-holotunnel-access-policy.hsplus"
  specSource: "docs/specs/HOLOTUNNEL_NONDEVELOPER_ACCESS.md"
  upstreamStudioSurface: "HoloScript Studio HoloTunnel developer utility"
  outputEvidencePack: ".tmp/holoshell/holotunnel-access.json"
  receiptRequired: true
}

object "StudioSharePacketIngestStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "share_packet"
  order: 0
  adapter: "HoloScript Studio share packet"
  mutationClass: "none"
  requires: ["worldId", "sessionName", "stableUrl", "sourceRef", "createdBy"]
  optional: ["directUrl", "expiresAt"]
  redacts: ["tunnelId", "localPort", "localHost", "relayToken"]
  output: "SanitizedHoloTunnelSharePacket"
}

object "AccessCardProjectionStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "access_card"
  order: 1
  adapter: "apps/holoshell/source/holoshell-holotunnel-access-card.holo"
  mutationClass: "none"
  visibleTo: ["player", "reviewer", "creator_host", "operator"]
  firstScreenActions: ["Share World", "Open Here", "Open On Headset", "Copy Invite"]
  hiddenByDefault: ["Tunnel ID", "Direct tunnel URL", "Local port", "Relay counters"]
  output: "HoloTunnelAccessCardProjection"
}

object "ReadinessSummaryStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "readiness"
  order: 2
  adapter: "apps/holoshell/source/holoshell-readiness-evidence.hsplus"
  mutationClass: "none"
  summarizes: ["browser", "headset", "safety"]
  fallbackAllowed: true
  output: "HoloTunnelAccessReadinessSummary"
}

object "QrAndHeadsetStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "headset_open"
  order: 3
  adapter: "qr_or_stable_url_bridge"
  mutationClass: "guarded_preview"
  preferStableUrl: true
  directUrlAllowedOnlyInAdvanced: true
  fallback: "browser_preview"
  output: "HeadsetAccessPrompt"
}

object "RecipientOpenStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "recipient_open"
  order: 4
  adapter: "stable_access_route"
  mutationClass: "none"
  validates: ["host_live", "invite_active", "device_supported", "safety_approved", "response_within_timeout"]
  output: "RecipientOpenResult"
}

object "PlainFailureCopyStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "failure_copy"
  order: 5
  adapter: "apps/holoshell/source/holoshell-holotunnel-access-policy.hsplus"
  mutationClass: "none"
  maps: ["host_offline", "expired", "revoked", "device_unsupported", "safety_blocked", "timeout"]
  output: "RecipientFacingFailureCopy"
}

object "AdvancedDiagnosticsStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "advanced_diagnostics"
  order: 6
  adapter: "operator_expand_only"
  mutationClass: "none"
  visibleByDefault: false
  reveals: ["directUrl", "tunnelId", "relayBase", "localTarget", "relayStatusSummary"]
  requiresRole: ["host", "operator", "developer"]
  output: "AdvancedHoloTunnelAccessDiagnostics"
}

object "AccessReceiptStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "receipt"
  order: 7
  action: "emit_product_safe_access_receipt"
  output: "HoloTunnelAccessReceipt"
  receiptVersion: "hololand.holotunnel-access.v1"
  redactedByDefault: ["tunnelId", "localTarget", "relayToken", "absoluteLocalPath"]
  replayPlanRequired: true
}

object "RevokeOrExpireStep" {
  type: "pipeline_step"
  workflow: "holotunnel-nondeveloper-access"
  phase: "revoke_or_expire"
  order: 8
  adapter: "host_access_control"
  mutationClass: "guarded_product_control"
  visibleControls: ["Revoke Invite", "Extend Invite", "Copy New Invite"]
  recipientCopy: ["The host turned this invite off.", "This invite expired."]
  receiptRequired: true
}
