{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "object",
      "name": "WorldBuildCockpitPipelineManifest",
      "id": "WorldBuildCockpitPipelineManifest",
      "properties": {
        "type": "pipeline_manifest",
        "id": "holoshell-world-build-cockpit",
        "workflow": "ready-to-build-hololand-world",
        "defaultExecution": "read_only_preview",
        "humanJob": "use local files, verify this computer, build a HoloLand preview, show what changed",
        "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
        "policySource": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
        "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
        "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
        "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
        "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
        "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
        "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
        "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
        "outputEvidencePack": ".tmp/holoshell/world-build-cockpit.json",
        "receiptRequired": true
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 5,
          "column": 1
        },
        "end": {
          "line": 22,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "LocalFileManifestStep",
      "id": "LocalFileManifestStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "local_files",
        "order": 0,
        "adapter": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
        "mutationClass": "none",
        "validates": [
          "local_directories",
          "sensitive_path_redaction",
          "duplicate_asset_detection"
        ],
        "output": "LocalFileManifestReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 24,
          "column": 1
        },
        "end": {
          "line": 33,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "HardwareAuditStep",
      "id": "HardwareAuditStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "hardware",
        "order": 1,
        "adapter": "C:/Users/josep/.ai-ecosystem/scripts/codex-hardware-audit.mjs",
        "command": "pnpm --dir C:/Users/josep/.ai-ecosystem check:codex-hardware",
        "mutationClass": "none",
        "validates": [
          "node",
          "pnpm",
          "wasm_simd",
          "gpu",
          "webgpu",
          "browser"
        ],
        "output": "CodexHardwareAuditReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 35,
          "column": 1
        },
        "end": {
          "line": 45,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "WorktreeBoundaryStep",
      "id": "WorktreeBoundaryStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "worktree_boundary",
        "order": 2,
        "adapter": "git",
        "commands": [
          "git -C C:/Users/josep/Documents/GitHub/HoloScript status --short",
          "git -C C:/Users/josep/Documents/GitHub/Hololand status --short"
        ],
        "mutationClass": "none",
        "expectedHololandMutation": false,
        "output": "WorktreeBoundaryReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 47,
          "column": 1
        },
        "end": {
          "line": 57,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "SourceParseStep",
      "id": "SourceParseStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "source_validation",
        "order": 3,
        "adapter": "pnpm exec holoscript parse",
        "mutationClass": "none",
        "validates": [
          "apps/holoshell/source/holoshell-build-custody.hsplus",
          "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
          "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "apps/holoshell/source/holoshell-world-build-cockpit.holo",
          "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"
        ],
        "output": "SourceParseReceiptSet"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 59,
          "column": 1
        },
        "end": {
          "line": 68,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "CodebaseGraphStep",
      "id": "CodebaseGraphStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "codebase_graph",
        "order": 4,
        "adapter": "mcp.holoscript.net:holo_graph_status",
        "mutationClass": "none",
        "authoritativeRequired": false,
        "warningWhen": "cache_stale || graphAuthoritative == false",
        "output": "GraphUnavailableReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 70,
          "column": 1
        },
        "end": {
          "line": 80,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "BuildCustodyStep",
      "id": "BuildCustodyStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "build_custody",
        "order": 5,
        "adapter": "apps/holoshell/source/holoshell-build-custody.hsplus",
        "mutationClass": "silent_read",
        "directStopAllowed": false,
        "output": "BuildCustodyReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 82,
          "column": 1
        },
        "end": {
          "line": 91,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "PreviewWitnessStep",
      "id": "PreviewWitnessStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "preview_witness",
        "order": 6,
        "adapter": "apps/holoshell/source/holoshell-visual-witness.hsplus",
        "mutationClass": "guarded_preview",
        "target": "HoloLand preview room",
        "blocksPublishWhenMissing": true,
        "output": "VisualWitnessReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 93,
          "column": 1
        },
        "end": {
          "line": 103,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "AgentLaneStep",
      "id": "AgentLaneStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "agent_orchestra",
        "order": 7,
        "adapter": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
        "mutationClass": "none",
        "validates": [
          "lane_attribution",
          "unattributed_shell_run_detection",
          "duplicate_task_detection"
        ],
        "output": "AgentLaneReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 105,
          "column": 1
        },
        "end": {
          "line": 114,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "ReadinessReceiptStep",
      "id": "ReadinessReceiptStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "receipt",
        "order": 8,
        "action": "merge_gate_receipts",
        "output": "WorldBuildReadinessCockpitReceipt",
        "readinessStates": [
          "ready",
          "ready_with_warnings",
          "blocked"
        ],
        "rollbackNoteRequired": true,
        "replayPlanRequired": true
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 116,
          "column": 1
        },
        "end": {
          "line": 126,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [],
  "templates": [],
  "npcs": [],
  "traits": {},
  "loc": {
    "start": {
      "line": 1,
      "column": 1
    },
    "end": {
      "line": 127,
      "column": 1
    }
  },
  "body": [
    {
      "type": "object",
      "name": "WorldBuildCockpitPipelineManifest",
      "id": "WorldBuildCockpitPipelineManifest",
      "properties": {
        "type": "pipeline_manifest",
        "id": "holoshell-world-build-cockpit",
        "workflow": "ready-to-build-hololand-world",
        "defaultExecution": "read_only_preview",
        "humanJob": "use local files, verify this computer, build a HoloLand preview, show what changed",
        "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
        "policySource": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
        "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
        "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
        "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
        "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
        "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
        "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
        "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
        "outputEvidencePack": ".tmp/holoshell/world-build-cockpit.json",
        "receiptRequired": true
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 5,
          "column": 1
        },
        "end": {
          "line": 22,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "LocalFileManifestStep",
      "id": "LocalFileManifestStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "local_files",
        "order": 0,
        "adapter": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
        "mutationClass": "none",
        "validates": [
          "local_directories",
          "sensitive_path_redaction",
          "duplicate_asset_detection"
        ],
        "output": "LocalFileManifestReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 24,
          "column": 1
        },
        "end": {
          "line": 33,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "HardwareAuditStep",
      "id": "HardwareAuditStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "hardware",
        "order": 1,
        "adapter": "C:/Users/josep/.ai-ecosystem/scripts/codex-hardware-audit.mjs",
        "command": "pnpm --dir C:/Users/josep/.ai-ecosystem check:codex-hardware",
        "mutationClass": "none",
        "validates": [
          "node",
          "pnpm",
          "wasm_simd",
          "gpu",
          "webgpu",
          "browser"
        ],
        "output": "CodexHardwareAuditReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 35,
          "column": 1
        },
        "end": {
          "line": 45,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "WorktreeBoundaryStep",
      "id": "WorktreeBoundaryStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "worktree_boundary",
        "order": 2,
        "adapter": "git",
        "commands": [
          "git -C C:/Users/josep/Documents/GitHub/HoloScript status --short",
          "git -C C:/Users/josep/Documents/GitHub/Hololand status --short"
        ],
        "mutationClass": "none",
        "expectedHololandMutation": false,
        "output": "WorktreeBoundaryReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 47,
          "column": 1
        },
        "end": {
          "line": 57,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "SourceParseStep",
      "id": "SourceParseStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "source_validation",
        "order": 3,
        "adapter": "pnpm exec holoscript parse",
        "mutationClass": "none",
        "validates": [
          "apps/holoshell/source/holoshell-build-custody.hsplus",
          "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
          "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "apps/holoshell/source/holoshell-world-build-cockpit.holo",
          "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"
        ],
        "output": "SourceParseReceiptSet"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 59,
          "column": 1
        },
        "end": {
          "line": 68,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "CodebaseGraphStep",
      "id": "CodebaseGraphStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "codebase_graph",
        "order": 4,
        "adapter": "mcp.holoscript.net:holo_graph_status",
        "mutationClass": "none",
        "authoritativeRequired": false,
        "warningWhen": "cache_stale || graphAuthoritative == false",
        "output": "GraphUnavailableReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 70,
          "column": 1
        },
        "end": {
          "line": 80,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "BuildCustodyStep",
      "id": "BuildCustodyStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "build_custody",
        "order": 5,
        "adapter": "apps/holoshell/source/holoshell-build-custody.hsplus",
        "mutationClass": "silent_read",
        "directStopAllowed": false,
        "output": "BuildCustodyReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 82,
          "column": 1
        },
        "end": {
          "line": 91,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "PreviewWitnessStep",
      "id": "PreviewWitnessStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "preview_witness",
        "order": 6,
        "adapter": "apps/holoshell/source/holoshell-visual-witness.hsplus",
        "mutationClass": "guarded_preview",
        "target": "HoloLand preview room",
        "blocksPublishWhenMissing": true,
        "output": "VisualWitnessReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 93,
          "column": 1
        },
        "end": {
          "line": 103,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "AgentLaneStep",
      "id": "AgentLaneStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "agent_orchestra",
        "order": 7,
        "adapter": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
        "mutationClass": "none",
        "validates": [
          "lane_attribution",
          "unattributed_shell_run_detection",
          "duplicate_task_detection"
        ],
        "output": "AgentLaneReceipt"
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 105,
          "column": 1
        },
        "end": {
          "line": 114,
          "column": 2
        }
      }
    },
    {
      "type": "object",
      "name": "ReadinessReceiptStep",
      "id": "ReadinessReceiptStep",
      "properties": {
        "type": "pipeline_step",
        "workflow": "ready-to-build-hololand-world",
        "phase": "receipt",
        "order": 8,
        "action": "merge_gate_receipts",
        "output": "WorldBuildReadinessCockpitReceipt",
        "readinessStates": [
          "ready",
          "ready_with_warnings",
          "blocked"
        ],
        "rollbackNoteRequired": true,
        "replayPlanRequired": true
      },
      "directives": [],
      "children": [],
      "traits": {},
      "loc": {
        "start": {
          "line": 116,
          "column": 1
        },
        "end": {
          "line": 126,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "fragment",
    "id": "root",
    "properties": {},
    "directives": [],
    "children": [
      {
        "type": "object",
        "name": "WorldBuildCockpitPipelineManifest",
        "id": "WorldBuildCockpitPipelineManifest",
        "properties": {
          "type": "pipeline_manifest",
          "id": "holoshell-world-build-cockpit",
          "workflow": "ready-to-build-hololand-world",
          "defaultExecution": "read_only_preview",
          "humanJob": "use local files, verify this computer, build a HoloLand preview, show what changed",
          "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
          "policySource": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
          "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
          "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
          "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
          "outputEvidencePack": ".tmp/holoshell/world-build-cockpit.json",
          "receiptRequired": true
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 5,
            "column": 1
          },
          "end": {
            "line": 22,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "LocalFileManifestStep",
        "id": "LocalFileManifestStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "local_files",
          "order": 0,
          "adapter": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "mutationClass": "none",
          "validates": [
            "local_directories",
            "sensitive_path_redaction",
            "duplicate_asset_detection"
          ],
          "output": "LocalFileManifestReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 24,
            "column": 1
          },
          "end": {
            "line": 33,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "HardwareAuditStep",
        "id": "HardwareAuditStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "hardware",
          "order": 1,
          "adapter": "C:/Users/josep/.ai-ecosystem/scripts/codex-hardware-audit.mjs",
          "command": "pnpm --dir C:/Users/josep/.ai-ecosystem check:codex-hardware",
          "mutationClass": "none",
          "validates": [
            "node",
            "pnpm",
            "wasm_simd",
            "gpu",
            "webgpu",
            "browser"
          ],
          "output": "CodexHardwareAuditReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 35,
            "column": 1
          },
          "end": {
            "line": 45,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "WorktreeBoundaryStep",
        "id": "WorktreeBoundaryStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "worktree_boundary",
          "order": 2,
          "adapter": "git",
          "commands": [
            "git -C C:/Users/josep/Documents/GitHub/HoloScript status --short",
            "git -C C:/Users/josep/Documents/GitHub/Hololand status --short"
          ],
          "mutationClass": "none",
          "expectedHololandMutation": false,
          "output": "WorktreeBoundaryReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 47,
            "column": 1
          },
          "end": {
            "line": 57,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "SourceParseStep",
        "id": "SourceParseStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "source_validation",
          "order": 3,
          "adapter": "pnpm exec holoscript parse",
          "mutationClass": "none",
          "validates": [
            "apps/holoshell/source/holoshell-build-custody.hsplus",
            "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"
          ],
          "output": "SourceParseReceiptSet"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 59,
            "column": 1
          },
          "end": {
            "line": 68,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "CodebaseGraphStep",
        "id": "CodebaseGraphStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "codebase_graph",
          "order": 4,
          "adapter": "mcp.holoscript.net:holo_graph_status",
          "mutationClass": "none",
          "authoritativeRequired": false,
          "warningWhen": "cache_stale || graphAuthoritative == false",
          "output": "GraphUnavailableReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 70,
            "column": 1
          },
          "end": {
            "line": 80,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "BuildCustodyStep",
        "id": "BuildCustodyStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "build_custody",
          "order": 5,
          "adapter": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "mutationClass": "silent_read",
          "directStopAllowed": false,
          "output": "BuildCustodyReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 82,
            "column": 1
          },
          "end": {
            "line": 91,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "PreviewWitnessStep",
        "id": "PreviewWitnessStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "preview_witness",
          "order": 6,
          "adapter": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "mutationClass": "guarded_preview",
          "target": "HoloLand preview room",
          "blocksPublishWhenMissing": true,
          "output": "VisualWitnessReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 93,
            "column": 1
          },
          "end": {
            "line": 103,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "AgentLaneStep",
        "id": "AgentLaneStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "agent_orchestra",
          "order": 7,
          "adapter": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
          "mutationClass": "none",
          "validates": [
            "lane_attribution",
            "unattributed_shell_run_detection",
            "duplicate_task_detection"
          ],
          "output": "AgentLaneReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 105,
            "column": 1
          },
          "end": {
            "line": 114,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "ReadinessReceiptStep",
        "id": "ReadinessReceiptStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "receipt",
          "order": 8,
          "action": "merge_gate_receipts",
          "output": "WorldBuildReadinessCockpitReceipt",
          "readinessStates": [
            "ready",
            "ready_with_warnings",
            "blocked"
          ],
          "rollbackNoteRequired": true,
          "replayPlanRequired": true
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 116,
            "column": 1
          },
          "end": {
            "line": 126,
            "column": 2
          }
        }
      }
    ],
    "traits": {},
    "loc": {
      "start": {
        "line": 1,
        "column": 1
      },
      "end": {
        "line": 127,
        "column": 1
      }
    },
    "body": [
      {
        "type": "object",
        "name": "WorldBuildCockpitPipelineManifest",
        "id": "WorldBuildCockpitPipelineManifest",
        "properties": {
          "type": "pipeline_manifest",
          "id": "holoshell-world-build-cockpit",
          "workflow": "ready-to-build-hololand-world",
          "defaultExecution": "read_only_preview",
          "humanJob": "use local files, verify this computer, build a HoloLand preview, show what changed",
          "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
          "policySource": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
          "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
          "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
          "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
          "outputEvidencePack": ".tmp/holoshell/world-build-cockpit.json",
          "receiptRequired": true
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 5,
            "column": 1
          },
          "end": {
            "line": 22,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "LocalFileManifestStep",
        "id": "LocalFileManifestStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "local_files",
          "order": 0,
          "adapter": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "mutationClass": "none",
          "validates": [
            "local_directories",
            "sensitive_path_redaction",
            "duplicate_asset_detection"
          ],
          "output": "LocalFileManifestReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 24,
            "column": 1
          },
          "end": {
            "line": 33,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "HardwareAuditStep",
        "id": "HardwareAuditStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "hardware",
          "order": 1,
          "adapter": "C:/Users/josep/.ai-ecosystem/scripts/codex-hardware-audit.mjs",
          "command": "pnpm --dir C:/Users/josep/.ai-ecosystem check:codex-hardware",
          "mutationClass": "none",
          "validates": [
            "node",
            "pnpm",
            "wasm_simd",
            "gpu",
            "webgpu",
            "browser"
          ],
          "output": "CodexHardwareAuditReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 35,
            "column": 1
          },
          "end": {
            "line": 45,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "WorktreeBoundaryStep",
        "id": "WorktreeBoundaryStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "worktree_boundary",
          "order": 2,
          "adapter": "git",
          "commands": [
            "git -C C:/Users/josep/Documents/GitHub/HoloScript status --short",
            "git -C C:/Users/josep/Documents/GitHub/Hololand status --short"
          ],
          "mutationClass": "none",
          "expectedHololandMutation": false,
          "output": "WorktreeBoundaryReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 47,
            "column": 1
          },
          "end": {
            "line": 57,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "SourceParseStep",
        "id": "SourceParseStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "source_validation",
          "order": 3,
          "adapter": "pnpm exec holoscript parse",
          "mutationClass": "none",
          "validates": [
            "apps/holoshell/source/holoshell-build-custody.hsplus",
            "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus"
          ],
          "output": "SourceParseReceiptSet"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 59,
            "column": 1
          },
          "end": {
            "line": 68,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "CodebaseGraphStep",
        "id": "CodebaseGraphStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "codebase_graph",
          "order": 4,
          "adapter": "mcp.holoscript.net:holo_graph_status",
          "mutationClass": "none",
          "authoritativeRequired": false,
          "warningWhen": "cache_stale || graphAuthoritative == false",
          "output": "GraphUnavailableReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 70,
            "column": 1
          },
          "end": {
            "line": 80,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "BuildCustodyStep",
        "id": "BuildCustodyStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "build_custody",
          "order": 5,
          "adapter": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "mutationClass": "silent_read",
          "directStopAllowed": false,
          "output": "BuildCustodyReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 82,
            "column": 1
          },
          "end": {
            "line": 91,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "PreviewWitnessStep",
        "id": "PreviewWitnessStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "preview_witness",
          "order": 6,
          "adapter": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "mutationClass": "guarded_preview",
          "target": "HoloLand preview room",
          "blocksPublishWhenMissing": true,
          "output": "VisualWitnessReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 93,
            "column": 1
          },
          "end": {
            "line": 103,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "AgentLaneStep",
        "id": "AgentLaneStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "agent_orchestra",
          "order": 7,
          "adapter": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
          "mutationClass": "none",
          "validates": [
            "lane_attribution",
            "unattributed_shell_run_detection",
            "duplicate_task_detection"
          ],
          "output": "AgentLaneReceipt"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 105,
            "column": 1
          },
          "end": {
            "line": 114,
            "column": 2
          }
        }
      },
      {
        "type": "object",
        "name": "ReadinessReceiptStep",
        "id": "ReadinessReceiptStep",
        "properties": {
          "type": "pipeline_step",
          "workflow": "ready-to-build-hololand-world",
          "phase": "receipt",
          "order": 8,
          "action": "merge_gate_receipts",
          "output": "WorldBuildReadinessCockpitReceipt",
          "readinessStates": [
            "ready",
            "ready_with_warnings",
            "blocked"
          ],
          "rollbackNoteRequired": true,
          "replayPlanRequired": true
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 116,
            "column": 1
          },
          "end": {
            "line": 126,
            "column": 2
          }
        }
      }
    ]
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}