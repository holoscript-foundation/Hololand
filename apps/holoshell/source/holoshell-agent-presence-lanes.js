{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Agent Presence Lanes",
      "id": "HoloShell Agent Presence Lanes",
      "properties": {
        "using": "LaneReceipt",
        "room": "AgentPresenceRoom",
        "policy": "AccessibleLaneRendering"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Agent Presence Lanes",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-agent-lanes.mjs",
            "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
            "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
            "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
            "visualModel": "color_lanes_with_semantic_truth"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 8,
              "column": 3
            },
            "end": {
              "line": 17,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "selectedLane": "",
            "selectedAgentInstance": "",
            "lastLaneReceiptId": "",
            "grokHeartbeatStatus": "none",
            "grokCliOperatorStatus": "none",
            "grokCliAuthRuntimeStatus": "none",
            "grokAutonomyStatus": "none",
            "grokObservationStatus": "none"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 19,
              "column": 3
            },
            "end": {
              "line": 30,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:presence",
          "id": "holoshell:agents:presence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 32,
              "column": 3
            },
            "end": {
              "line": 36,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:lane",
          "id": "holoshell:agents:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Semantic lane assignments for active agent instances"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 38,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:ansi",
          "id": "holoshell:agents:ansi",
          "properties": {
            "type": "pub_sub",
            "priority": "low",
            "description": "Optional ANSI color projection for terminal surfaces"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 44,
              "column": 3
            },
            "end": {
              "line": 48,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:receipt",
          "id": "holoshell:agents:receipt",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Receipts proving which lane acted, on which surface, under which permission"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 50,
              "column": 3
            },
            "end": {
              "line": 54,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:grok-heartbeat",
          "id": "holoshell:agents:grok-heartbeat",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Grok Build live heartbeat merged into semantic lane presence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 56,
              "column": 3
            },
            "end": {
              "line": 60,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "AgentLane",
          "properties": {
            "type": "ui",
            "uiType": "agent_lane",
            "width": 320,
            "height": 72,
            "colorIsVisualHintOnly": true,
            "requiresSemanticLaneId": true,
            "requiresReceipt": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 62,
              "column": 3
            },
            "end": {
              "line": 70,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LaneReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "agent_lane_action",
            "laneId": "",
            "agentInstanceId": "",
            "surfaceKind": "",
            "colorHex": "",
            "semanticPrefix": ""
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 72,
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
          "name": "GrokHeartbeatLaneReceipt",
          "properties": {},
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
              "line": 82,
              "column": 39
            }
          }
        },
        {
          "type": "action",
          "name": "consume_agent_lane_manifest",
          "id": "consume_agent_lane_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
          "loc": {
            "start": {
              "line": 192,
              "column": 3
            },
            "end": {
              "line": 210,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "assign_agent_lane",
          "id": "assign_agent_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 212,
              "column": 3
            },
            "end": {
              "line": 224,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_agent_message",
          "id": "render_agent_message",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
          "loc": {
            "start": {
              "line": 226,
              "column": 3
            },
            "end": {
              "line": 234,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "record_lane_receipt",
          "id": "record_lane_receipt",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
          "loc": {
            "start": {
              "line": 236,
              "column": 3
            },
            "end": {
              "line": 244,
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
              "title": "Agent Presence Lanes",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-agent-lanes.mjs",
              "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
              "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
              "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
              "visualModel": "color_lanes_with_semantic_truth"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 8,
                "column": 3
              },
              "end": {
                "line": 17,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "selectedLane": "",
              "selectedAgentInstance": "",
              "lastLaneReceiptId": "",
              "grokHeartbeatStatus": "none",
              "grokCliOperatorStatus": "none",
              "grokCliAuthRuntimeStatus": "none",
              "grokAutonomyStatus": "none",
              "grokObservationStatus": "none"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 19,
                "column": 3
              },
              "end": {
                "line": 30,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:presence",
            "id": "holoshell:agents:presence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 32,
                "column": 3
              },
              "end": {
                "line": 36,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:lane",
            "id": "holoshell:agents:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Semantic lane assignments for active agent instances"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 38,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:ansi",
            "id": "holoshell:agents:ansi",
            "properties": {
              "type": "pub_sub",
              "priority": "low",
              "description": "Optional ANSI color projection for terminal surfaces"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 44,
                "column": 3
              },
              "end": {
                "line": 48,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:receipt",
            "id": "holoshell:agents:receipt",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Receipts proving which lane acted, on which surface, under which permission"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 50,
                "column": 3
              },
              "end": {
                "line": 54,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:grok-heartbeat",
            "id": "holoshell:agents:grok-heartbeat",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Grok Build live heartbeat merged into semantic lane presence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 56,
                "column": 3
              },
              "end": {
                "line": 60,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "AgentLane",
            "properties": {
              "type": "ui",
              "uiType": "agent_lane",
              "width": 320,
              "height": 72,
              "colorIsVisualHintOnly": true,
              "requiresSemanticLaneId": true,
              "requiresReceipt": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 62,
                "column": 3
              },
              "end": {
                "line": 70,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LaneReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "agent_lane_action",
              "laneId": "",
              "agentInstanceId": "",
              "surfaceKind": "",
              "colorHex": "",
              "semanticPrefix": ""
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 72,
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
            "name": "GrokHeartbeatLaneReceipt",
            "properties": {},
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
                "line": 82,
                "column": 39
              }
            }
          },
          {
            "type": "action",
            "name": "consume_agent_lane_manifest",
            "id": "consume_agent_lane_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
            "loc": {
              "start": {
                "line": 192,
                "column": 3
              },
              "end": {
                "line": 210,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "assign_agent_lane",
            "id": "assign_agent_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 212,
                "column": 3
              },
              "end": {
                "line": 224,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_agent_message",
            "id": "render_agent_message",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
            "loc": {
              "start": {
                "line": 226,
                "column": 3
              },
              "end": {
                "line": 234,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "record_lane_receipt",
            "id": "record_lane_receipt",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
            "loc": {
              "start": {
                "line": 236,
                "column": 3
              },
              "end": {
                "line": 244,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "using": "LaneReceipt",
          "room": "AgentPresenceRoom",
          "policy": "AccessibleLaneRendering"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 245,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Agent Presence Lanes",
      "id": "HoloShell Agent Presence Lanes",
      "properties": {
        "using": "LaneReceipt",
        "room": "AgentPresenceRoom",
        "policy": "AccessibleLaneRendering"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Agent Presence Lanes",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-agent-lanes.mjs",
            "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
            "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
            "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
            "visualModel": "color_lanes_with_semantic_truth"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 8,
              "column": 3
            },
            "end": {
              "line": 17,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "selectedLane": "",
            "selectedAgentInstance": "",
            "lastLaneReceiptId": "",
            "grokHeartbeatStatus": "none",
            "grokCliOperatorStatus": "none",
            "grokCliAuthRuntimeStatus": "none",
            "grokAutonomyStatus": "none",
            "grokObservationStatus": "none"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 19,
              "column": 3
            },
            "end": {
              "line": 30,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:presence",
          "id": "holoshell:agents:presence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 32,
              "column": 3
            },
            "end": {
              "line": 36,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:lane",
          "id": "holoshell:agents:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Semantic lane assignments for active agent instances"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 38,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:ansi",
          "id": "holoshell:agents:ansi",
          "properties": {
            "type": "pub_sub",
            "priority": "low",
            "description": "Optional ANSI color projection for terminal surfaces"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 44,
              "column": 3
            },
            "end": {
              "line": 48,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:receipt",
          "id": "holoshell:agents:receipt",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Receipts proving which lane acted, on which surface, under which permission"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 50,
              "column": 3
            },
            "end": {
              "line": 54,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:grok-heartbeat",
          "id": "holoshell:agents:grok-heartbeat",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Grok Build live heartbeat merged into semantic lane presence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 56,
              "column": 3
            },
            "end": {
              "line": 60,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "AgentLane",
          "properties": {
            "type": "ui",
            "uiType": "agent_lane",
            "width": 320,
            "height": 72,
            "colorIsVisualHintOnly": true,
            "requiresSemanticLaneId": true,
            "requiresReceipt": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 62,
              "column": 3
            },
            "end": {
              "line": 70,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LaneReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "agent_lane_action",
            "laneId": "",
            "agentInstanceId": "",
            "surfaceKind": "",
            "colorHex": "",
            "semanticPrefix": ""
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 72,
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
          "name": "GrokHeartbeatLaneReceipt",
          "properties": {},
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
              "line": 82,
              "column": 39
            }
          }
        },
        {
          "type": "action",
          "name": "consume_agent_lane_manifest",
          "id": "consume_agent_lane_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
          "loc": {
            "start": {
              "line": 192,
              "column": 3
            },
            "end": {
              "line": 210,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "assign_agent_lane",
          "id": "assign_agent_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 212,
              "column": 3
            },
            "end": {
              "line": 224,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_agent_message",
          "id": "render_agent_message",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
          "loc": {
            "start": {
              "line": 226,
              "column": 3
            },
            "end": {
              "line": 234,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "record_lane_receipt",
          "id": "record_lane_receipt",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
          "loc": {
            "start": {
              "line": 236,
              "column": 3
            },
            "end": {
              "line": 244,
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
              "title": "Agent Presence Lanes",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-agent-lanes.mjs",
              "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
              "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
              "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
              "visualModel": "color_lanes_with_semantic_truth"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 8,
                "column": 3
              },
              "end": {
                "line": 17,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "selectedLane": "",
              "selectedAgentInstance": "",
              "lastLaneReceiptId": "",
              "grokHeartbeatStatus": "none",
              "grokCliOperatorStatus": "none",
              "grokCliAuthRuntimeStatus": "none",
              "grokAutonomyStatus": "none",
              "grokObservationStatus": "none"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 19,
                "column": 3
              },
              "end": {
                "line": 30,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:presence",
            "id": "holoshell:agents:presence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 32,
                "column": 3
              },
              "end": {
                "line": 36,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:lane",
            "id": "holoshell:agents:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Semantic lane assignments for active agent instances"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 38,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:ansi",
            "id": "holoshell:agents:ansi",
            "properties": {
              "type": "pub_sub",
              "priority": "low",
              "description": "Optional ANSI color projection for terminal surfaces"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 44,
                "column": 3
              },
              "end": {
                "line": 48,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:receipt",
            "id": "holoshell:agents:receipt",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Receipts proving which lane acted, on which surface, under which permission"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 50,
                "column": 3
              },
              "end": {
                "line": 54,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:grok-heartbeat",
            "id": "holoshell:agents:grok-heartbeat",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Grok Build live heartbeat merged into semantic lane presence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 56,
                "column": 3
              },
              "end": {
                "line": 60,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "AgentLane",
            "properties": {
              "type": "ui",
              "uiType": "agent_lane",
              "width": 320,
              "height": 72,
              "colorIsVisualHintOnly": true,
              "requiresSemanticLaneId": true,
              "requiresReceipt": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 62,
                "column": 3
              },
              "end": {
                "line": 70,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LaneReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "agent_lane_action",
              "laneId": "",
              "agentInstanceId": "",
              "surfaceKind": "",
              "colorHex": "",
              "semanticPrefix": ""
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 72,
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
            "name": "GrokHeartbeatLaneReceipt",
            "properties": {},
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
                "line": 82,
                "column": 39
              }
            }
          },
          {
            "type": "action",
            "name": "consume_agent_lane_manifest",
            "id": "consume_agent_lane_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
            "loc": {
              "start": {
                "line": 192,
                "column": 3
              },
              "end": {
                "line": 210,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "assign_agent_lane",
            "id": "assign_agent_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 212,
                "column": 3
              },
              "end": {
                "line": 224,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_agent_message",
            "id": "render_agent_message",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
            "loc": {
              "start": {
                "line": 226,
                "column": 3
              },
              "end": {
                "line": 234,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "record_lane_receipt",
            "id": "record_lane_receipt",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
            "loc": {
              "start": {
                "line": 236,
                "column": 3
              },
              "end": {
                "line": 244,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "using": "LaneReceipt",
          "room": "AgentPresenceRoom",
          "policy": "AccessibleLaneRendering"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 245,
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
      "line": 7,
      "column": 1
    },
    "end": {
      "line": 245,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Agent Presence Lanes",
      "id": "HoloShell Agent Presence Lanes",
      "properties": {
        "using": "LaneReceipt",
        "room": "AgentPresenceRoom",
        "policy": "AccessibleLaneRendering"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Agent Presence Lanes",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-agent-lanes.mjs",
            "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
            "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
            "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
            "visualModel": "color_lanes_with_semantic_truth"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 8,
              "column": 3
            },
            "end": {
              "line": 17,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "selectedLane": "",
            "selectedAgentInstance": "",
            "lastLaneReceiptId": "",
            "grokHeartbeatStatus": "none",
            "grokCliOperatorStatus": "none",
            "grokCliAuthRuntimeStatus": "none",
            "grokAutonomyStatus": "none",
            "grokObservationStatus": "none"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 19,
              "column": 3
            },
            "end": {
              "line": 30,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:presence",
          "id": "holoshell:agents:presence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 32,
              "column": 3
            },
            "end": {
              "line": 36,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:lane",
          "id": "holoshell:agents:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Semantic lane assignments for active agent instances"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 38,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:ansi",
          "id": "holoshell:agents:ansi",
          "properties": {
            "type": "pub_sub",
            "priority": "low",
            "description": "Optional ANSI color projection for terminal surfaces"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 44,
              "column": 3
            },
            "end": {
              "line": 48,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:receipt",
          "id": "holoshell:agents:receipt",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Receipts proving which lane acted, on which surface, under which permission"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 50,
              "column": 3
            },
            "end": {
              "line": 54,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:grok-heartbeat",
          "id": "holoshell:agents:grok-heartbeat",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Grok Build live heartbeat merged into semantic lane presence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 56,
              "column": 3
            },
            "end": {
              "line": 60,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "AgentLane",
          "properties": {
            "type": "ui",
            "uiType": "agent_lane",
            "width": 320,
            "height": 72,
            "colorIsVisualHintOnly": true,
            "requiresSemanticLaneId": true,
            "requiresReceipt": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 62,
              "column": 3
            },
            "end": {
              "line": 70,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LaneReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "agent_lane_action",
            "laneId": "",
            "agentInstanceId": "",
            "surfaceKind": "",
            "colorHex": "",
            "semanticPrefix": ""
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 72,
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
          "name": "GrokHeartbeatLaneReceipt",
          "properties": {},
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
              "line": 82,
              "column": 39
            }
          }
        },
        {
          "type": "action",
          "name": "consume_agent_lane_manifest",
          "id": "consume_agent_lane_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
          "loc": {
            "start": {
              "line": 192,
              "column": 3
            },
            "end": {
              "line": 210,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "assign_agent_lane",
          "id": "assign_agent_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 212,
              "column": 3
            },
            "end": {
              "line": 224,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_agent_message",
          "id": "render_agent_message",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
          "loc": {
            "start": {
              "line": 226,
              "column": 3
            },
            "end": {
              "line": 234,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "record_lane_receipt",
          "id": "record_lane_receipt",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
          "loc": {
            "start": {
              "line": 236,
              "column": 3
            },
            "end": {
              "line": 244,
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
              "title": "Agent Presence Lanes",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-agent-lanes.mjs",
              "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
              "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
              "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
              "visualModel": "color_lanes_with_semantic_truth"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 8,
                "column": 3
              },
              "end": {
                "line": 17,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "laneCount": 0,
              "activeLaneCount": 0,
              "selectedLane": "",
              "selectedAgentInstance": "",
              "lastLaneReceiptId": "",
              "grokHeartbeatStatus": "none",
              "grokCliOperatorStatus": "none",
              "grokCliAuthRuntimeStatus": "none",
              "grokAutonomyStatus": "none",
              "grokObservationStatus": "none"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 19,
                "column": 3
              },
              "end": {
                "line": 30,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:presence",
            "id": "holoshell:agents:presence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 32,
                "column": 3
              },
              "end": {
                "line": 36,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:lane",
            "id": "holoshell:agents:lane",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Semantic lane assignments for active agent instances"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 38,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:ansi",
            "id": "holoshell:agents:ansi",
            "properties": {
              "type": "pub_sub",
              "priority": "low",
              "description": "Optional ANSI color projection for terminal surfaces"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 44,
                "column": 3
              },
              "end": {
                "line": 48,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:receipt",
            "id": "holoshell:agents:receipt",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Receipts proving which lane acted, on which surface, under which permission"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 50,
                "column": 3
              },
              "end": {
                "line": 54,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:agents:grok-heartbeat",
            "id": "holoshell:agents:grok-heartbeat",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Grok Build live heartbeat merged into semantic lane presence"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 56,
                "column": 3
              },
              "end": {
                "line": 60,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "AgentLane",
            "properties": {
              "type": "ui",
              "uiType": "agent_lane",
              "width": 320,
              "height": 72,
              "colorIsVisualHintOnly": true,
              "requiresSemanticLaneId": true,
              "requiresReceipt": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 62,
                "column": 3
              },
              "end": {
                "line": 70,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LaneReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "agent_lane_action",
              "laneId": "",
              "agentInstanceId": "",
              "surfaceKind": "",
              "colorHex": "",
              "semanticPrefix": ""
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 72,
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
            "name": "GrokHeartbeatLaneReceipt",
            "properties": {},
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
                "line": 82,
                "column": 39
              }
            }
          },
          {
            "type": "action",
            "name": "consume_agent_lane_manifest",
            "id": "consume_agent_lane_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
            "loc": {
              "start": {
                "line": 192,
                "column": 3
              },
              "end": {
                "line": 210,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "assign_agent_lane",
            "id": "assign_agent_lane",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 212,
                "column": 3
              },
              "end": {
                "line": 224,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "render_agent_message",
            "id": "render_agent_message",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
            "loc": {
              "start": {
                "line": 226,
                "column": 3
              },
              "end": {
                "line": 234,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "record_lane_receipt",
            "id": "record_lane_receipt",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
            "loc": {
              "start": {
                "line": 236,
                "column": 3
              },
              "end": {
                "line": 244,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "using": "LaneReceipt",
          "room": "AgentPresenceRoom",
          "policy": "AccessibleLaneRendering"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 245,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Agent Presence Lanes",
    "id": "HoloShell Agent Presence Lanes",
    "properties": {
      "using": "LaneReceipt",
      "room": "AgentPresenceRoom",
      "policy": "AccessibleLaneRendering"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Agent Presence Lanes",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-agent-lanes.mjs",
          "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
          "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
          "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
          "visualModel": "color_lanes_with_semantic_truth"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 8,
            "column": 3
          },
          "end": {
            "line": 17,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "laneCount": 0,
          "activeLaneCount": 0,
          "selectedLane": "",
          "selectedAgentInstance": "",
          "lastLaneReceiptId": "",
          "grokHeartbeatStatus": "none",
          "grokCliOperatorStatus": "none",
          "grokCliAuthRuntimeStatus": "none",
          "grokAutonomyStatus": "none",
          "grokObservationStatus": "none"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 19,
            "column": 3
          },
          "end": {
            "line": 30,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:agents:presence",
        "id": "holoshell:agents:presence",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 32,
            "column": 3
          },
          "end": {
            "line": 36,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:agents:lane",
        "id": "holoshell:agents:lane",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Semantic lane assignments for active agent instances"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 38,
            "column": 3
          },
          "end": {
            "line": 42,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:agents:ansi",
        "id": "holoshell:agents:ansi",
        "properties": {
          "type": "pub_sub",
          "priority": "low",
          "description": "Optional ANSI color projection for terminal surfaces"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 44,
            "column": 3
          },
          "end": {
            "line": 48,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:agents:receipt",
        "id": "holoshell:agents:receipt",
        "properties": {
          "type": "append_only",
          "priority": "high",
          "description": "Receipts proving which lane acted, on which surface, under which permission"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 50,
            "column": 3
          },
          "end": {
            "line": 54,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:agents:grok-heartbeat",
        "id": "holoshell:agents:grok-heartbeat",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Grok Build live heartbeat merged into semantic lane presence"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 56,
            "column": 3
          },
          "end": {
            "line": 60,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "AgentLane",
        "properties": {
          "type": "ui",
          "uiType": "agent_lane",
          "width": 320,
          "height": 72,
          "colorIsVisualHintOnly": true,
          "requiresSemanticLaneId": true,
          "requiresReceipt": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 62,
            "column": 3
          },
          "end": {
            "line": 70,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "LaneReceipt",
        "properties": {
          "type": "receipt",
          "receiptType": "agent_lane_action",
          "laneId": "",
          "agentInstanceId": "",
          "surfaceKind": "",
          "colorHex": "",
          "semanticPrefix": ""
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 72,
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
        "name": "GrokHeartbeatLaneReceipt",
        "properties": {},
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
            "line": 82,
            "column": 39
          }
        }
      },
      {
        "type": "action",
        "name": "consume_agent_lane_manifest",
        "id": "consume_agent_lane_manifest",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
        "loc": {
          "start": {
            "line": 192,
            "column": 3
          },
          "end": {
            "line": 210,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "assign_agent_lane",
        "id": "assign_agent_lane",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 212,
            "column": 3
          },
          "end": {
            "line": 224,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "render_agent_message",
        "id": "render_agent_message",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
        "loc": {
          "start": {
            "line": 226,
            "column": 3
          },
          "end": {
            "line": 234,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "record_lane_receipt",
        "id": "record_lane_receipt",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
        "loc": {
          "start": {
            "line": 236,
            "column": 3
          },
          "end": {
            "line": 244,
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
            "title": "Agent Presence Lanes",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-agent-lanes.mjs",
            "grokHeartbeatAdapter": "scripts/holoshell-grok-heartbeat.mjs",
            "grokHeartbeatSource": "apps/holoshell/source/holoshell-grok-heartbeat.hsplus",
            "grokHeartbeatReceipt": ".tmp/holoshell/grok-heartbeat.json",
            "visualModel": "color_lanes_with_semantic_truth"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 8,
              "column": 3
            },
            "end": {
              "line": 17,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "laneCount": 0,
            "activeLaneCount": 0,
            "selectedLane": "",
            "selectedAgentInstance": "",
            "lastLaneReceiptId": "",
            "grokHeartbeatStatus": "none",
            "grokCliOperatorStatus": "none",
            "grokCliAuthRuntimeStatus": "none",
            "grokAutonomyStatus": "none",
            "grokObservationStatus": "none"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 19,
              "column": 3
            },
            "end": {
              "line": 30,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:presence",
          "id": "holoshell:agents:presence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Agent heartbeats from Codex, Claude, shells, IDEs, browsers, and HoloMesh"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 32,
              "column": 3
            },
            "end": {
              "line": 36,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:lane",
          "id": "holoshell:agents:lane",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Semantic lane assignments for active agent instances"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 38,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:ansi",
          "id": "holoshell:agents:ansi",
          "properties": {
            "type": "pub_sub",
            "priority": "low",
            "description": "Optional ANSI color projection for terminal surfaces"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 44,
              "column": 3
            },
            "end": {
              "line": 48,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:receipt",
          "id": "holoshell:agents:receipt",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Receipts proving which lane acted, on which surface, under which permission"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 50,
              "column": 3
            },
            "end": {
              "line": 54,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:agents:grok-heartbeat",
          "id": "holoshell:agents:grok-heartbeat",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Grok Build live heartbeat merged into semantic lane presence"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 56,
              "column": 3
            },
            "end": {
              "line": 60,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "AgentLane",
          "properties": {
            "type": "ui",
            "uiType": "agent_lane",
            "width": 320,
            "height": 72,
            "colorIsVisualHintOnly": true,
            "requiresSemanticLaneId": true,
            "requiresReceipt": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 62,
              "column": 3
            },
            "end": {
              "line": 70,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LaneReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "agent_lane_action",
            "laneId": "",
            "agentInstanceId": "",
            "surfaceKind": "",
            "colorHex": "",
            "semanticPrefix": ""
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 72,
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
          "name": "GrokHeartbeatLaneReceipt",
          "properties": {},
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
              "line": 82,
              "column": 39
            }
          }
        },
        {
          "type": "action",
          "name": "consume_agent_lane_manifest",
          "id": "consume_agent_lane_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.laneCount = manifest.summary.laneCount\n    state.activeLaneCount = manifest.summary.activeLaneCount\n    state.grokHeartbeatStatus = manifest.summary.grokHeartbeatStatus || \"none\"\n    state.grokCliOperatorStatus = manifest.summary.grokCliOperatorStatus || \"none\"\n    state.grokCliAuthRuntimeStatus = manifest.summary.grokCliAuthRuntimeStatus || \"none\"\n    state.grokAutonomyStatus = manifest.summary.grokAutonomyStatus || \"none\"\n    state.grokObservationStatus = manifest.summary.grokHeartbeatObservationStatus || \"none\"\n    emit(\"holoshell:agents:lane_manifest_consumed\", {\n      lanes: state.laneCount,\n      active: state.activeLaneCount,\n      semantic: manifest.summary.semanticLaneCount,\n      grok_heartbeat: state.grokHeartbeatStatus,\n      grok_cli_operator: state.grokCliOperatorStatus,\n      grok_auth_runtime: state.grokCliAuthRuntimeStatus,\n      grok_autonomy: state.grokAutonomyStatus,\n      grok_observation: state.grokObservationStatus\n    })",
          "loc": {
            "start": {
              "line": 192,
              "column": 3
            },
            "end": {
              "line": 210,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "assign_agent_lane",
          "id": "assign_agent_lane",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.selectedLane = agentPresence.laneId\n    state.selectedAgentInstance = agentPresence.agentInstanceId || \"\"\n    emit(\"holoshell:agents:lane\", {\n      laneId: agentPresence.laneId,\n      agentKind: agentPresence.agentKind,\n      surfaceKind: agentPresence.surfaceKind,\n      agentInstanceId: state.selectedAgentInstance,\n      colorHex: agentPresence.colorHex,\n      semanticPrefix: agentPresence.semanticPrefix,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 212,
              "column": 3
            },
            "end": {
              "line": 224,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "render_agent_message",
          "id": "render_agent_message",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "emit(\"holoshell:agents:ansi\", {\n      laneId: message.laneId,\n      semanticPrefix: message.semanticPrefix,\n      ansiSgr: message.ansiSgr,\n      text: message.text,\n      colorIsVisualHintOnly: true\n    })",
          "loc": {
            "start": {
              "line": 226,
              "column": 3
            },
            "end": {
              "line": 234,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "record_lane_receipt",
          "id": "record_lane_receipt",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.lastLaneReceiptId = receipt.id\n    emit(\"holoshell:agents:receipt\", {\n      receipt: receipt,\n      laneId: receipt.laneId,\n      agentInstanceId: receipt.agentInstanceId,\n      semanticPrefix: receipt.semanticPrefix\n    })",
          "loc": {
            "start": {
              "line": 236,
              "column": 3
            },
            "end": {
              "line": 244,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "using": "LaneReceipt",
        "room": "AgentPresenceRoom",
        "policy": "AccessibleLaneRendering"
      }
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 245,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}