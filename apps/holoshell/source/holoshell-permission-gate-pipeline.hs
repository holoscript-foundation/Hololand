// HoloShell permission gate data-flow.

environment {
  skybox: "night"
  ambient_light: 0.25
}

object "permission_gate_receipt_source" {
  geometry: "cube"
  color: "#1f6feb"
  position: { x: -4, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  input_path: "input.permission_gate_receipt"
  format: "json"
  schema: "HoloShellPermissionGateReceiptPack"
}

object "subject_normalizer" {
  geometry: "cube"
  color: "#2ea043"
  position: { x: -2.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "subject.subjectKind;subject.provider;subject.redactedSubjectLabel;subject.subjectLabelHash"
  validation: "subject label redacted; subject hash required; credentialExtrusionAllowed false"
}

object "scope_diff_validator" {
  geometry: "cube"
  color: "#d29922"
  position: { x: -1, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "request.requestedScopes;request.minimumRequiredScopes;request.neverScopes;grant.grantedScopes"
  emits: "minimumScopeSatisfied;excessScopesAbsent;scopeDiffHash"
  validation: "granted scopes equal minimum set; never scopes absent"
}

object "grant_custody_validator" {
  geometry: "cube"
  color: "#e0af68"
  position: { x: 0.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "request.permissionEnvelope;grant.freshUserGesture;grant.hiddenAutomationUsed;grant.rawCredentialCaptured"
  blocks: "silent_oauth;cookie_scrape;token_copy;background_consent"
  validation: "fresh gesture true; hidden automation false; raw credential captured false"
}

object "verification_and_revoke_validator" {
  geometry: "cube"
  color: "#9ece6a"
  position: { x: 2, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "verification.readyForHoloLand;grant.revocationInstruction;revocation.revokeVerified"
  emits: "readyForHoloLand;revocationInstructionVisible;revokeVerified"
  validation: "ready requires verified minimum scope, no excess scope, and visible revoke path"
}

object "replay_and_task_filer" {
  geometry: "cube"
  color: "#f7768e"
  position: { x: 3.5, y: 2, z: -2 }
  scale: { x: 0.8, y: 0.3, z: 0.12 }

  reads: "replay.replayKey;replay.overbroadScopeAccepted;replay.rawCredentialCaptured;hash"
  validation: "overbroad scope and raw credential capture must be false"
}
