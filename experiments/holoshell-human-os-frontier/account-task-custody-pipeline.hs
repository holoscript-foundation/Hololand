// HoloShell account-task custody data pipeline.
// Normalizes local files, browser/account boundary, drafts, approvals,
// execution witnesses, rollback limits, and HoloMesh task seeds into one
// deterministic work receipt.

pipeline "HoloShellAccountTaskCustodyPipeline" {
  schedule: "manual"
  timeout: 180s
  retry: { max: 0 }

  source HumanIntent {
    type: "filesystem"
    path: "${input.intent_receipt}"
    format: "json"
    mode: "read_only"
  }

  source AccountBoundaryReceipt {
    type: "filesystem"
    path: "${input.account_boundary_receipt}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source SelectedLocalFiles {
    type: "filesystem"
    path: "${input.selected_files_manifest}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source DraftReceipt {
    type: "filesystem"
    path: "${input.draft_receipt}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source ApprovalPacket {
    type: "filesystem"
    path: "${input.approval_packet}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  source ExecutionWitness {
    type: "filesystem"
    path: "${input.execution_witness}"
    format: "json"
    mode: "read_only"
    optional: true
  }

  transform IntentClassification {
    intent -> plainLanguageJob
    accountTaskKind -> taskKind
    requiredProviders -> providers
    mutationKinds -> proposedMutations
    rollbackLimits -> rollbackLimits
  }

  transform BoundarySummary {
    provider -> provider
    accountLabel -> redactedAccountLabel
    oauthScopes -> scopes
    browserProfile -> browserProfile
    cookiePolicy -> cookiePolicy
    screenshotPolicy -> screenshotPolicy
  }

  validate AccountBoundaryContract {
    provider : required, string
    redactedAccountLabel : required, string
    scopes : required
    cookiePolicy : required, string
    screenshotPolicy : required, string
  }

  transform SourceSnapshot {
    selectedFiles -> sourceFiles
    fileHashes -> sourceHashes
    privacyClasses -> privacyClasses
    sourceMutationPerformed -> sourceMutationPerformed
  }

  validate SourceCustodyContract {
    sourceHashes : optional
    privacyClasses : optional
    sourceMutationPerformed : required, false
  }

  transform DraftBundle {
    emailDraft -> emailDraft
    calendarProposal -> calendarProposal
    documentPatch -> documentPatch
    attachmentManifest -> attachmentManifest
    draftHash -> draftHash
    accountMutationPerformed -> accountMutationPerformed
  }

  validate DraftOnlyContract {
    draftHash : required, string
    accountMutationPerformed : required, false
  }

  transform ApprovalReadiness {
    draftHash -> draftHash
    provider -> provider
    targetRecipients -> targetRecipients
    targetCalendar -> targetCalendar
    targetDocument -> targetDocument
    approvalId -> approvalId
    approvalNonce -> approvalNonce
    humanGestureRequired -> humanGestureRequired
  }

  validate AccountMutationApprovalContract {
    draftHash : required, string
    provider : required, string
    approvalId : optional, string
    approvalNonce : optional, string
    humanGestureRequired : required, true
  }

  filter NeedsHumanApproval {
    where: approvalId == null
  }

  sink AccountTaskEvidencePack {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-16/account-task-custody-evidence-pack.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }

  sink HoloMeshTaskSeed {
    type: "filesystem"
    path: ".bench-logs/holoshell-human-os-frontier/2026-05-16/account-task-custody-holomesh-tasks.json"
    method: "write"
    format: "json"
    on_error: { action: "log", continue: true }
  }
}
