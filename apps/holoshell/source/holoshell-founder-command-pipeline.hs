// HoloShell Founder Command Pipeline
//
// Executable-behavior source for the first flagship OS demo. The host daemon
// may render this as browser UI or Windows control calls, but the pipeline
// remains HoloScript source: intent -> plan -> approval/trust policy ->
// launcher/controller -> receipt.

object "FounderCommandPipelineManifest" {
  type: "command_pipeline_manifest"
  id: "holoshell-founder-command-pipeline"
  name: "Founder HoloShell Command Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  sourceLayer: "HoloScript"
  projection: "apps/holoshell/prototype/local-capability-room.html"
  sceneSource: "apps/holoshell/source/holoshell-shell-world.holo"
  behaviorSource: "apps/holoshell/source/holoshell-hardware-control.hsplus"
  policySource: "apps/holoshell/source/holoshell-founder-intent-policy.hsplus"
  trustSource: "apps/holoshell/source/holoshell-trusted-autonomy.hsplus"
  receiptBridge: "scripts/holoshell-founder-command.mjs"
}

object "FlagshipRoomMarathonCommand" {
  type: "command_pipeline"
  commandId: "flagship_room_marathon"
  naturalIntent: "Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube"
  actor: "brittney"
  autonomyLevel: "guarded"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  policySource: "apps/holoshell/source/holoshell-founder-intent-policy.hsplus"
  targets: ["claude", "terminal", "room", "ollama_kimi_cloud", "browser", "youtube_lofi"]
  pipeline: ["intent", "plan", "approval", "trust_gate", "launcher", "receipt"]
}

object "FlagshipIntentStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "intent"
  order: 1
  adapter: "scripts/holoshell-agent-dispatch.mjs"
  action: "classify_intent"
  confidenceFloor: 0.75
  output: ".tmp/holoshell/agent-dispatch-latest.json"
}

object "FlagshipPlanStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "plan"
  order: 2
  adapter: "scripts/holoshell-room-marathon-workflow.mjs"
  action: "build_workflow"
  targetModelRoute: "ollama_cloud"
  targetModel: "kimi-cloud"
  targets: ["claude", "terminal", "room", "ollama_kimi_cloud", "browser", "youtube_lofi"]
  output: ".tmp/holoshell/workflow-latest.json"
}

object "FlagshipApprovalStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "approval"
  order: 3
  adapter: "scripts/holoshell-workflow-approval-bundle.mjs"
  action: "mint_nonce_bound_bundle"
  policy: "guarded_execute"
  output: ".tmp/holoshell/workflow-approval-latest.json"
}

object "FlagshipTrustGateStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "trust_gate"
  order: 4
  adapter: "scripts/holoshell-brain-intent-gate.mjs"
  action: "evaluate_brain_contract"
  caseId: "holoshell-room-marathon-lofi.v0"
  executionAllowedWhen: "approval_valid && no_runtime_blockers"
  output: ".tmp/holoshell/brain-intent-gate-latest.json"
}

object "FlagshipLauncherStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "launcher"
  order: 5
  adapter: "scripts/holoshell-control-daemon.mjs"
  action: "execute_nonce_bundle"
  endpoint: "POST /workflow/execute"
  requiresExecuteFlag: true
  targetApps: ["Claude", "Windows Terminal", "Chrome"]
  targetCommands: ["ollama route kimi-cloud", "YouTube lofi"]
}

object "FlagshipReceiptStep" {
  type: "pipeline_step"
  commandId: "flagship_room_marathon"
  phase: "receipt"
  order: 6
  adapter: "scripts/holoshell-founder-command.mjs"
  action: "merge_pipeline_receipts_into_founder_command"
  outputs: [".tmp/holoshell/founder-command-latest.json", ".tmp/holoshell/workflow-latest.json", ".tmp/holoshell/workflow-approval-latest.json", ".tmp/holoshell/brain-intent-gate-latest.json", ".tmp/holoshell/live-feed.json"]
}

object "OpenExcelCommand" {
  type: "command_pipeline"
  commandId: "open_excel"
  naturalIntent: "Brittney, open Excel"
  actor: "brittney"
  autonomyLevel: "guarded"
  defaultExecution: "stage_not_run"
  receiptRequired: true
  targets: ["excel"]
  pipeline: ["intent", "launcher", "receipt"]
}

object "OpenExcelIntentStep" {
  type: "pipeline_step"
  commandId: "open_excel"
  phase: "intent"
  order: 1
  adapter: "scripts/holoshell-agent-dispatch.mjs"
  action: "route_to_open_excel"
  output: ".tmp/holoshell/agent-dispatch-latest.json"
}

object "OpenExcelLauncherStep" {
  type: "pipeline_step"
  commandId: "open_excel"
  phase: "launcher"
  order: 2
  adapter: "scripts/holoshell-action-executor.mjs"
  action: "launch_app"
  targetApp: "Excel"
  requiresApproval: true
  output: ".tmp/holoshell/action-latest.json"
}

object "OpenExcelReceiptStep" {
  type: "pipeline_step"
  commandId: "open_excel"
  phase: "receipt"
  order: 3
  action: "attach_hardware_receipt"
  output: ".tmp/holoshell/approval-latest.json"
}
