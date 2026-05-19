{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Hardware Reality Bridge",
      "id": "HoloShell Hardware Reality Bridge",
      "properties": {
        "room": "HardwareRealityRoom",
        "policy": "MutationRequiresPreflight"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Hardware Reality Bridge",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
            "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
            "defaultMode": "read_only_projection"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 9,
              "column": 3
            },
            "end": {
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "processCount": 0,
            "shellRunCount": 0,
            "laneAttributedShellRunCount": 0,
            "unattributedShellRunCount": 0,
            "cleanupCandidateCount": 0,
            "ownerHandoffPlanCount": 0,
            "listenerCount": 0,
            "legacyAppCount": 0,
            "terminationPreflightCount": 0,
            "riskState": "unknown",
            "fallbackActive": false,
            "destructiveActionsTaken": false,
            "lastSnapshotHash": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 18,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:reality",
          "id": "holoshell:hardware:reality",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "MCP-backed hardware snapshot projected into HoloLand"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 40,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:lane",
          "id": "holoshell:hardware:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent lane objects created from the HoloShell run registry"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 42,
              "column": 3
            },
            "end": {
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:run",
          "id": "holoshell:hardware:run",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Shell run objects with observed agent-lane ownership evidence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 52,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:legacy_app",
          "id": "holoshell:hardware:legacy_app",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Legacy app custody objects before any UI or setting mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 54,
              "column": 3
            },
            "end": {
              "line": 58,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:preflight",
          "id": "holoshell:hardware:preflight",
          "properties": {
            "type": "request_response",
            "priority": "critical",
            "description": "Required safety gates before process, file, or legacy-app mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "HardwareLane",
          "properties": {
            "type": "ui",
            "uiType": "hardware_lane",
            "laneId": "",
            "label": "",
            "surfaceKind": "",
            "colorHint": "",
            "pidLinks": [],
            "runIds": [],
            "pidCount": 0,
            "runCount": 0,
            "colorIsVisualHintOnly": true,
            "semanticTruthRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 80,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "ShellRunObject",
          "properties": {
            "type": "machine",
            "machineType": "shell_run",
            "pid": 0,
            "parentPid": 0,
            "ownerLaneId": "",
            "ownerEvidence": "",
            "processName": "",
            "healthState": "observed",
            "actionClass": "observed",
            "cleanupEligible": false,
            "ownerHandoffRequired": false,
            "listeningPorts": [],
            "commandHashOnly": true,
            "rawCommandHidden": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 82,
              "column": 3
            },
            "end": {
              "line": 98,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LegacyAppObject",
          "properties": {
            "type": "machine",
            "machineType": "legacy_app",
            "appName": "",
            "observedProcessCount": 0,
            "mutationPolicy": "preflight_required",
            "rollbackPlanRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 108,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_hardware_reality",
          "id": "consume_hardware_reality",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 201,
              "column": 3
            },
            "end": {
              "line": 235,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_lane",
          "id": "render_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 237,
              "column": 3
            },
            "end": {
              "line": 251,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_shell_run",
          "id": "render_shell_run",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 253,
              "column": 3
            },
            "end": {
              "line": 268,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_legacy_app",
          "id": "render_legacy_app",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 270,
              "column": 3
            },
            "end": {
              "line": 278,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "request_mutation_preflight",
          "id": "request_mutation_preflight",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
          "loc": {
            "start": {
              "line": 280,
              "column": 3
            },
            "end": {
              "line": 290,
              "column": 4
            }
          }
        }
      ],
      "traits": {},
      "body": {
        "systems": [],
        "configs": [],
        "children": [
          {
            "type": "config",
            "properties": {
              "title": "Hardware Reality Bridge",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
              "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
              "defaultMode": "read_only_projection"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 9,
                "column": 3
              },
              "end": {
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "processCount": 0,
              "shellRunCount": 0,
              "laneAttributedShellRunCount": 0,
              "unattributedShellRunCount": 0,
              "cleanupCandidateCount": 0,
              "ownerHandoffPlanCount": 0,
              "listenerCount": 0,
              "legacyAppCount": 0,
              "terminationPreflightCount": 0,
              "riskState": "unknown",
              "fallbackActive": false,
              "destructiveActionsTaken": false,
              "lastSnapshotHash": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 18,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:reality",
            "id": "holoshell:hardware:reality",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "MCP-backed hardware snapshot projected into HoloLand"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 40,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:lane",
            "id": "holoshell:hardware:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent lane objects created from the HoloShell run registry"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 42,
                "column": 3
              },
              "end": {
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:run",
            "id": "holoshell:hardware:run",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Shell run objects with observed agent-lane ownership evidence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 52,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:legacy_app",
            "id": "holoshell:hardware:legacy_app",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Legacy app custody objects before any UI or setting mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 54,
                "column": 3
              },
              "end": {
                "line": 58,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:preflight",
            "id": "holoshell:hardware:preflight",
            "properties": {
              "type": "request_response",
              "priority": "critical",
              "description": "Required safety gates before process, file, or legacy-app mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "HardwareLane",
            "properties": {
              "type": "ui",
              "uiType": "hardware_lane",
              "laneId": "",
              "label": "",
              "surfaceKind": "",
              "colorHint": "",
              "pidLinks": [],
              "runIds": [],
              "pidCount": 0,
              "runCount": 0,
              "colorIsVisualHintOnly": true,
              "semanticTruthRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "ShellRunObject",
            "properties": {
              "type": "machine",
              "machineType": "shell_run",
              "pid": 0,
              "parentPid": 0,
              "ownerLaneId": "",
              "ownerEvidence": "",
              "processName": "",
              "healthState": "observed",
              "actionClass": "observed",
              "cleanupEligible": false,
              "ownerHandoffRequired": false,
              "listeningPorts": [],
              "commandHashOnly": true,
              "rawCommandHidden": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 82,
                "column": 3
              },
              "end": {
                "line": 98,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LegacyAppObject",
            "properties": {
              "type": "machine",
              "machineType": "legacy_app",
              "appName": "",
              "observedProcessCount": 0,
              "mutationPolicy": "preflight_required",
              "rollbackPlanRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 108,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_hardware_reality",
            "id": "consume_hardware_reality",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 201,
                "column": 3
              },
              "end": {
                "line": 235,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_lane",
            "id": "render_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 237,
                "column": 3
              },
              "end": {
                "line": 251,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_shell_run",
            "id": "render_shell_run",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 253,
                "column": 3
              },
              "end": {
                "line": 268,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_legacy_app",
            "id": "render_legacy_app",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 270,
                "column": 3
              },
              "end": {
                "line": 278,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "request_mutation_preflight",
            "id": "request_mutation_preflight",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
            "loc": {
              "start": {
                "line": 280,
                "column": 3
              },
              "end": {
                "line": 290,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "HardwareRealityRoom",
          "policy": "MutationRequiresPreflight"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 291,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Hardware Reality Bridge",
      "id": "HoloShell Hardware Reality Bridge",
      "properties": {
        "room": "HardwareRealityRoom",
        "policy": "MutationRequiresPreflight"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Hardware Reality Bridge",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
            "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
            "defaultMode": "read_only_projection"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 9,
              "column": 3
            },
            "end": {
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "processCount": 0,
            "shellRunCount": 0,
            "laneAttributedShellRunCount": 0,
            "unattributedShellRunCount": 0,
            "cleanupCandidateCount": 0,
            "ownerHandoffPlanCount": 0,
            "listenerCount": 0,
            "legacyAppCount": 0,
            "terminationPreflightCount": 0,
            "riskState": "unknown",
            "fallbackActive": false,
            "destructiveActionsTaken": false,
            "lastSnapshotHash": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 18,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:reality",
          "id": "holoshell:hardware:reality",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "MCP-backed hardware snapshot projected into HoloLand"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 40,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:lane",
          "id": "holoshell:hardware:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent lane objects created from the HoloShell run registry"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 42,
              "column": 3
            },
            "end": {
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:run",
          "id": "holoshell:hardware:run",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Shell run objects with observed agent-lane ownership evidence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 52,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:legacy_app",
          "id": "holoshell:hardware:legacy_app",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Legacy app custody objects before any UI or setting mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 54,
              "column": 3
            },
            "end": {
              "line": 58,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:preflight",
          "id": "holoshell:hardware:preflight",
          "properties": {
            "type": "request_response",
            "priority": "critical",
            "description": "Required safety gates before process, file, or legacy-app mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "HardwareLane",
          "properties": {
            "type": "ui",
            "uiType": "hardware_lane",
            "laneId": "",
            "label": "",
            "surfaceKind": "",
            "colorHint": "",
            "pidLinks": [],
            "runIds": [],
            "pidCount": 0,
            "runCount": 0,
            "colorIsVisualHintOnly": true,
            "semanticTruthRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 80,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "ShellRunObject",
          "properties": {
            "type": "machine",
            "machineType": "shell_run",
            "pid": 0,
            "parentPid": 0,
            "ownerLaneId": "",
            "ownerEvidence": "",
            "processName": "",
            "healthState": "observed",
            "actionClass": "observed",
            "cleanupEligible": false,
            "ownerHandoffRequired": false,
            "listeningPorts": [],
            "commandHashOnly": true,
            "rawCommandHidden": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 82,
              "column": 3
            },
            "end": {
              "line": 98,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LegacyAppObject",
          "properties": {
            "type": "machine",
            "machineType": "legacy_app",
            "appName": "",
            "observedProcessCount": 0,
            "mutationPolicy": "preflight_required",
            "rollbackPlanRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 108,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_hardware_reality",
          "id": "consume_hardware_reality",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 201,
              "column": 3
            },
            "end": {
              "line": 235,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_lane",
          "id": "render_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 237,
              "column": 3
            },
            "end": {
              "line": 251,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_shell_run",
          "id": "render_shell_run",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 253,
              "column": 3
            },
            "end": {
              "line": 268,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_legacy_app",
          "id": "render_legacy_app",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 270,
              "column": 3
            },
            "end": {
              "line": 278,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "request_mutation_preflight",
          "id": "request_mutation_preflight",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
          "loc": {
            "start": {
              "line": 280,
              "column": 3
            },
            "end": {
              "line": 290,
              "column": 4
            }
          }
        }
      ],
      "traits": {},
      "body": {
        "systems": [],
        "configs": [],
        "children": [
          {
            "type": "config",
            "properties": {
              "title": "Hardware Reality Bridge",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
              "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
              "defaultMode": "read_only_projection"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 9,
                "column": 3
              },
              "end": {
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "processCount": 0,
              "shellRunCount": 0,
              "laneAttributedShellRunCount": 0,
              "unattributedShellRunCount": 0,
              "cleanupCandidateCount": 0,
              "ownerHandoffPlanCount": 0,
              "listenerCount": 0,
              "legacyAppCount": 0,
              "terminationPreflightCount": 0,
              "riskState": "unknown",
              "fallbackActive": false,
              "destructiveActionsTaken": false,
              "lastSnapshotHash": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 18,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:reality",
            "id": "holoshell:hardware:reality",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "MCP-backed hardware snapshot projected into HoloLand"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 40,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:lane",
            "id": "holoshell:hardware:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent lane objects created from the HoloShell run registry"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 42,
                "column": 3
              },
              "end": {
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:run",
            "id": "holoshell:hardware:run",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Shell run objects with observed agent-lane ownership evidence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 52,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:legacy_app",
            "id": "holoshell:hardware:legacy_app",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Legacy app custody objects before any UI or setting mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 54,
                "column": 3
              },
              "end": {
                "line": 58,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:preflight",
            "id": "holoshell:hardware:preflight",
            "properties": {
              "type": "request_response",
              "priority": "critical",
              "description": "Required safety gates before process, file, or legacy-app mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "HardwareLane",
            "properties": {
              "type": "ui",
              "uiType": "hardware_lane",
              "laneId": "",
              "label": "",
              "surfaceKind": "",
              "colorHint": "",
              "pidLinks": [],
              "runIds": [],
              "pidCount": 0,
              "runCount": 0,
              "colorIsVisualHintOnly": true,
              "semanticTruthRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "ShellRunObject",
            "properties": {
              "type": "machine",
              "machineType": "shell_run",
              "pid": 0,
              "parentPid": 0,
              "ownerLaneId": "",
              "ownerEvidence": "",
              "processName": "",
              "healthState": "observed",
              "actionClass": "observed",
              "cleanupEligible": false,
              "ownerHandoffRequired": false,
              "listeningPorts": [],
              "commandHashOnly": true,
              "rawCommandHidden": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 82,
                "column": 3
              },
              "end": {
                "line": 98,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LegacyAppObject",
            "properties": {
              "type": "machine",
              "machineType": "legacy_app",
              "appName": "",
              "observedProcessCount": 0,
              "mutationPolicy": "preflight_required",
              "rollbackPlanRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 108,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_hardware_reality",
            "id": "consume_hardware_reality",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 201,
                "column": 3
              },
              "end": {
                "line": 235,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_lane",
            "id": "render_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 237,
                "column": 3
              },
              "end": {
                "line": 251,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_shell_run",
            "id": "render_shell_run",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 253,
                "column": 3
              },
              "end": {
                "line": 268,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_legacy_app",
            "id": "render_legacy_app",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 270,
                "column": 3
              },
              "end": {
                "line": 278,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "request_mutation_preflight",
            "id": "request_mutation_preflight",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
            "loc": {
              "start": {
                "line": 280,
                "column": 3
              },
              "end": {
                "line": 290,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "HardwareRealityRoom",
          "policy": "MutationRequiresPreflight"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 291,
          "column": 2
        }
      }
    }
  ],
  "templates": [],
  "npcs": [],
  "traits": {},
  "loc": {
    "start": {
      "line": 8,
      "column": 1
    },
    "end": {
      "line": 291,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Hardware Reality Bridge",
      "id": "HoloShell Hardware Reality Bridge",
      "properties": {
        "room": "HardwareRealityRoom",
        "policy": "MutationRequiresPreflight"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Hardware Reality Bridge",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
            "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
            "defaultMode": "read_only_projection"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 9,
              "column": 3
            },
            "end": {
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "processCount": 0,
            "shellRunCount": 0,
            "laneAttributedShellRunCount": 0,
            "unattributedShellRunCount": 0,
            "cleanupCandidateCount": 0,
            "ownerHandoffPlanCount": 0,
            "listenerCount": 0,
            "legacyAppCount": 0,
            "terminationPreflightCount": 0,
            "riskState": "unknown",
            "fallbackActive": false,
            "destructiveActionsTaken": false,
            "lastSnapshotHash": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 18,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:reality",
          "id": "holoshell:hardware:reality",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "MCP-backed hardware snapshot projected into HoloLand"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 40,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:lane",
          "id": "holoshell:hardware:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent lane objects created from the HoloShell run registry"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 42,
              "column": 3
            },
            "end": {
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:run",
          "id": "holoshell:hardware:run",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Shell run objects with observed agent-lane ownership evidence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 52,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:legacy_app",
          "id": "holoshell:hardware:legacy_app",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Legacy app custody objects before any UI or setting mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 54,
              "column": 3
            },
            "end": {
              "line": 58,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:preflight",
          "id": "holoshell:hardware:preflight",
          "properties": {
            "type": "request_response",
            "priority": "critical",
            "description": "Required safety gates before process, file, or legacy-app mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "HardwareLane",
          "properties": {
            "type": "ui",
            "uiType": "hardware_lane",
            "laneId": "",
            "label": "",
            "surfaceKind": "",
            "colorHint": "",
            "pidLinks": [],
            "runIds": [],
            "pidCount": 0,
            "runCount": 0,
            "colorIsVisualHintOnly": true,
            "semanticTruthRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 80,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "ShellRunObject",
          "properties": {
            "type": "machine",
            "machineType": "shell_run",
            "pid": 0,
            "parentPid": 0,
            "ownerLaneId": "",
            "ownerEvidence": "",
            "processName": "",
            "healthState": "observed",
            "actionClass": "observed",
            "cleanupEligible": false,
            "ownerHandoffRequired": false,
            "listeningPorts": [],
            "commandHashOnly": true,
            "rawCommandHidden": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 82,
              "column": 3
            },
            "end": {
              "line": 98,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LegacyAppObject",
          "properties": {
            "type": "machine",
            "machineType": "legacy_app",
            "appName": "",
            "observedProcessCount": 0,
            "mutationPolicy": "preflight_required",
            "rollbackPlanRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 108,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_hardware_reality",
          "id": "consume_hardware_reality",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 201,
              "column": 3
            },
            "end": {
              "line": 235,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_lane",
          "id": "render_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 237,
              "column": 3
            },
            "end": {
              "line": 251,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_shell_run",
          "id": "render_shell_run",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 253,
              "column": 3
            },
            "end": {
              "line": 268,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_legacy_app",
          "id": "render_legacy_app",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 270,
              "column": 3
            },
            "end": {
              "line": 278,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "request_mutation_preflight",
          "id": "request_mutation_preflight",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
          "loc": {
            "start": {
              "line": 280,
              "column": 3
            },
            "end": {
              "line": 290,
              "column": 4
            }
          }
        }
      ],
      "traits": {},
      "body": {
        "systems": [],
        "configs": [],
        "children": [
          {
            "type": "config",
            "properties": {
              "title": "Hardware Reality Bridge",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
              "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
              "defaultMode": "read_only_projection"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 9,
                "column": 3
              },
              "end": {
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "processCount": 0,
              "shellRunCount": 0,
              "laneAttributedShellRunCount": 0,
              "unattributedShellRunCount": 0,
              "cleanupCandidateCount": 0,
              "ownerHandoffPlanCount": 0,
              "listenerCount": 0,
              "legacyAppCount": 0,
              "terminationPreflightCount": 0,
              "riskState": "unknown",
              "fallbackActive": false,
              "destructiveActionsTaken": false,
              "lastSnapshotHash": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 18,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:reality",
            "id": "holoshell:hardware:reality",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "MCP-backed hardware snapshot projected into HoloLand"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 40,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:lane",
            "id": "holoshell:hardware:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent lane objects created from the HoloShell run registry"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 42,
                "column": 3
              },
              "end": {
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:run",
            "id": "holoshell:hardware:run",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Shell run objects with observed agent-lane ownership evidence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 52,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:legacy_app",
            "id": "holoshell:hardware:legacy_app",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Legacy app custody objects before any UI or setting mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 54,
                "column": 3
              },
              "end": {
                "line": 58,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:preflight",
            "id": "holoshell:hardware:preflight",
            "properties": {
              "type": "request_response",
              "priority": "critical",
              "description": "Required safety gates before process, file, or legacy-app mutation"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "HardwareLane",
            "properties": {
              "type": "ui",
              "uiType": "hardware_lane",
              "laneId": "",
              "label": "",
              "surfaceKind": "",
              "colorHint": "",
              "pidLinks": [],
              "runIds": [],
              "pidCount": 0,
              "runCount": 0,
              "colorIsVisualHintOnly": true,
              "semanticTruthRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "ShellRunObject",
            "properties": {
              "type": "machine",
              "machineType": "shell_run",
              "pid": 0,
              "parentPid": 0,
              "ownerLaneId": "",
              "ownerEvidence": "",
              "processName": "",
              "healthState": "observed",
              "actionClass": "observed",
              "cleanupEligible": false,
              "ownerHandoffRequired": false,
              "listeningPorts": [],
              "commandHashOnly": true,
              "rawCommandHidden": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 82,
                "column": 3
              },
              "end": {
                "line": 98,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LegacyAppObject",
            "properties": {
              "type": "machine",
              "machineType": "legacy_app",
              "appName": "",
              "observedProcessCount": 0,
              "mutationPolicy": "preflight_required",
              "rollbackPlanRequired": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 108,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_hardware_reality",
            "id": "consume_hardware_reality",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 201,
                "column": 3
              },
              "end": {
                "line": 235,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_lane",
            "id": "render_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 237,
                "column": 3
              },
              "end": {
                "line": 251,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_shell_run",
            "id": "render_shell_run",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 253,
                "column": 3
              },
              "end": {
                "line": 268,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_legacy_app",
            "id": "render_legacy_app",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 270,
                "column": 3
              },
              "end": {
                "line": 278,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "request_mutation_preflight",
            "id": "request_mutation_preflight",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
            "loc": {
              "start": {
                "line": 280,
                "column": 3
              },
              "end": {
                "line": 290,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "HardwareRealityRoom",
          "policy": "MutationRequiresPreflight"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 291,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Hardware Reality Bridge",
    "id": "HoloShell Hardware Reality Bridge",
    "properties": {
      "room": "HardwareRealityRoom",
      "policy": "MutationRequiresPreflight"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Hardware Reality Bridge",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
          "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
          "defaultMode": "read_only_projection"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 9,
            "column": 3
          },
          "end": {
            "line": 16,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "laneCount": 0,
          "activeLaneCount": 0,
          "processCount": 0,
          "shellRunCount": 0,
          "laneAttributedShellRunCount": 0,
          "unattributedShellRunCount": 0,
          "cleanupCandidateCount": 0,
          "ownerHandoffPlanCount": 0,
          "listenerCount": 0,
          "legacyAppCount": 0,
          "terminationPreflightCount": 0,
          "riskState": "unknown",
          "fallbackActive": false,
          "destructiveActionsTaken": false,
          "lastSnapshotHash": ""
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 18,
            "column": 3
          },
          "end": {
            "line": 34,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:reality",
        "id": "holoshell:hardware:reality",
        "properties": {
          "type": "pub_sub",
          "priority": "critical",
          "description": "MCP-backed hardware snapshot projected into HoloLand"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 36,
            "column": 3
          },
          "end": {
            "line": 40,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:lane",
        "id": "holoshell:hardware:lane",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Agent lane objects created from the HoloShell run registry"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 42,
            "column": 3
          },
          "end": {
            "line": 46,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:run",
        "id": "holoshell:hardware:run",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Shell run objects with observed agent-lane ownership evidence"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 48,
            "column": 3
          },
          "end": {
            "line": 52,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:legacy_app",
        "id": "holoshell:hardware:legacy_app",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Legacy app custody objects before any UI or setting mutation"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 54,
            "column": 3
          },
          "end": {
            "line": 58,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:preflight",
        "id": "holoshell:hardware:preflight",
        "properties": {
          "type": "request_response",
          "priority": "critical",
          "description": "Required safety gates before process, file, or legacy-app mutation"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 60,
            "column": 3
          },
          "end": {
            "line": 64,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "HardwareLane",
        "properties": {
          "type": "ui",
          "uiType": "hardware_lane",
          "laneId": "",
          "label": "",
          "surfaceKind": "",
          "colorHint": "",
          "pidLinks": [],
          "runIds": [],
          "pidCount": 0,
          "runCount": 0,
          "colorIsVisualHintOnly": true,
          "semanticTruthRequired": true,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 66,
            "column": 3
          },
          "end": {
            "line": 80,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "ShellRunObject",
        "properties": {
          "type": "machine",
          "machineType": "shell_run",
          "pid": 0,
          "parentPid": 0,
          "ownerLaneId": "",
          "ownerEvidence": "",
          "processName": "",
          "healthState": "observed",
          "actionClass": "observed",
          "cleanupEligible": false,
          "ownerHandoffRequired": false,
          "listeningPorts": [],
          "commandHashOnly": true,
          "rawCommandHidden": true,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 82,
            "column": 3
          },
          "end": {
            "line": 98,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "LegacyAppObject",
        "properties": {
          "type": "machine",
          "machineType": "legacy_app",
          "appName": "",
          "observedProcessCount": 0,
          "mutationPolicy": "preflight_required",
          "rollbackPlanRequired": true,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 100,
            "column": 3
          },
          "end": {
            "line": 108,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_hardware_reality",
        "id": "consume_hardware_reality",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 201,
            "column": 3
          },
          "end": {
            "line": 235,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "render_lane",
        "id": "render_lane",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 237,
            "column": 3
          },
          "end": {
            "line": 251,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "render_shell_run",
        "id": "render_shell_run",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 253,
            "column": 3
          },
          "end": {
            "line": 268,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "render_legacy_app",
        "id": "render_legacy_app",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 270,
            "column": 3
          },
          "end": {
            "line": 278,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "request_mutation_preflight",
        "id": "request_mutation_preflight",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
        "loc": {
          "start": {
            "line": 280,
            "column": 3
          },
          "end": {
            "line": 290,
            "column": 4
          }
        }
      }
    ],
    "traits": {},
    "body": {
      "systems": [],
      "configs": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Hardware Reality Bridge",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-hardware-reality-bridge.mjs",
            "upstreamMcp": "C:/Users/josep/.ai-ecosystem/scripts/holoshell-mcp-stdio.mjs",
            "defaultMode": "read_only_projection"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 9,
              "column": 3
            },
            "end": {
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "processCount": 0,
            "shellRunCount": 0,
            "laneAttributedShellRunCount": 0,
            "unattributedShellRunCount": 0,
            "cleanupCandidateCount": 0,
            "ownerHandoffPlanCount": 0,
            "listenerCount": 0,
            "legacyAppCount": 0,
            "terminationPreflightCount": 0,
            "riskState": "unknown",
            "fallbackActive": false,
            "destructiveActionsTaken": false,
            "lastSnapshotHash": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 18,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:reality",
          "id": "holoshell:hardware:reality",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "MCP-backed hardware snapshot projected into HoloLand"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 40,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:lane",
          "id": "holoshell:hardware:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent lane objects created from the HoloShell run registry"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 42,
              "column": 3
            },
            "end": {
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:run",
          "id": "holoshell:hardware:run",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Shell run objects with observed agent-lane ownership evidence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 52,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:legacy_app",
          "id": "holoshell:hardware:legacy_app",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Legacy app custody objects before any UI or setting mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 54,
              "column": 3
            },
            "end": {
              "line": 58,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:preflight",
          "id": "holoshell:hardware:preflight",
          "properties": {
            "type": "request_response",
            "priority": "critical",
            "description": "Required safety gates before process, file, or legacy-app mutation"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "HardwareLane",
          "properties": {
            "type": "ui",
            "uiType": "hardware_lane",
            "laneId": "",
            "label": "",
            "surfaceKind": "",
            "colorHint": "",
            "pidLinks": [],
            "runIds": [],
            "pidCount": 0,
            "runCount": 0,
            "colorIsVisualHintOnly": true,
            "semanticTruthRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 80,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "ShellRunObject",
          "properties": {
            "type": "machine",
            "machineType": "shell_run",
            "pid": 0,
            "parentPid": 0,
            "ownerLaneId": "",
            "ownerEvidence": "",
            "processName": "",
            "healthState": "observed",
            "actionClass": "observed",
            "cleanupEligible": false,
            "ownerHandoffRequired": false,
            "listeningPorts": [],
            "commandHashOnly": true,
            "rawCommandHidden": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 82,
              "column": 3
            },
            "end": {
              "line": 98,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LegacyAppObject",
          "properties": {
            "type": "machine",
            "machineType": "legacy_app",
            "appName": "",
            "observedProcessCount": 0,
            "mutationPolicy": "preflight_required",
            "rollbackPlanRequired": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 108,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_hardware_reality",
          "id": "consume_hardware_reality",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = model.summary.laneCount\n    state.activeLaneCount = model.summary.activeLaneCount\n    state.processCount = model.summary.processCount\n    state.shellRunCount = model.summary.shellRunCount\n    state.laneAttributedShellRunCount = model.summary.laneAttributedShellRunCount\n    state.unattributedShellRunCount = model.summary.unattributedShellRunCount\n    state.cleanupCandidateCount = model.summary.cleanupCandidateCount || 0\n    state.ownerHandoffPlanCount = model.summary.ownerHandoffPlanCount || model.summary.ownerHandoffCount || 0\n    state.listenerCount = model.summary.listenerCount\n    state.legacyAppCount = model.summary.legacyAppCount\n    state.terminationPreflightCount = model.summary.terminationPreflightCount\n    state.riskState = model.summary.riskState\n    state.fallbackActive = model.summary.fallbackActive\n    state.destructiveActionsTaken = model.safety.destructiveActionsTaken\n    state.lastSnapshotHash = model.receipt.snapshotHash\n\n    emit(\"holoshell:hardware:reality\", {\n      lanes: state.laneCount,\n      activeLanes: state.activeLaneCount,\n      processes: state.processCount,\n      shellRuns: state.shellRunCount,\n      laneAttributedShellRuns: state.laneAttributedShellRunCount,\n      unattributedShellRuns: state.unattributedShellRunCount,\n      cleanupCandidates: state.cleanupCandidateCount,\n      ownerHandoffs: state.ownerHandoffPlanCount,\n      listeners: state.listenerCount,\n      legacyApps: state.legacyAppCount,\n      riskState: state.riskState,\n      fallbackActive: state.fallbackActive,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      snapshotHash: state.lastSnapshotHash,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 201,
              "column": 3
            },
            "end": {
              "line": 235,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_lane",
          "id": "render_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:lane\", {\n      laneId: lane.laneId,\n      label: lane.label,\n      surfaceKind: lane.surfaceKind,\n      colorHint: lane.colorHint,\n      pidLinks: lane.pidLinks,\n      runIds: lane.runIds,\n      pidCount: lane.pidCount,\n      runCount: lane.runCount,\n      semanticPrefix: lane.semanticPrefix,\n      colorIsVisualHintOnly: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 237,
              "column": 3
            },
            "end": {
              "line": 251,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_shell_run",
          "id": "render_shell_run",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:run\", {\n      runId: run.runId,\n      pid: run.pid,\n      parentPid: run.parentPid,\n      processName: run.processName,\n      ownerLaneId: run.ownerLaneId,\n      ownerEvidence: run.ownerEvidence,\n      healthState: run.healthState,\n      actionClass: run.actionClass || \"observed\",\n      cleanupEligible: run.cleanupEligible || false,\n      ownerHandoffRequired: run.ownerHandoffRequired || false,\n      rawCommandHidden: true,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 253,
              "column": 3
            },
            "end": {
              "line": 268,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_legacy_app",
          "id": "render_legacy_app",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:legacy_app\", {\n      appName: app.appName,\n      observedProcessCount: app.observedProcessCount,\n      samplePids: app.samplePids,\n      mutationPolicy: \"preflight_required\",\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 270,
              "column": 3
            },
            "end": {
              "line": 278,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "request_mutation_preflight",
          "id": "request_mutation_preflight",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:hardware:preflight\", {\n      kind: kind,\n      target: target,\n      mcpPreflightRequired: true,\n      approvalRequired: true,\n      rollbackPlanRequired: true,\n      receiptRequired: true\n    })\n    return \"preflight_required\"",
          "loc": {
            "start": {
              "line": 280,
              "column": 3
            },
            "end": {
              "line": 290,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "room": "HardwareRealityRoom",
        "policy": "MutationRequiresPreflight"
      }
    },
    "loc": {
      "start": {
        "line": 8,
        "column": 1
      },
      "end": {
        "line": 291,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}