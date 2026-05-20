// HoloShell device safety parseable pipeline shape.
// Use object-flow source until richer pipeline blocks are accepted by the CLI.

object "device_inventory" {
  geometry: "cube"
  color: "#2f6f9f"
  source: "local_device_probe + program_registry + hardware_reality"
  output: "redacted DeviceInventoryReceipt"
  validator: "validateDeviceInventoryReceipt"
}

object "operation_preview" {
  geometry: "cube"
  color: "#437c50"
  source: "device_inventory + human_intent"
  output: "visible preview hash and action class"
  guard: "mutating actions must remain blocked during preview"
}

object "consent_receipt" {
  geometry: "cube"
  color: "#9f7a2f"
  source: "operation_preview + fresh_user_gesture"
  output: "nonce-bound DeviceConsentReceipt"
  validator: "validateDeviceConsentReceipt"
}

object "safety_envelope" {
  geometry: "cube"
  color: "#7c4d9f"
  source: "device_inventory + operation_preview + consent_receipt"
  output: "DeviceSafetyEnvelopeReceipt"
  guard: "guarded_execute requires granted consent and previewAvailable"
  validator: "validateDeviceSafetyEnvelopeReceipt"
}

object "device_action" {
  geometry: "cube"
  color: "#9f4d4d"
  source: "safety_envelope + consent_receipt + local_adapter"
  output: "DeviceActionReceipt"
  guard: "mutationExecuted cannot be true unless executionAllowed is true"
  validator: "validateDeviceActionReceipt"
}

object "target_device_proof" {
  geometry: "cube"
  color: "#b87c4f"
  source: "device_action + target_device_frame_or_capture_blocker"
  output: "HoloShellTargetDeviceProofReceipt"
  guard: "local readiness and browser support cannot unlock target_proven without target witness"
  validator: "validateHoloShellTargetDeviceProofReceipt"
}

object "replay_lesson" {
  geometry: "cube"
  color: "#5f5f5f"
  source: "operation_preview + safety_envelope + device_action + target_device_proof"
  output: "DeviceReplayLessonReceipt when blocked or failed"
  validator: "validateDeviceReplayLessonReceipt"
}

object "device_safety_pack" {
  geometry: "cube"
  color: "#4d789f"
  source: "device_inventory + safety_envelope + consent_receipt + device_action + target_device_proof + replay_lesson"
  output: "HoloShellDeviceSafetyReceiptPack"
  validator: "validateHoloShellDeviceSafetyReceiptPack"
}
