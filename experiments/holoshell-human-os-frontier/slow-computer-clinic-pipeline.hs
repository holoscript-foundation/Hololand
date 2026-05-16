// HoloShell slow-computer clinic data pipeline.
// Turns local process and hardware receipts into a deterministic explanation,
// owner handoff plan, guarded stop plan, and replay key.

pipeline "HoloShellSlowComputerClinicPipeline" {
  schedule: "manual"
  timeout: 180s
  retry: { max: 0 }

  source ProcessHealthReceipt {
    type: "filesystem"
    path: "${input.process_health_receipt}"
    format: "json"
    mode: "read_only"
  }

  source HardwareAuditReceipt {
    type: "filesystem"
    path: "${input.hardware_audit_receipt}"
    format: "json"
    mode: "read_only"
  }

  source RunRegistry {
    type: "filesystem"
    path: "${input.run_registry}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  transform HardwareVitals {
    riskState -> riskState
    processCount -> processCount
    shellRunCount -> shellRunCount
    staleRunCount -> staleRunCount
    highMemoryCount -> highMemoryCount
  }

  transform OwnershipPlan {
    ownerHandoffPlans -> ownerHandoffPlans
    stopPlans -> stopPlans
    ownerUnknownReviewCount -> ownerUnknownReviewCount
    actionableCleanupCandidateCount -> actionableCleanupCandidateCount
  }

  validate ReadOnlyReceiptContract {
    riskState : required, string
    processCount : required, number
    shellRunCount : required, number
    stopPlans : optional
    ownerHandoffPlans : optional
  }

  validate TerminationSafetyContract {
    automaticTerminationAllowed : required, false
    stopPolicy : required, string
    exactPidRequired : required, true
    receiptRequired : required, true
  }

  transform HumanExplanation {
    riskState -> headline
    recommendations -> visibleFindings
    ownerHandoffPlans -> ownerHandoffCards
    stopPlans -> guardedStopCards
  }

  filter NeedsOwnerHandoff {
    where: ownerHandoffCards.count > 0
  }

  filter NeedsBreakGlassApproval {
    where: guardedStopCards.count > 0
  }

  sink ClinicEvidencePack {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-16/slow-computer-clinic-evidence-pack.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }

  sink HoloMeshTaskSeed {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-16/slow-computer-clinic-holomesh-tasks.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }
}
