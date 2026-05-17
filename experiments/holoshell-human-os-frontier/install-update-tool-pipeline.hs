// HoloShell install/update tool custody data pipeline.
// Normalizes package inventory, machine preflight, approval, mutation,
// launch verification, rollback limits, and HoloMesh task seeds.

pipeline "HoloShellInstallUpdateToolPipeline" {
  schedule: "manual"
  timeout: 300s
  retry: { max: 0 }

  source PackageInventory {
    type: "filesystem"
    path: "${input.package_inventory_receipt}"
    format: "json"
    mode: "read_only"
  }

  source MachinePreflight {
    type: "filesystem"
    path: "${input.machine_preflight_receipt}"
    format: "json"
    mode: "read_only"
  }

  source ApprovalPacket {
    type: "filesystem"
    path: "${input.approval_packet}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source PackageMutationReceipt {
    type: "filesystem"
    path: "${input.package_mutation_receipt}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source LaunchVerificationReceipt {
    type: "filesystem"
    path: "${input.launch_verification_receipt}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  transform PackageIdentity {
    packageId -> packageId
    publisher -> publisher
    source -> packageSource
    currentVersion -> currentVersion
    availableVersion -> availableVersion
    installerType -> installerType
  }

  validate PackageIdentityContract {
    packageId : required, string
    packageSource : required, string
    currentVersion : optional, string
    availableVersion : optional, string
  }

  transform PreflightSummary {
    diskFreeBytes -> diskFreeBytes
    networkPolicy -> networkPolicy
    adminRequired -> adminRequired
    isAdministrator -> isAdministrator
    runningConflicts -> runningConflicts
    processRisk -> processRisk
  }

  validate PreflightContract {
    diskFreeBytes : required, number
    networkPolicy : required, string
    isAdministrator : required, boolean
    processRisk : required, string
  }

  transform MutationPlan {
    downloadUrl -> downloadUrl
    installerHash -> installerHash
    plannedMutations -> plannedMutations
    rollbackPlan -> rollbackPlan
    rollbackLimit -> rollbackLimit
  }

  validate MutationApprovalContract {
    packageId : required, string
    fromVersion : required, string
    toVersion : required, string
    approvalId : optional, string
    approvalNonce : optional, string
    humanGestureRequired : required, true
    breakGlass : required, true
  }

  validate LaunchVerificationContract {
    binaryPath : required, string
    binaryExists : required, true
    versionCommandPassed : required, true
    installedVersion : required, string
    launchVerified : required, true
  }

  filter NeedsHumanApproval {
    where: approvalId == null
  }

  filter NeedsRollbackWarning {
    where: rollbackLimit != null
  }

  sink InstallUpdateEvidencePack {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-17/install-update-tool-evidence-pack.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }

  sink HoloMeshTaskSeed {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-17/install-update-tool-holomesh-tasks.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }
}
