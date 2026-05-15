// HoloShell Founder Command Pipeline
//
// Executable-behavior source for the first flagship OS demo. The host daemon
// may render this as browser UI or Windows control calls, but the pipeline
// remains HoloScript source: intent -> plan -> approval/trust policy ->
// launcher/controller -> receipt.

meta {
  id: "holoshell-founder-command-pipeline"
  name: "Founder HoloShell Command Pipeline"
  version: "0.1.0"
  shell: "HoloShell"
  source_layer: "HoloScript"
  projection: "apps/holoshell/prototype/local-capability-room.html"
}

command flagship_room_marathon {
  natural_intent: "Brittney, open Claude, start a room marathon using Ollama Kimi Cloud, open a browser, and play lofi music on YouTube"
  actor: "brittney"
  autonomy_level: "guarded"
  default_execution: "stage_not_run"
  receipt_required: true

  sources: {
    scene: "apps/holoshell/source/holoshell-shell-world.holo"
    behavior: "apps/holoshell/source/holoshell-hardware-control.hsplus"
    policy: "apps/holoshell/source/holoshell-founder-intent-policy.hsplus"
    trust: "apps/holoshell/source/holoshell-trusted-autonomy.hsplus"
  }

  pipeline {
    step intent {
      adapter: "scripts/holoshell-agent-dispatch.mjs"
      action: "classify_intent"
      confidence_floor: 0.75
      output: ".tmp/holoshell/agent-dispatch-latest.json"
    }

    step plan {
      adapter: "scripts/holoshell-room-marathon-workflow.mjs"
      action: "build_workflow"
      target_model_route: "ollama_cloud"
      target_model: "kimi-cloud"
      targets: ["claude", "terminal", "room", "ollama_kimi_cloud", "browser", "youtube_lofi"]
      output: ".tmp/holoshell/workflow-latest.json"
    }

    step approval {
      adapter: "scripts/holoshell-workflow-approval-bundle.mjs"
      action: "mint_nonce_bound_bundle"
      policy: "guarded_execute"
      output: ".tmp/holoshell/workflow-approval-latest.json"
    }

    step trust_gate {
      adapter: "scripts/holoshell-brain-intent-gate.mjs"
      action: "evaluate_brain_contract"
      case_id: "holoshell-room-marathon-lofi.v0"
      execution_allowed_when: "approval_valid && no_runtime_blockers"
      output: ".tmp/holoshell/brain-intent-gate-latest.json"
    }

    step launcher {
      adapter: "scripts/holoshell-control-daemon.mjs"
      action: "execute_nonce_bundle"
      endpoint: "POST /workflow/execute"
      requires_execute_flag: true
      target_apps: ["Claude", "Windows Terminal", "Chrome"]
      target_commands: ["ollama route kimi-cloud", "YouTube lofi"]
    }

    step receipt {
      adapter: "scripts/holoshell-live-feed.mjs"
      action: "merge_receipts_into_shell_memory"
      outputs: [
        ".tmp/holoshell/workflow-latest.json",
        ".tmp/holoshell/workflow-approval-latest.json",
        ".tmp/holoshell/brain-intent-gate-latest.json",
        ".tmp/holoshell/live-feed.json"
      ]
    }
  }
}

command open_excel {
  natural_intent: "Brittney, open Excel"
  actor: "brittney"
  autonomy_level: "guarded"
  default_execution: "stage_not_run"
  receipt_required: true

  pipeline {
    step intent {
      adapter: "scripts/holoshell-agent-dispatch.mjs"
      action: "route_to_open_excel"
      output: ".tmp/holoshell/agent-dispatch-latest.json"
    }

    step launcher {
      adapter: "scripts/holoshell-action-executor.mjs"
      action: "launch_app"
      target_app: "Excel"
      requires_approval: true
      output: ".tmp/holoshell/action-latest.json"
    }

    step receipt {
      action: "attach_hardware_receipt"
      output: ".tmp/holoshell/approval-latest.json"
    }
  }
}
