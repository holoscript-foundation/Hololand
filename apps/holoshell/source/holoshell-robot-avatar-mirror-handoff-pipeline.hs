// HoloShell Robot-Avatar Mirror Handoff Pipeline
//
// Pipeline for mirroring live robot force/servo receipts into avatar IK
// targets and gating payload transfer on receipt freshness.
//
// Origin: format-stress/2026-05-19_codex-format-realism-ratchet/novel/
// robot-avatar-mirror-handoff.hs
//
// Three phases: robot_receipt (partial), avatar_ik (partial), payload_transfer
// (blocked). The pipeline normalizes receipts, filters non-passing rows, and
// sinks a gap digest showing which phases are partial or blocked.

pipeline "RobotAvatarMirrorHandoffReceipts" {
  schedule: "manual"
  timeout: 30s

  source MirrorEvents {
    type: "filesystem"
    path: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-sample.json"
    format: "json"
  }

  transform NormalizeMirrorReceipts {
    phase -> phase
    surface -> surface
    status -> status
  }

  filter NonPassingMirrorReceipts {
    where: status != "pass"
  }

  validate MirrorGapContract {
    phase   : required, string
    surface : required, string
    status  : required, string
  }

  sink MirrorGapDigest {
    type: "filesystem"
    path: ".bench-logs/format-stress/2026-05-19_codex-format-realism-ratchet/novel/robot-avatar-mirror-gap-digest"
    method: "write"
    format: "json"
  }
}