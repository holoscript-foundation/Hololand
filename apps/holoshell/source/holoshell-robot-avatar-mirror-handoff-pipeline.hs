// HoloShell Robot-Avatar Mirror Handoff Pipeline
//
// Object-based .hs manifest for mirroring live robot force/servo receipts into
// avatar IK targets and blocking payload transfer until receipts are fresh.

object "RobotAvatarMirrorHandoffPipelineManifest" {
  type: "pipeline_manifest"
  id: "robot-avatar-mirror-handoff"
  workflow: "robot-avatar-mirror-handoff"
  defaultExecution: "read_only_gap_digest"
  origin: "format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-handoff.hs"
  sampleReceiptSource: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-sample.json"
  outputGapDigest: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-gap-digest"
  receiptRequired: true
}

object "MirrorEventsSourceStep" {
  type: "pipeline_step"
  workflow: "robot-avatar-mirror-handoff"
  phase: "robot_receipt"
  order: 0
  adapter: "filesystem"
  sourcePath: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-sample.json"
  sourceFormat: "json"
  mutationClass: "none"
  output: "MirrorEventReceiptSet"
}

object "NormalizeMirrorReceiptsStep" {
  type: "pipeline_step"
  workflow: "robot-avatar-mirror-handoff"
  phase: "avatar_ik"
  order: 1
  mutationClass: "none"
  projection: ["phase", "surface", "status"]
  output: "NormalizedMirrorReceiptSet"
}

object "NonPassingMirrorReceiptsStep" {
  type: "pipeline_step"
  workflow: "robot-avatar-mirror-handoff"
  phase: "gap_filter"
  order: 2
  mutationClass: "none"
  predicate: "status != pass"
  output: "NonPassingMirrorReceiptSet"
}

object "MirrorGapContractStep" {
  type: "pipeline_step"
  workflow: "robot-avatar-mirror-handoff"
  phase: "gap_contract"
  order: 3
  mutationClass: "none"
  requiredFields: ["phase:string", "surface:string", "status:string"]
  output: "MirrorGapContractReceipt"
}

object "MirrorGapDigestStep" {
  type: "pipeline_step"
  workflow: "robot-avatar-mirror-handoff"
  phase: "payload_transfer"
  order: 4
  adapter: "filesystem"
  sinkPath: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-gap-digest"
  sinkFormat: "json"
  mutationClass: "guarded_write"
  readiness: "blocked_until_robot_and_avatar_receipts_pass"
  output: "MirrorGapDigestReceipt"
}
