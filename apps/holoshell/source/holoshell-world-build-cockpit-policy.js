{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShellWorldBuildCockpitPolicy",
      "id": "HoloShellWorldBuildCockpitPolicy",
      "properties": {
        "gate": "ReplayGate",
        "using": "WorldBuildGateRequirement",
        "policy": "AgentWorkMustBeLegible"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "World Build Cockpit Policy",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
            "defaultMode": "preview_only_until_promoted"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 7,
              "column": 3
            },
            "end": {
              "line": 21,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "workflow": "ready-to-build-hololand-world",
            "readiness": "unknown",
            "approvalsRequired": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "currentAgentLane": "codex-hardware",
            "hololandMutationAllowed": false,
            "replayReady": false,
            "lastCockpitReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 23,
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
          "name": "holoshell:world_build:gate",
          "id": "holoshell:world_build:gate",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Per-gate readiness results for local world-build custody"
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
          "name": "holoshell:world_build:readiness",
          "id": "holoshell:world_build:readiness",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
          "type": "template",
          "name": "WorldBuildGateRequirement",
          "properties": {
            "gateId": "",
            "requiredReceipt": "",
            "ownerSurface": "",
            "mutationClass": "silent_read",
            "blocksPublish": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_gate_result",
          "id": "consume_gate_result",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
          "loc": {
            "start": {
              "line": 125,
              "column": 3
            },
            "end": {
              "line": 141,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "compute_readiness",
          "id": "compute_readiness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
          "loc": {
            "start": {
              "line": 143,
              "column": 3
            },
            "end": {
              "line": 162,
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
              "title": "World Build Cockpit Policy",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
              "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
              "defaultMode": "preview_only_until_promoted"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 7,
                "column": 3
              },
              "end": {
                "line": 21,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "workflow": "ready-to-build-hololand-world",
              "readiness": "unknown",
              "approvalsRequired": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "currentAgentLane": "codex-hardware",
              "hololandMutationAllowed": false,
              "replayReady": false,
              "lastCockpitReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 23,
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
            "name": "holoshell:world_build:gate",
            "id": "holoshell:world_build:gate",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Per-gate readiness results for local world-build custody"
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
            "name": "holoshell:world_build:readiness",
            "id": "holoshell:world_build:readiness",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
            "type": "template",
            "name": "WorldBuildGateRequirement",
            "properties": {
              "gateId": "",
              "requiredReceipt": "",
              "ownerSurface": "",
              "mutationClass": "silent_read",
              "blocksPublish": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_gate_result",
            "id": "consume_gate_result",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
            "loc": {
              "start": {
                "line": 125,
                "column": 3
              },
              "end": {
                "line": 141,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "compute_readiness",
            "id": "compute_readiness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
            "loc": {
              "start": {
                "line": 143,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "gate": "ReplayGate",
          "using": "WorldBuildGateRequirement",
          "policy": "AgentWorkMustBeLegible"
        }
      },
      "loc": {
        "start": {
          "line": 6,
          "column": 1
        },
        "end": {
          "line": 163,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShellWorldBuildCockpitPolicy",
      "id": "HoloShellWorldBuildCockpitPolicy",
      "properties": {
        "gate": "ReplayGate",
        "using": "WorldBuildGateRequirement",
        "policy": "AgentWorkMustBeLegible"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "World Build Cockpit Policy",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
            "defaultMode": "preview_only_until_promoted"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 7,
              "column": 3
            },
            "end": {
              "line": 21,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "workflow": "ready-to-build-hololand-world",
            "readiness": "unknown",
            "approvalsRequired": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "currentAgentLane": "codex-hardware",
            "hololandMutationAllowed": false,
            "replayReady": false,
            "lastCockpitReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 23,
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
          "name": "holoshell:world_build:gate",
          "id": "holoshell:world_build:gate",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Per-gate readiness results for local world-build custody"
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
          "name": "holoshell:world_build:readiness",
          "id": "holoshell:world_build:readiness",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
          "type": "template",
          "name": "WorldBuildGateRequirement",
          "properties": {
            "gateId": "",
            "requiredReceipt": "",
            "ownerSurface": "",
            "mutationClass": "silent_read",
            "blocksPublish": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_gate_result",
          "id": "consume_gate_result",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
          "loc": {
            "start": {
              "line": 125,
              "column": 3
            },
            "end": {
              "line": 141,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "compute_readiness",
          "id": "compute_readiness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
          "loc": {
            "start": {
              "line": 143,
              "column": 3
            },
            "end": {
              "line": 162,
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
              "title": "World Build Cockpit Policy",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
              "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
              "defaultMode": "preview_only_until_promoted"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 7,
                "column": 3
              },
              "end": {
                "line": 21,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "workflow": "ready-to-build-hololand-world",
              "readiness": "unknown",
              "approvalsRequired": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "currentAgentLane": "codex-hardware",
              "hololandMutationAllowed": false,
              "replayReady": false,
              "lastCockpitReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 23,
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
            "name": "holoshell:world_build:gate",
            "id": "holoshell:world_build:gate",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Per-gate readiness results for local world-build custody"
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
            "name": "holoshell:world_build:readiness",
            "id": "holoshell:world_build:readiness",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
            "type": "template",
            "name": "WorldBuildGateRequirement",
            "properties": {
              "gateId": "",
              "requiredReceipt": "",
              "ownerSurface": "",
              "mutationClass": "silent_read",
              "blocksPublish": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_gate_result",
            "id": "consume_gate_result",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
            "loc": {
              "start": {
                "line": 125,
                "column": 3
              },
              "end": {
                "line": 141,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "compute_readiness",
            "id": "compute_readiness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
            "loc": {
              "start": {
                "line": 143,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "gate": "ReplayGate",
          "using": "WorldBuildGateRequirement",
          "policy": "AgentWorkMustBeLegible"
        }
      },
      "loc": {
        "start": {
          "line": 6,
          "column": 1
        },
        "end": {
          "line": 163,
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
      "line": 6,
      "column": 1
    },
    "end": {
      "line": 163,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShellWorldBuildCockpitPolicy",
      "id": "HoloShellWorldBuildCockpitPolicy",
      "properties": {
        "gate": "ReplayGate",
        "using": "WorldBuildGateRequirement",
        "policy": "AgentWorkMustBeLegible"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "World Build Cockpit Policy",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
            "defaultMode": "preview_only_until_promoted"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 7,
              "column": 3
            },
            "end": {
              "line": 21,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "workflow": "ready-to-build-hololand-world",
            "readiness": "unknown",
            "approvalsRequired": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "currentAgentLane": "codex-hardware",
            "hololandMutationAllowed": false,
            "replayReady": false,
            "lastCockpitReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 23,
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
          "name": "holoshell:world_build:gate",
          "id": "holoshell:world_build:gate",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Per-gate readiness results for local world-build custody"
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
          "name": "holoshell:world_build:readiness",
          "id": "holoshell:world_build:readiness",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
          "type": "template",
          "name": "WorldBuildGateRequirement",
          "properties": {
            "gateId": "",
            "requiredReceipt": "",
            "ownerSurface": "",
            "mutationClass": "silent_read",
            "blocksPublish": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_gate_result",
          "id": "consume_gate_result",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
          "loc": {
            "start": {
              "line": 125,
              "column": 3
            },
            "end": {
              "line": 141,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "compute_readiness",
          "id": "compute_readiness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
          "loc": {
            "start": {
              "line": 143,
              "column": 3
            },
            "end": {
              "line": 162,
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
              "title": "World Build Cockpit Policy",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
              "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
              "defaultMode": "preview_only_until_promoted"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 7,
                "column": 3
              },
              "end": {
                "line": 21,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "workflow": "ready-to-build-hololand-world",
              "readiness": "unknown",
              "approvalsRequired": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "currentAgentLane": "codex-hardware",
              "hololandMutationAllowed": false,
              "replayReady": false,
              "lastCockpitReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 23,
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
            "name": "holoshell:world_build:gate",
            "id": "holoshell:world_build:gate",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Per-gate readiness results for local world-build custody"
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
            "name": "holoshell:world_build:readiness",
            "id": "holoshell:world_build:readiness",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
            "type": "template",
            "name": "WorldBuildGateRequirement",
            "properties": {
              "gateId": "",
              "requiredReceipt": "",
              "ownerSurface": "",
              "mutationClass": "silent_read",
              "blocksPublish": true,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 48,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_gate_result",
            "id": "consume_gate_result",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
            "loc": {
              "start": {
                "line": 125,
                "column": 3
              },
              "end": {
                "line": 141,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "compute_readiness",
            "id": "compute_readiness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
            "loc": {
              "start": {
                "line": 143,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "gate": "ReplayGate",
          "using": "WorldBuildGateRequirement",
          "policy": "AgentWorkMustBeLegible"
        }
      },
      "loc": {
        "start": {
          "line": 6,
          "column": 1
        },
        "end": {
          "line": 163,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShellWorldBuildCockpitPolicy",
    "id": "HoloShellWorldBuildCockpitPolicy",
    "properties": {
      "gate": "ReplayGate",
      "using": "WorldBuildGateRequirement",
      "policy": "AgentWorkMustBeLegible"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "World Build Cockpit Policy",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
          "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
          "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
          "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
          "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
          "defaultMode": "preview_only_until_promoted"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 7,
            "column": 3
          },
          "end": {
            "line": 21,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "workflow": "ready-to-build-hololand-world",
          "readiness": "unknown",
          "approvalsRequired": 0,
          "passedGateCount": 0,
          "warningGateCount": 0,
          "blockedGateCount": 0,
          "currentAgentLane": "codex-hardware",
          "hololandMutationAllowed": false,
          "replayReady": false,
          "lastCockpitReceiptId": ""
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 23,
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
        "name": "holoshell:world_build:gate",
        "id": "holoshell:world_build:gate",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Per-gate readiness results for local world-build custody"
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
        "name": "holoshell:world_build:readiness",
        "id": "holoshell:world_build:readiness",
        "properties": {
          "type": "pub_sub",
          "priority": "critical",
          "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
        "type": "template",
        "name": "WorldBuildGateRequirement",
        "properties": {
          "gateId": "",
          "requiredReceipt": "",
          "ownerSurface": "",
          "mutationClass": "silent_read",
          "blocksPublish": true,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 48,
            "column": 3
          },
          "end": {
            "line": 55,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_gate_result",
        "id": "consume_gate_result",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
        "loc": {
          "start": {
            "line": 125,
            "column": 3
          },
          "end": {
            "line": 141,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "compute_readiness",
        "id": "compute_readiness",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
        "loc": {
          "start": {
            "line": 143,
            "column": 3
          },
          "end": {
            "line": 162,
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
            "title": "World Build Cockpit Policy",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "roomSource": "apps/holoshell/source/holoshell-world-build-cockpit.holo",
            "pipelineSource": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "localFileManifestSource": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codexHardwareAuditSource": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "sourceValidationSource": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "buildCustodySource": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardwareRealitySource": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "visualWitnessSource": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "agentLaneSource": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus",
            "defaultMode": "preview_only_until_promoted"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 7,
              "column": 3
            },
            "end": {
              "line": 21,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "workflow": "ready-to-build-hololand-world",
            "readiness": "unknown",
            "approvalsRequired": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "currentAgentLane": "codex-hardware",
            "hololandMutationAllowed": false,
            "replayReady": false,
            "lastCockpitReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 23,
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
          "name": "holoshell:world_build:gate",
          "id": "holoshell:world_build:gate",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Per-gate readiness results for local world-build custody"
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
          "name": "holoshell:world_build:readiness",
          "id": "holoshell:world_build:readiness",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Merged ready/warn/blocked state for the world-build cockpit"
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
          "type": "template",
          "name": "WorldBuildGateRequirement",
          "properties": {
            "gateId": "",
            "requiredReceipt": "",
            "ownerSurface": "",
            "mutationClass": "silent_read",
            "blocksPublish": true,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 48,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_gate_result",
          "id": "consume_gate_result",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (status == \"pass\") {\n      state.passedGateCount = state.passedGateCount + 1\n    } else if (status == \"warn\") {\n      state.warningGateCount = state.warningGateCount + 1\n    } else {\n      state.blockedGateCount = state.blockedGateCount + 1\n    }\n\n    emit(\"holoshell:world_build:gate\", {\n      workflow: state.workflow,\n      gate: gateId,\n      status: status,\n      receipt: receiptId,\n      agentLane: state.currentAgentLane\n    })",
          "loc": {
            "start": {
              "line": 125,
              "column": 3
            },
            "end": {
              "line": 141,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "compute_readiness",
          "id": "compute_readiness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "if (state.blockedGateCount > 0) {\n      state.readiness = \"blocked\"\n    } else if (state.warningGateCount > 0) {\n      state.readiness = \"ready_with_warnings\"\n    } else {\n      state.readiness = \"ready\"\n    }\n\n    state.replayReady = state.readiness != \"unknown\"\n    emit(\"holoshell:world_build:readiness\", {\n      workflow: state.workflow,\n      readiness: state.readiness,\n      passed: state.passedGateCount,\n      warnings: state.warningGateCount,\n      blocked: state.blockedGateCount,\n      replayReady: state.replayReady,\n      hololandMutationAllowed: state.hololandMutationAllowed\n    })",
          "loc": {
            "start": {
              "line": 143,
              "column": 3
            },
            "end": {
              "line": 162,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "gate": "ReplayGate",
        "using": "WorldBuildGateRequirement",
        "policy": "AgentWorkMustBeLegible"
      }
    },
    "loc": {
      "start": {
        "line": 6,
        "column": 1
      },
      "end": {
        "line": 163,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}