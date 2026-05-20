// HoloShell target-device proof parseable pipeline shape.
// Uses object-flow source until richer pipeline blocks are accepted by the CLI.

object "local_readiness_source" {
  geometry: "cube"
  color: "#2f6f9f"
  source: "codex_hardware_audit + git_status + holoscript_parse + browser_inventory"
  output: "local readiness receipt"
  validation: "local compile or browser inventory is not target-device proof"
}

object "device_inventory_source" {
  geometry: "cube"
  color: "#437c50"
  source: "Get-PnpDevice + hardware_audit + virtual_display_audio_inventory"
  output: "DeviceInventoryReceipt"
  validator: "validateDeviceInventoryReceipt"
  redaction: "device identifiers hash-only in public receipts"
}

object "target_witness_plan" {
  geometry: "cube"
  color: "#9f7a2f"
  source: "local_readiness_source + device_inventory_source + human_intent"
  output: "target witness plan"
  validation: "must name target frame, session, timing, or explicit capture blocker"
}

object "safety_envelope" {
  geometry: "cube"
  color: "#7c4d9f"
  source: "target_witness_plan + selected_action_class + safe_ranges"
  output: "DeviceSafetyEnvelopeReceipt"
  validator: "validateDeviceSafetyEnvelopeReceipt"
  guard: "command preview hash and rollback note required"
}

object "fresh_approval" {
  geometry: "cube"
  color: "#9f4d4d"
  source: "safety_envelope + fresh_user_gesture + nonce"
  output: "ConsentReceipt"
  validator: "validateConsentReceipt"
  guard: "hidden automation false; credential extrusion false"
}

object "bounded_device_action" {
  geometry: "cube"
  color: "#4d789f"
  source: "safety_envelope + fresh_approval + local_target_adapter"
  output: "DeviceActionReceipt"
  validator: "validateDeviceActionReceipt"
  guard: "mutationPerformed cannot be true unless consent and envelope agree"
}

object "target_device_witness" {
  geometry: "cube"
  color: "#5f5f5f"
  source: "bounded_device_action + target capture + frame timing"
  output: "TargetDeviceWitnessReceipt or capture blocker"
  validation: "target_proven requires target-device frame or WebXR runtime receipt, not local screenshot only"
}

object "replay_lesson" {
  geometry: "cube"
  color: "#6f4d9f"
  source: "target_witness_plan + bounded_device_action + target_device_witness"
  output: "ReplayLessonReceipt"
  validator: "validateReplayLessonReceipt"
}

object "target_device_proof_pack" {
  geometry: "cube"
  color: "#4d9f86"
  source: "local_readiness_source + device_inventory_source + target_witness_plan + safety_envelope + fresh_approval + bounded_device_action + target_device_witness + replay_lesson"
  output: "HoloShellTargetDeviceProofPack"
  validation: "ready_for_hololand only when local readiness, device inventory, target witness, and replay receipts agree"
}
