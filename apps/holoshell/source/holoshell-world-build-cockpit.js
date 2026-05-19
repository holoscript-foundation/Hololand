{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell World Build Cockpit",
      "id": "HoloShell World Build Cockpit",
      "properties": {},
      "directives": [],
      "children": [
        {
          "type": "metadata",
          "properties": {
            "title": "World Build Cockpit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
            "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
            "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
              "line": 23,
              "column": 4
            }
          }
        },
        {
          "type": "environment",
          "properties": {
            "theme": "holo_os_world_build",
            "render_mode": "desktop_spatial",
            "ambient_light": 0.58,
            "receipt_underlay": true,
            "camera_mode": "stationary_perspective"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 25,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "humanOutcome": "Ready this computer for HoloLand world building",
            "readinessState": "unknown",
            "hololandMutationAllowed": false,
            "previewMode": "read_only",
            "selectedLocalFileCount": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "replayReady": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 33,
              "column": 3
            },
            "end": {
              "line": 43,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "WorldBuildGate",
          "properties": {
            "type": "readiness_gate",
            "mesh": "rounded_panel",
            "material": "liquid_glass",
            "color": "#14212c",
            "active_color": "#73daca",
            "warning_color": "#e0af68",
            "blocked_color": "#f7768e",
            "receipt_required": true,
            "inspectable": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 45,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "GateToken",
          "properties": {
            "type": "receipt_token",
            "mesh": "sphere",
            "material": "hologram",
            "radius": 0.15,
            "grabbable": true,
            "receipt_required": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 57,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "OutcomePedestal",
          "id": "OutcomePedestal",
          "properties": {
            "__templateRef": "WorldBuildGate",
            "label": "Ready This Computer",
            "gate_id": "human_outcome",
            "position": [
              0,
              2.35,
              -2.9
            ],
            "scale": [
              2.6,
              0.7,
              0.08
            ],
            "status_binding": "readinessState",
            "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 73,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessGates",
          "id": "ReadinessGates",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "LocalFilesGate",
              "id": "LocalFilesGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Local Files",
                "gate_id": "local_files",
                "receipt": "LocalFileManifestReceipt",
                "failure_states": [
                  "missing_manifest",
                  "sensitive_path",
                  "unreadable_file",
                  "duplicate_asset"
                ],
                "approval": "silent_read",
                "position": [
                  -3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 76,
                  "column": 5
                },
                "end": {
                  "line": 83,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "HardwareGate",
              "id": "HardwareGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Hardware",
                "gate_id": "hardware_reality",
                "receipt": "CodexHardwareAuditReceipt",
                "failure_states": [
                  "missing_browser_witness",
                  "weak_gpu",
                  "memory_pressure",
                  "stale_probe"
                ],
                "approval": "silent_read_or_guarded_witness",
                "position": [
                  -1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 85,
                  "column": 5
                },
                "end": {
                  "line": 92,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "SourceGate",
              "id": "SourceGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Source",
                "gate_id": "source_validation",
                "receipt": "SourceValidationReceipt",
                "failure_states": [
                  "invalid_source",
                  "stale_source_map",
                  "typescript_only_product_behavior"
                ],
                "approval": "guarded_validation",
                "position": [
                  1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 94,
                  "column": 5
                },
                "end": {
                  "line": 101,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "BuildGate",
              "id": "BuildGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Build Custody",
                "gate_id": "build_custody",
                "receipt": "BuildCustodyReceipt",
                "failure_states": [
                  "unknown_owner",
                  "high_memory",
                  "long_running_build",
                  "scanner_unavailable"
                ],
                "approval": "break_glass_only_for_termination",
                "position": [
                  3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 103,
                  "column": 5
                },
                "end": {
                  "line": 110,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "PreviewGate",
              "id": "PreviewGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "World Preview",
                "gate_id": "hololand_preview",
                "receipt": "VisualWitnessReceipt",
                "failure_states": [
                  "preview_missing",
                  "screenshot_missing",
                  "dom_witness_missing"
                ],
                "approval": "publish_import_blocked_until_promoted",
                "position": [
                  -2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 112,
                  "column": 5
                },
                "end": {
                  "line": 119,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "AgentGate",
              "id": "AgentGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Agent Orchestra",
                "gate_id": "agent_orchestra",
                "receipt": "AgentLaneReceipt",
                "failure_states": [
                  "unattributed_shell_run",
                  "duplicate_task",
                  "unsigned_mutation"
                ],
                "approval": "owner_lanes_visible",
                "position": [
                  0,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 121,
                  "column": 5
                },
                "end": {
                  "line": 128,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "ReplayGate",
              "id": "ReplayGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Replay",
                "gate_id": "replay",
                "receipt": "WorldBuildReadinessCockpitReceipt",
                "failure_states": [
                  "non_replayable_command",
                  "missing_stdout_hash",
                  "missing_rollback_note"
                ],
                "approval": "show_changes_before_promotion",
                "position": [
                  2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 130,
                  "column": 5
                },
                "end": {
                  "line": 137,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 75,
              "column": 3
            },
            "end": {
              "line": 138,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessTokens",
          "id": "ReadinessTokens",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "HardwarePassToken",
              "id": "HardwarePassToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Hardware pass",
                "receipt_kind": "codex_hardware_audit",
                "position": [
                  -1.08,
                  0.86,
                  0.76
                ],
                "color": "#73daca"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 141,
                  "column": 5
                },
                "end": {
                  "line": 146,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "GraphWarningToken",
              "id": "GraphWarningToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Graph warning",
                "receipt_kind": "graph_unavailable_receipt",
                "next_action": "Use local HoloShell source-files adapter",
                "position": [
                  1.08,
                  0.86,
                  0.76
                ],
                "color": "#e0af68"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 148,
                  "column": 5
                },
                "end": {
                  "line": 154,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "NoMutationToken",
              "id": "NoMutationToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "HoloLand read-only until promotion",
                "receipt_kind": "worktree_boundary_receipt",
                "position": [
                  0,
                  0.86,
                  1.18
                ],
                "color": "#9ece6a"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 156,
                  "column": 5
                },
                "end": {
                  "line": 161,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 140,
              "column": 3
            },
            "end": {
              "line": 162,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "WorldBuildTimeline",
          "id": "WorldBuildTimeline",
          "properties": {
            "type": "timeline",
            "mesh": "cube",
            "material": "hologram",
            "color": "#6a7282",
            "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
            "position": [
              0,
              0.02,
              1.5
            ],
            "scale": [
              5.9,
              0.08,
              0.12
            ],
            "receipt_required": true
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 164,
              "column": 3
            },
            "end": {
              "line": 173,
              "column": 4
            }
          }
        },
        {
          "type": "logic",
          "name": "logic",
          "id": "logic",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": {
            "functions": [],
            "actions": [
              {
                "name": "focus_gate",
                "params": [
                  "gateId"
                ],
                "body": "emit \"holoshell_world_build_gate_focused\""
              },
              {
                "name": "promote_preview",
                "params": [],
                "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
              }
            ],
            "eventHandlers": [],
            "tickHandlers": []
          },
          "loc": {
            "start": {
              "line": 175,
              "column": 3
            },
            "end": {
              "line": 190,
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
            "type": "metadata",
            "properties": {
              "title": "World Build Cockpit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
              "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
              "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
              "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
                "line": 23,
                "column": 4
              }
            }
          },
          {
            "type": "environment",
            "properties": {
              "theme": "holo_os_world_build",
              "render_mode": "desktop_spatial",
              "ambient_light": 0.58,
              "receipt_underlay": true,
              "camera_mode": "stationary_perspective"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 25,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "humanOutcome": "Ready this computer for HoloLand world building",
              "readinessState": "unknown",
              "hololandMutationAllowed": false,
              "previewMode": "read_only",
              "selectedLocalFileCount": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "replayReady": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 33,
                "column": 3
              },
              "end": {
                "line": 43,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "WorldBuildGate",
            "properties": {
              "type": "readiness_gate",
              "mesh": "rounded_panel",
              "material": "liquid_glass",
              "color": "#14212c",
              "active_color": "#73daca",
              "warning_color": "#e0af68",
              "blocked_color": "#f7768e",
              "receipt_required": true,
              "inspectable": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 45,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "GateToken",
            "properties": {
              "type": "receipt_token",
              "mesh": "sphere",
              "material": "hologram",
              "radius": 0.15,
              "grabbable": true,
              "receipt_required": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 57,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "OutcomePedestal",
            "id": "OutcomePedestal",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Ready This Computer",
              "gate_id": "human_outcome",
              "position": [
                0,
                2.35,
                -2.9
              ],
              "scale": [
                2.6,
                0.7,
                0.08
              ],
              "status_binding": "readinessState",
              "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 73,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessGates",
            "id": "ReadinessGates",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "LocalFilesGate",
                "id": "LocalFilesGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Local Files",
                  "gate_id": "local_files",
                  "receipt": "LocalFileManifestReceipt",
                  "failure_states": [
                    "missing_manifest",
                    "sensitive_path",
                    "unreadable_file",
                    "duplicate_asset"
                  ],
                  "approval": "silent_read",
                  "position": [
                    -3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 76,
                    "column": 5
                  },
                  "end": {
                    "line": 83,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "HardwareGate",
                "id": "HardwareGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Hardware",
                  "gate_id": "hardware_reality",
                  "receipt": "CodexHardwareAuditReceipt",
                  "failure_states": [
                    "missing_browser_witness",
                    "weak_gpu",
                    "memory_pressure",
                    "stale_probe"
                  ],
                  "approval": "silent_read_or_guarded_witness",
                  "position": [
                    -1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 85,
                    "column": 5
                  },
                  "end": {
                    "line": 92,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "SourceGate",
                "id": "SourceGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Source",
                  "gate_id": "source_validation",
                  "receipt": "SourceValidationReceipt",
                  "failure_states": [
                    "invalid_source",
                    "stale_source_map",
                    "typescript_only_product_behavior"
                  ],
                  "approval": "guarded_validation",
                  "position": [
                    1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 94,
                    "column": 5
                  },
                  "end": {
                    "line": 101,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "BuildGate",
                "id": "BuildGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Build Custody",
                  "gate_id": "build_custody",
                  "receipt": "BuildCustodyReceipt",
                  "failure_states": [
                    "unknown_owner",
                    "high_memory",
                    "long_running_build",
                    "scanner_unavailable"
                  ],
                  "approval": "break_glass_only_for_termination",
                  "position": [
                    3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 103,
                    "column": 5
                  },
                  "end": {
                    "line": 110,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "PreviewGate",
                "id": "PreviewGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "World Preview",
                  "gate_id": "hololand_preview",
                  "receipt": "VisualWitnessReceipt",
                  "failure_states": [
                    "preview_missing",
                    "screenshot_missing",
                    "dom_witness_missing"
                  ],
                  "approval": "publish_import_blocked_until_promoted",
                  "position": [
                    -2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 112,
                    "column": 5
                  },
                  "end": {
                    "line": 119,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "AgentGate",
                "id": "AgentGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Agent Orchestra",
                  "gate_id": "agent_orchestra",
                  "receipt": "AgentLaneReceipt",
                  "failure_states": [
                    "unattributed_shell_run",
                    "duplicate_task",
                    "unsigned_mutation"
                  ],
                  "approval": "owner_lanes_visible",
                  "position": [
                    0,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 121,
                    "column": 5
                  },
                  "end": {
                    "line": 128,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "ReplayGate",
                "id": "ReplayGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Replay",
                  "gate_id": "replay",
                  "receipt": "WorldBuildReadinessCockpitReceipt",
                  "failure_states": [
                    "non_replayable_command",
                    "missing_stdout_hash",
                    "missing_rollback_note"
                  ],
                  "approval": "show_changes_before_promotion",
                  "position": [
                    2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 130,
                    "column": 5
                  },
                  "end": {
                    "line": 137,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 75,
                "column": 3
              },
              "end": {
                "line": 138,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessTokens",
            "id": "ReadinessTokens",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "HardwarePassToken",
                "id": "HardwarePassToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Hardware pass",
                  "receipt_kind": "codex_hardware_audit",
                  "position": [
                    -1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#73daca"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 141,
                    "column": 5
                  },
                  "end": {
                    "line": 146,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "GraphWarningToken",
                "id": "GraphWarningToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Graph warning",
                  "receipt_kind": "graph_unavailable_receipt",
                  "next_action": "Use local HoloShell source-files adapter",
                  "position": [
                    1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#e0af68"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 148,
                    "column": 5
                  },
                  "end": {
                    "line": 154,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "NoMutationToken",
                "id": "NoMutationToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "HoloLand read-only until promotion",
                  "receipt_kind": "worktree_boundary_receipt",
                  "position": [
                    0,
                    0.86,
                    1.18
                  ],
                  "color": "#9ece6a"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 156,
                    "column": 5
                  },
                  "end": {
                    "line": 161,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 140,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "WorldBuildTimeline",
            "id": "WorldBuildTimeline",
            "properties": {
              "type": "timeline",
              "mesh": "cube",
              "material": "hologram",
              "color": "#6a7282",
              "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
              "position": [
                0,
                0.02,
                1.5
              ],
              "scale": [
                5.9,
                0.08,
                0.12
              ],
              "receipt_required": true
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 164,
                "column": 3
              },
              "end": {
                "line": 173,
                "column": 4
              }
            }
          },
          {
            "type": "logic",
            "name": "logic",
            "id": "logic",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": {
              "functions": [],
              "actions": [
                {
                  "name": "focus_gate",
                  "params": [
                    "gateId"
                  ],
                  "body": "emit \"holoshell_world_build_gate_focused\""
                },
                {
                  "name": "promote_preview",
                  "params": [],
                  "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
                }
              ],
              "eventHandlers": [],
              "tickHandlers": []
            },
            "loc": {
              "start": {
                "line": 175,
                "column": 3
              },
              "end": {
                "line": 190,
                "column": 4
              }
            }
          }
        ],
        "properties": {}
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 191,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell World Build Cockpit",
      "id": "HoloShell World Build Cockpit",
      "properties": {},
      "directives": [],
      "children": [
        {
          "type": "metadata",
          "properties": {
            "title": "World Build Cockpit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
            "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
            "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
              "line": 23,
              "column": 4
            }
          }
        },
        {
          "type": "environment",
          "properties": {
            "theme": "holo_os_world_build",
            "render_mode": "desktop_spatial",
            "ambient_light": 0.58,
            "receipt_underlay": true,
            "camera_mode": "stationary_perspective"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 25,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "humanOutcome": "Ready this computer for HoloLand world building",
            "readinessState": "unknown",
            "hololandMutationAllowed": false,
            "previewMode": "read_only",
            "selectedLocalFileCount": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "replayReady": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 33,
              "column": 3
            },
            "end": {
              "line": 43,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "WorldBuildGate",
          "properties": {
            "type": "readiness_gate",
            "mesh": "rounded_panel",
            "material": "liquid_glass",
            "color": "#14212c",
            "active_color": "#73daca",
            "warning_color": "#e0af68",
            "blocked_color": "#f7768e",
            "receipt_required": true,
            "inspectable": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 45,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "GateToken",
          "properties": {
            "type": "receipt_token",
            "mesh": "sphere",
            "material": "hologram",
            "radius": 0.15,
            "grabbable": true,
            "receipt_required": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 57,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "OutcomePedestal",
          "id": "OutcomePedestal",
          "properties": {
            "__templateRef": "WorldBuildGate",
            "label": "Ready This Computer",
            "gate_id": "human_outcome",
            "position": [
              0,
              2.35,
              -2.9
            ],
            "scale": [
              2.6,
              0.7,
              0.08
            ],
            "status_binding": "readinessState",
            "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 73,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessGates",
          "id": "ReadinessGates",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "LocalFilesGate",
              "id": "LocalFilesGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Local Files",
                "gate_id": "local_files",
                "receipt": "LocalFileManifestReceipt",
                "failure_states": [
                  "missing_manifest",
                  "sensitive_path",
                  "unreadable_file",
                  "duplicate_asset"
                ],
                "approval": "silent_read",
                "position": [
                  -3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 76,
                  "column": 5
                },
                "end": {
                  "line": 83,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "HardwareGate",
              "id": "HardwareGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Hardware",
                "gate_id": "hardware_reality",
                "receipt": "CodexHardwareAuditReceipt",
                "failure_states": [
                  "missing_browser_witness",
                  "weak_gpu",
                  "memory_pressure",
                  "stale_probe"
                ],
                "approval": "silent_read_or_guarded_witness",
                "position": [
                  -1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 85,
                  "column": 5
                },
                "end": {
                  "line": 92,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "SourceGate",
              "id": "SourceGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Source",
                "gate_id": "source_validation",
                "receipt": "SourceValidationReceipt",
                "failure_states": [
                  "invalid_source",
                  "stale_source_map",
                  "typescript_only_product_behavior"
                ],
                "approval": "guarded_validation",
                "position": [
                  1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 94,
                  "column": 5
                },
                "end": {
                  "line": 101,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "BuildGate",
              "id": "BuildGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Build Custody",
                "gate_id": "build_custody",
                "receipt": "BuildCustodyReceipt",
                "failure_states": [
                  "unknown_owner",
                  "high_memory",
                  "long_running_build",
                  "scanner_unavailable"
                ],
                "approval": "break_glass_only_for_termination",
                "position": [
                  3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 103,
                  "column": 5
                },
                "end": {
                  "line": 110,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "PreviewGate",
              "id": "PreviewGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "World Preview",
                "gate_id": "hololand_preview",
                "receipt": "VisualWitnessReceipt",
                "failure_states": [
                  "preview_missing",
                  "screenshot_missing",
                  "dom_witness_missing"
                ],
                "approval": "publish_import_blocked_until_promoted",
                "position": [
                  -2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 112,
                  "column": 5
                },
                "end": {
                  "line": 119,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "AgentGate",
              "id": "AgentGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Agent Orchestra",
                "gate_id": "agent_orchestra",
                "receipt": "AgentLaneReceipt",
                "failure_states": [
                  "unattributed_shell_run",
                  "duplicate_task",
                  "unsigned_mutation"
                ],
                "approval": "owner_lanes_visible",
                "position": [
                  0,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 121,
                  "column": 5
                },
                "end": {
                  "line": 128,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "ReplayGate",
              "id": "ReplayGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Replay",
                "gate_id": "replay",
                "receipt": "WorldBuildReadinessCockpitReceipt",
                "failure_states": [
                  "non_replayable_command",
                  "missing_stdout_hash",
                  "missing_rollback_note"
                ],
                "approval": "show_changes_before_promotion",
                "position": [
                  2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 130,
                  "column": 5
                },
                "end": {
                  "line": 137,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 75,
              "column": 3
            },
            "end": {
              "line": 138,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessTokens",
          "id": "ReadinessTokens",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "HardwarePassToken",
              "id": "HardwarePassToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Hardware pass",
                "receipt_kind": "codex_hardware_audit",
                "position": [
                  -1.08,
                  0.86,
                  0.76
                ],
                "color": "#73daca"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 141,
                  "column": 5
                },
                "end": {
                  "line": 146,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "GraphWarningToken",
              "id": "GraphWarningToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Graph warning",
                "receipt_kind": "graph_unavailable_receipt",
                "next_action": "Use local HoloShell source-files adapter",
                "position": [
                  1.08,
                  0.86,
                  0.76
                ],
                "color": "#e0af68"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 148,
                  "column": 5
                },
                "end": {
                  "line": 154,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "NoMutationToken",
              "id": "NoMutationToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "HoloLand read-only until promotion",
                "receipt_kind": "worktree_boundary_receipt",
                "position": [
                  0,
                  0.86,
                  1.18
                ],
                "color": "#9ece6a"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 156,
                  "column": 5
                },
                "end": {
                  "line": 161,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 140,
              "column": 3
            },
            "end": {
              "line": 162,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "WorldBuildTimeline",
          "id": "WorldBuildTimeline",
          "properties": {
            "type": "timeline",
            "mesh": "cube",
            "material": "hologram",
            "color": "#6a7282",
            "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
            "position": [
              0,
              0.02,
              1.5
            ],
            "scale": [
              5.9,
              0.08,
              0.12
            ],
            "receipt_required": true
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 164,
              "column": 3
            },
            "end": {
              "line": 173,
              "column": 4
            }
          }
        },
        {
          "type": "logic",
          "name": "logic",
          "id": "logic",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": {
            "functions": [],
            "actions": [
              {
                "name": "focus_gate",
                "params": [
                  "gateId"
                ],
                "body": "emit \"holoshell_world_build_gate_focused\""
              },
              {
                "name": "promote_preview",
                "params": [],
                "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
              }
            ],
            "eventHandlers": [],
            "tickHandlers": []
          },
          "loc": {
            "start": {
              "line": 175,
              "column": 3
            },
            "end": {
              "line": 190,
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
            "type": "metadata",
            "properties": {
              "title": "World Build Cockpit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
              "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
              "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
              "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
                "line": 23,
                "column": 4
              }
            }
          },
          {
            "type": "environment",
            "properties": {
              "theme": "holo_os_world_build",
              "render_mode": "desktop_spatial",
              "ambient_light": 0.58,
              "receipt_underlay": true,
              "camera_mode": "stationary_perspective"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 25,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "humanOutcome": "Ready this computer for HoloLand world building",
              "readinessState": "unknown",
              "hololandMutationAllowed": false,
              "previewMode": "read_only",
              "selectedLocalFileCount": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "replayReady": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 33,
                "column": 3
              },
              "end": {
                "line": 43,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "WorldBuildGate",
            "properties": {
              "type": "readiness_gate",
              "mesh": "rounded_panel",
              "material": "liquid_glass",
              "color": "#14212c",
              "active_color": "#73daca",
              "warning_color": "#e0af68",
              "blocked_color": "#f7768e",
              "receipt_required": true,
              "inspectable": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 45,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "GateToken",
            "properties": {
              "type": "receipt_token",
              "mesh": "sphere",
              "material": "hologram",
              "radius": 0.15,
              "grabbable": true,
              "receipt_required": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 57,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "OutcomePedestal",
            "id": "OutcomePedestal",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Ready This Computer",
              "gate_id": "human_outcome",
              "position": [
                0,
                2.35,
                -2.9
              ],
              "scale": [
                2.6,
                0.7,
                0.08
              ],
              "status_binding": "readinessState",
              "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 73,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessGates",
            "id": "ReadinessGates",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "LocalFilesGate",
                "id": "LocalFilesGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Local Files",
                  "gate_id": "local_files",
                  "receipt": "LocalFileManifestReceipt",
                  "failure_states": [
                    "missing_manifest",
                    "sensitive_path",
                    "unreadable_file",
                    "duplicate_asset"
                  ],
                  "approval": "silent_read",
                  "position": [
                    -3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 76,
                    "column": 5
                  },
                  "end": {
                    "line": 83,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "HardwareGate",
                "id": "HardwareGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Hardware",
                  "gate_id": "hardware_reality",
                  "receipt": "CodexHardwareAuditReceipt",
                  "failure_states": [
                    "missing_browser_witness",
                    "weak_gpu",
                    "memory_pressure",
                    "stale_probe"
                  ],
                  "approval": "silent_read_or_guarded_witness",
                  "position": [
                    -1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 85,
                    "column": 5
                  },
                  "end": {
                    "line": 92,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "SourceGate",
                "id": "SourceGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Source",
                  "gate_id": "source_validation",
                  "receipt": "SourceValidationReceipt",
                  "failure_states": [
                    "invalid_source",
                    "stale_source_map",
                    "typescript_only_product_behavior"
                  ],
                  "approval": "guarded_validation",
                  "position": [
                    1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 94,
                    "column": 5
                  },
                  "end": {
                    "line": 101,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "BuildGate",
                "id": "BuildGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Build Custody",
                  "gate_id": "build_custody",
                  "receipt": "BuildCustodyReceipt",
                  "failure_states": [
                    "unknown_owner",
                    "high_memory",
                    "long_running_build",
                    "scanner_unavailable"
                  ],
                  "approval": "break_glass_only_for_termination",
                  "position": [
                    3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 103,
                    "column": 5
                  },
                  "end": {
                    "line": 110,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "PreviewGate",
                "id": "PreviewGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "World Preview",
                  "gate_id": "hololand_preview",
                  "receipt": "VisualWitnessReceipt",
                  "failure_states": [
                    "preview_missing",
                    "screenshot_missing",
                    "dom_witness_missing"
                  ],
                  "approval": "publish_import_blocked_until_promoted",
                  "position": [
                    -2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 112,
                    "column": 5
                  },
                  "end": {
                    "line": 119,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "AgentGate",
                "id": "AgentGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Agent Orchestra",
                  "gate_id": "agent_orchestra",
                  "receipt": "AgentLaneReceipt",
                  "failure_states": [
                    "unattributed_shell_run",
                    "duplicate_task",
                    "unsigned_mutation"
                  ],
                  "approval": "owner_lanes_visible",
                  "position": [
                    0,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 121,
                    "column": 5
                  },
                  "end": {
                    "line": 128,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "ReplayGate",
                "id": "ReplayGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Replay",
                  "gate_id": "replay",
                  "receipt": "WorldBuildReadinessCockpitReceipt",
                  "failure_states": [
                    "non_replayable_command",
                    "missing_stdout_hash",
                    "missing_rollback_note"
                  ],
                  "approval": "show_changes_before_promotion",
                  "position": [
                    2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 130,
                    "column": 5
                  },
                  "end": {
                    "line": 137,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 75,
                "column": 3
              },
              "end": {
                "line": 138,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessTokens",
            "id": "ReadinessTokens",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "HardwarePassToken",
                "id": "HardwarePassToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Hardware pass",
                  "receipt_kind": "codex_hardware_audit",
                  "position": [
                    -1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#73daca"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 141,
                    "column": 5
                  },
                  "end": {
                    "line": 146,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "GraphWarningToken",
                "id": "GraphWarningToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Graph warning",
                  "receipt_kind": "graph_unavailable_receipt",
                  "next_action": "Use local HoloShell source-files adapter",
                  "position": [
                    1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#e0af68"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 148,
                    "column": 5
                  },
                  "end": {
                    "line": 154,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "NoMutationToken",
                "id": "NoMutationToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "HoloLand read-only until promotion",
                  "receipt_kind": "worktree_boundary_receipt",
                  "position": [
                    0,
                    0.86,
                    1.18
                  ],
                  "color": "#9ece6a"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 156,
                    "column": 5
                  },
                  "end": {
                    "line": 161,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 140,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "WorldBuildTimeline",
            "id": "WorldBuildTimeline",
            "properties": {
              "type": "timeline",
              "mesh": "cube",
              "material": "hologram",
              "color": "#6a7282",
              "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
              "position": [
                0,
                0.02,
                1.5
              ],
              "scale": [
                5.9,
                0.08,
                0.12
              ],
              "receipt_required": true
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 164,
                "column": 3
              },
              "end": {
                "line": 173,
                "column": 4
              }
            }
          },
          {
            "type": "logic",
            "name": "logic",
            "id": "logic",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": {
              "functions": [],
              "actions": [
                {
                  "name": "focus_gate",
                  "params": [
                    "gateId"
                  ],
                  "body": "emit \"holoshell_world_build_gate_focused\""
                },
                {
                  "name": "promote_preview",
                  "params": [],
                  "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
                }
              ],
              "eventHandlers": [],
              "tickHandlers": []
            },
            "loc": {
              "start": {
                "line": 175,
                "column": 3
              },
              "end": {
                "line": 190,
                "column": 4
              }
            }
          }
        ],
        "properties": {}
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 191,
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
      "line": 191,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell World Build Cockpit",
      "id": "HoloShell World Build Cockpit",
      "properties": {},
      "directives": [],
      "children": [
        {
          "type": "metadata",
          "properties": {
            "title": "World Build Cockpit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
            "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
            "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
              "line": 23,
              "column": 4
            }
          }
        },
        {
          "type": "environment",
          "properties": {
            "theme": "holo_os_world_build",
            "render_mode": "desktop_spatial",
            "ambient_light": 0.58,
            "receipt_underlay": true,
            "camera_mode": "stationary_perspective"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 25,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "humanOutcome": "Ready this computer for HoloLand world building",
            "readinessState": "unknown",
            "hololandMutationAllowed": false,
            "previewMode": "read_only",
            "selectedLocalFileCount": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "replayReady": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 33,
              "column": 3
            },
            "end": {
              "line": 43,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "WorldBuildGate",
          "properties": {
            "type": "readiness_gate",
            "mesh": "rounded_panel",
            "material": "liquid_glass",
            "color": "#14212c",
            "active_color": "#73daca",
            "warning_color": "#e0af68",
            "blocked_color": "#f7768e",
            "receipt_required": true,
            "inspectable": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 45,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "GateToken",
          "properties": {
            "type": "receipt_token",
            "mesh": "sphere",
            "material": "hologram",
            "radius": 0.15,
            "grabbable": true,
            "receipt_required": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 57,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "OutcomePedestal",
          "id": "OutcomePedestal",
          "properties": {
            "__templateRef": "WorldBuildGate",
            "label": "Ready This Computer",
            "gate_id": "human_outcome",
            "position": [
              0,
              2.35,
              -2.9
            ],
            "scale": [
              2.6,
              0.7,
              0.08
            ],
            "status_binding": "readinessState",
            "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 73,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessGates",
          "id": "ReadinessGates",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "LocalFilesGate",
              "id": "LocalFilesGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Local Files",
                "gate_id": "local_files",
                "receipt": "LocalFileManifestReceipt",
                "failure_states": [
                  "missing_manifest",
                  "sensitive_path",
                  "unreadable_file",
                  "duplicate_asset"
                ],
                "approval": "silent_read",
                "position": [
                  -3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 76,
                  "column": 5
                },
                "end": {
                  "line": 83,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "HardwareGate",
              "id": "HardwareGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Hardware",
                "gate_id": "hardware_reality",
                "receipt": "CodexHardwareAuditReceipt",
                "failure_states": [
                  "missing_browser_witness",
                  "weak_gpu",
                  "memory_pressure",
                  "stale_probe"
                ],
                "approval": "silent_read_or_guarded_witness",
                "position": [
                  -1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 85,
                  "column": 5
                },
                "end": {
                  "line": 92,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "SourceGate",
              "id": "SourceGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Source",
                "gate_id": "source_validation",
                "receipt": "SourceValidationReceipt",
                "failure_states": [
                  "invalid_source",
                  "stale_source_map",
                  "typescript_only_product_behavior"
                ],
                "approval": "guarded_validation",
                "position": [
                  1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 94,
                  "column": 5
                },
                "end": {
                  "line": 101,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "BuildGate",
              "id": "BuildGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Build Custody",
                "gate_id": "build_custody",
                "receipt": "BuildCustodyReceipt",
                "failure_states": [
                  "unknown_owner",
                  "high_memory",
                  "long_running_build",
                  "scanner_unavailable"
                ],
                "approval": "break_glass_only_for_termination",
                "position": [
                  3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 103,
                  "column": 5
                },
                "end": {
                  "line": 110,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "PreviewGate",
              "id": "PreviewGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "World Preview",
                "gate_id": "hololand_preview",
                "receipt": "VisualWitnessReceipt",
                "failure_states": [
                  "preview_missing",
                  "screenshot_missing",
                  "dom_witness_missing"
                ],
                "approval": "publish_import_blocked_until_promoted",
                "position": [
                  -2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 112,
                  "column": 5
                },
                "end": {
                  "line": 119,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "AgentGate",
              "id": "AgentGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Agent Orchestra",
                "gate_id": "agent_orchestra",
                "receipt": "AgentLaneReceipt",
                "failure_states": [
                  "unattributed_shell_run",
                  "duplicate_task",
                  "unsigned_mutation"
                ],
                "approval": "owner_lanes_visible",
                "position": [
                  0,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 121,
                  "column": 5
                },
                "end": {
                  "line": 128,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "ReplayGate",
              "id": "ReplayGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Replay",
                "gate_id": "replay",
                "receipt": "WorldBuildReadinessCockpitReceipt",
                "failure_states": [
                  "non_replayable_command",
                  "missing_stdout_hash",
                  "missing_rollback_note"
                ],
                "approval": "show_changes_before_promotion",
                "position": [
                  2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 130,
                  "column": 5
                },
                "end": {
                  "line": 137,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 75,
              "column": 3
            },
            "end": {
              "line": 138,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessTokens",
          "id": "ReadinessTokens",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "HardwarePassToken",
              "id": "HardwarePassToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Hardware pass",
                "receipt_kind": "codex_hardware_audit",
                "position": [
                  -1.08,
                  0.86,
                  0.76
                ],
                "color": "#73daca"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 141,
                  "column": 5
                },
                "end": {
                  "line": 146,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "GraphWarningToken",
              "id": "GraphWarningToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Graph warning",
                "receipt_kind": "graph_unavailable_receipt",
                "next_action": "Use local HoloShell source-files adapter",
                "position": [
                  1.08,
                  0.86,
                  0.76
                ],
                "color": "#e0af68"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 148,
                  "column": 5
                },
                "end": {
                  "line": 154,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "NoMutationToken",
              "id": "NoMutationToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "HoloLand read-only until promotion",
                "receipt_kind": "worktree_boundary_receipt",
                "position": [
                  0,
                  0.86,
                  1.18
                ],
                "color": "#9ece6a"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 156,
                  "column": 5
                },
                "end": {
                  "line": 161,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 140,
              "column": 3
            },
            "end": {
              "line": 162,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "WorldBuildTimeline",
          "id": "WorldBuildTimeline",
          "properties": {
            "type": "timeline",
            "mesh": "cube",
            "material": "hologram",
            "color": "#6a7282",
            "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
            "position": [
              0,
              0.02,
              1.5
            ],
            "scale": [
              5.9,
              0.08,
              0.12
            ],
            "receipt_required": true
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 164,
              "column": 3
            },
            "end": {
              "line": 173,
              "column": 4
            }
          }
        },
        {
          "type": "logic",
          "name": "logic",
          "id": "logic",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": {
            "functions": [],
            "actions": [
              {
                "name": "focus_gate",
                "params": [
                  "gateId"
                ],
                "body": "emit \"holoshell_world_build_gate_focused\""
              },
              {
                "name": "promote_preview",
                "params": [],
                "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
              }
            ],
            "eventHandlers": [],
            "tickHandlers": []
          },
          "loc": {
            "start": {
              "line": 175,
              "column": 3
            },
            "end": {
              "line": 190,
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
            "type": "metadata",
            "properties": {
              "title": "World Build Cockpit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
              "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
              "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
              "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
              "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
              "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
              "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
              "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
              "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
              "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
              "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
                "line": 23,
                "column": 4
              }
            }
          },
          {
            "type": "environment",
            "properties": {
              "theme": "holo_os_world_build",
              "render_mode": "desktop_spatial",
              "ambient_light": 0.58,
              "receipt_underlay": true,
              "camera_mode": "stationary_perspective"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 25,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "humanOutcome": "Ready this computer for HoloLand world building",
              "readinessState": "unknown",
              "hololandMutationAllowed": false,
              "previewMode": "read_only",
              "selectedLocalFileCount": 0,
              "passedGateCount": 0,
              "warningGateCount": 0,
              "blockedGateCount": 0,
              "replayReady": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 33,
                "column": 3
              },
              "end": {
                "line": 43,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "WorldBuildGate",
            "properties": {
              "type": "readiness_gate",
              "mesh": "rounded_panel",
              "material": "liquid_glass",
              "color": "#14212c",
              "active_color": "#73daca",
              "warning_color": "#e0af68",
              "blocked_color": "#f7768e",
              "receipt_required": true,
              "inspectable": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 45,
                "column": 3
              },
              "end": {
                "line": 55,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "GateToken",
            "properties": {
              "type": "receipt_token",
              "mesh": "sphere",
              "material": "hologram",
              "radius": 0.15,
              "grabbable": true,
              "receipt_required": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 57,
                "column": 3
              },
              "end": {
                "line": 64,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "OutcomePedestal",
            "id": "OutcomePedestal",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Ready This Computer",
              "gate_id": "human_outcome",
              "position": [
                0,
                2.35,
                -2.9
              ],
              "scale": [
                2.6,
                0.7,
                0.08
              ],
              "status_binding": "readinessState",
              "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 66,
                "column": 3
              },
              "end": {
                "line": 73,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessGates",
            "id": "ReadinessGates",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "LocalFilesGate",
                "id": "LocalFilesGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Local Files",
                  "gate_id": "local_files",
                  "receipt": "LocalFileManifestReceipt",
                  "failure_states": [
                    "missing_manifest",
                    "sensitive_path",
                    "unreadable_file",
                    "duplicate_asset"
                  ],
                  "approval": "silent_read",
                  "position": [
                    -3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 76,
                    "column": 5
                  },
                  "end": {
                    "line": 83,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "HardwareGate",
                "id": "HardwareGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Hardware",
                  "gate_id": "hardware_reality",
                  "receipt": "CodexHardwareAuditReceipt",
                  "failure_states": [
                    "missing_browser_witness",
                    "weak_gpu",
                    "memory_pressure",
                    "stale_probe"
                  ],
                  "approval": "silent_read_or_guarded_witness",
                  "position": [
                    -1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 85,
                    "column": 5
                  },
                  "end": {
                    "line": 92,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "SourceGate",
                "id": "SourceGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Source",
                  "gate_id": "source_validation",
                  "receipt": "SourceValidationReceipt",
                  "failure_states": [
                    "invalid_source",
                    "stale_source_map",
                    "typescript_only_product_behavior"
                  ],
                  "approval": "guarded_validation",
                  "position": [
                    1.08,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 94,
                    "column": 5
                  },
                  "end": {
                    "line": 101,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "BuildGate",
                "id": "BuildGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Build Custody",
                  "gate_id": "build_custody",
                  "receipt": "BuildCustodyReceipt",
                  "failure_states": [
                    "unknown_owner",
                    "high_memory",
                    "long_running_build",
                    "scanner_unavailable"
                  ],
                  "approval": "break_glass_only_for_termination",
                  "position": [
                    3.25,
                    1.35,
                    -1.55
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 103,
                    "column": 5
                  },
                  "end": {
                    "line": 110,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "PreviewGate",
                "id": "PreviewGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "World Preview",
                  "gate_id": "hololand_preview",
                  "receipt": "VisualWitnessReceipt",
                  "failure_states": [
                    "preview_missing",
                    "screenshot_missing",
                    "dom_witness_missing"
                  ],
                  "approval": "publish_import_blocked_until_promoted",
                  "position": [
                    -2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 112,
                    "column": 5
                  },
                  "end": {
                    "line": 119,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "AgentGate",
                "id": "AgentGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Agent Orchestra",
                  "gate_id": "agent_orchestra",
                  "receipt": "AgentLaneReceipt",
                  "failure_states": [
                    "unattributed_shell_run",
                    "duplicate_task",
                    "unsigned_mutation"
                  ],
                  "approval": "owner_lanes_visible",
                  "position": [
                    0,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 121,
                    "column": 5
                  },
                  "end": {
                    "line": 128,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "ReplayGate",
                "id": "ReplayGate",
                "properties": {
                  "__templateRef": "WorldBuildGate",
                  "label": "Replay",
                  "gate_id": "replay",
                  "receipt": "WorldBuildReadinessCockpitReceipt",
                  "failure_states": [
                    "non_replayable_command",
                    "missing_stdout_hash",
                    "missing_rollback_note"
                  ],
                  "approval": "show_changes_before_promotion",
                  "position": [
                    2.16,
                    0.42,
                    0.05
                  ]
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 130,
                    "column": 5
                  },
                  "end": {
                    "line": 137,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 75,
                "column": 3
              },
              "end": {
                "line": 138,
                "column": 4
              }
            }
          },
          {
            "type": "spatial_group",
            "name": "ReadinessTokens",
            "id": "ReadinessTokens",
            "properties": {},
            "directives": [],
            "children": [
              {
                "type": "object",
                "name": "HardwarePassToken",
                "id": "HardwarePassToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Hardware pass",
                  "receipt_kind": "codex_hardware_audit",
                  "position": [
                    -1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#73daca"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 141,
                    "column": 5
                  },
                  "end": {
                    "line": 146,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "GraphWarningToken",
                "id": "GraphWarningToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "Graph warning",
                  "receipt_kind": "graph_unavailable_receipt",
                  "next_action": "Use local HoloShell source-files adapter",
                  "position": [
                    1.08,
                    0.86,
                    0.76
                  ],
                  "color": "#e0af68"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 148,
                    "column": 5
                  },
                  "end": {
                    "line": 154,
                    "column": 6
                  }
                }
              },
              {
                "type": "object",
                "name": "NoMutationToken",
                "id": "NoMutationToken",
                "properties": {
                  "__templateRef": "GateToken",
                  "label": "HoloLand read-only until promotion",
                  "receipt_kind": "worktree_boundary_receipt",
                  "position": [
                    0,
                    0.86,
                    1.18
                  ],
                  "color": "#9ece6a"
                },
                "directives": [],
                "children": [],
                "traits": {},
                "loc": {
                  "start": {
                    "line": 156,
                    "column": 5
                  },
                  "end": {
                    "line": 161,
                    "column": 6
                  }
                }
              }
            ],
            "traits": {},
            "loc": {
              "start": {
                "line": 140,
                "column": 3
              },
              "end": {
                "line": 162,
                "column": 4
              }
            }
          },
          {
            "type": "object",
            "name": "WorldBuildTimeline",
            "id": "WorldBuildTimeline",
            "properties": {
              "type": "timeline",
              "mesh": "cube",
              "material": "hologram",
              "color": "#6a7282",
              "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
              "position": [
                0,
                0.02,
                1.5
              ],
              "scale": [
                5.9,
                0.08,
                0.12
              ],
              "receipt_required": true
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 164,
                "column": 3
              },
              "end": {
                "line": 173,
                "column": 4
              }
            }
          },
          {
            "type": "logic",
            "name": "logic",
            "id": "logic",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": {
              "functions": [],
              "actions": [
                {
                  "name": "focus_gate",
                  "params": [
                    "gateId"
                  ],
                  "body": "emit \"holoshell_world_build_gate_focused\""
                },
                {
                  "name": "promote_preview",
                  "params": [],
                  "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
                }
              ],
              "eventHandlers": [],
              "tickHandlers": []
            },
            "loc": {
              "start": {
                "line": 175,
                "column": 3
              },
              "end": {
                "line": 190,
                "column": 4
              }
            }
          }
        ],
        "properties": {}
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 191,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell World Build Cockpit",
    "id": "HoloShell World Build Cockpit",
    "properties": {},
    "directives": [],
    "children": [
      {
        "type": "metadata",
        "properties": {
          "title": "World Build Cockpit",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
          "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
          "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
          "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
          "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
          "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
          "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
          "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
          "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
          "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
          "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
            "line": 23,
            "column": 4
          }
        }
      },
      {
        "type": "environment",
        "properties": {
          "theme": "holo_os_world_build",
          "render_mode": "desktop_spatial",
          "ambient_light": 0.58,
          "receipt_underlay": true,
          "camera_mode": "stationary_perspective"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 25,
            "column": 3
          },
          "end": {
            "line": 31,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "humanOutcome": "Ready this computer for HoloLand world building",
          "readinessState": "unknown",
          "hololandMutationAllowed": false,
          "previewMode": "read_only",
          "selectedLocalFileCount": 0,
          "passedGateCount": 0,
          "warningGateCount": 0,
          "blockedGateCount": 0,
          "replayReady": false
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 33,
            "column": 3
          },
          "end": {
            "line": 43,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "WorldBuildGate",
        "properties": {
          "type": "readiness_gate",
          "mesh": "rounded_panel",
          "material": "liquid_glass",
          "color": "#14212c",
          "active_color": "#73daca",
          "warning_color": "#e0af68",
          "blocked_color": "#f7768e",
          "receipt_required": true,
          "inspectable": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 45,
            "column": 3
          },
          "end": {
            "line": 55,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "GateToken",
        "properties": {
          "type": "receipt_token",
          "mesh": "sphere",
          "material": "hologram",
          "radius": 0.15,
          "grabbable": true,
          "receipt_required": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 57,
            "column": 3
          },
          "end": {
            "line": 64,
            "column": 4
          }
        }
      },
      {
        "type": "object",
        "name": "OutcomePedestal",
        "id": "OutcomePedestal",
        "properties": {
          "__templateRef": "WorldBuildGate",
          "label": "Ready This Computer",
          "gate_id": "human_outcome",
          "position": [
            0,
            2.35,
            -2.9
          ],
          "scale": [
            2.6,
            0.7,
            0.08
          ],
          "status_binding": "readinessState",
          "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 66,
            "column": 3
          },
          "end": {
            "line": 73,
            "column": 4
          }
        }
      },
      {
        "type": "spatial_group",
        "name": "ReadinessGates",
        "id": "ReadinessGates",
        "properties": {},
        "directives": [],
        "children": [
          {
            "type": "object",
            "name": "LocalFilesGate",
            "id": "LocalFilesGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Local Files",
              "gate_id": "local_files",
              "receipt": "LocalFileManifestReceipt",
              "failure_states": [
                "missing_manifest",
                "sensitive_path",
                "unreadable_file",
                "duplicate_asset"
              ],
              "approval": "silent_read",
              "position": [
                -3.25,
                1.35,
                -1.55
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 76,
                "column": 5
              },
              "end": {
                "line": 83,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "HardwareGate",
            "id": "HardwareGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Hardware",
              "gate_id": "hardware_reality",
              "receipt": "CodexHardwareAuditReceipt",
              "failure_states": [
                "missing_browser_witness",
                "weak_gpu",
                "memory_pressure",
                "stale_probe"
              ],
              "approval": "silent_read_or_guarded_witness",
              "position": [
                -1.08,
                1.35,
                -1.55
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 85,
                "column": 5
              },
              "end": {
                "line": 92,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "SourceGate",
            "id": "SourceGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Source",
              "gate_id": "source_validation",
              "receipt": "SourceValidationReceipt",
              "failure_states": [
                "invalid_source",
                "stale_source_map",
                "typescript_only_product_behavior"
              ],
              "approval": "guarded_validation",
              "position": [
                1.08,
                1.35,
                -1.55
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 94,
                "column": 5
              },
              "end": {
                "line": 101,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "BuildGate",
            "id": "BuildGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Build Custody",
              "gate_id": "build_custody",
              "receipt": "BuildCustodyReceipt",
              "failure_states": [
                "unknown_owner",
                "high_memory",
                "long_running_build",
                "scanner_unavailable"
              ],
              "approval": "break_glass_only_for_termination",
              "position": [
                3.25,
                1.35,
                -1.55
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 103,
                "column": 5
              },
              "end": {
                "line": 110,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "PreviewGate",
            "id": "PreviewGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "World Preview",
              "gate_id": "hololand_preview",
              "receipt": "VisualWitnessReceipt",
              "failure_states": [
                "preview_missing",
                "screenshot_missing",
                "dom_witness_missing"
              ],
              "approval": "publish_import_blocked_until_promoted",
              "position": [
                -2.16,
                0.42,
                0.05
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 112,
                "column": 5
              },
              "end": {
                "line": 119,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "AgentGate",
            "id": "AgentGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Agent Orchestra",
              "gate_id": "agent_orchestra",
              "receipt": "AgentLaneReceipt",
              "failure_states": [
                "unattributed_shell_run",
                "duplicate_task",
                "unsigned_mutation"
              ],
              "approval": "owner_lanes_visible",
              "position": [
                0,
                0.42,
                0.05
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 121,
                "column": 5
              },
              "end": {
                "line": 128,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "ReplayGate",
            "id": "ReplayGate",
            "properties": {
              "__templateRef": "WorldBuildGate",
              "label": "Replay",
              "gate_id": "replay",
              "receipt": "WorldBuildReadinessCockpitReceipt",
              "failure_states": [
                "non_replayable_command",
                "missing_stdout_hash",
                "missing_rollback_note"
              ],
              "approval": "show_changes_before_promotion",
              "position": [
                2.16,
                0.42,
                0.05
              ]
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 130,
                "column": 5
              },
              "end": {
                "line": 137,
                "column": 6
              }
            }
          }
        ],
        "traits": {},
        "loc": {
          "start": {
            "line": 75,
            "column": 3
          },
          "end": {
            "line": 138,
            "column": 4
          }
        }
      },
      {
        "type": "spatial_group",
        "name": "ReadinessTokens",
        "id": "ReadinessTokens",
        "properties": {},
        "directives": [],
        "children": [
          {
            "type": "object",
            "name": "HardwarePassToken",
            "id": "HardwarePassToken",
            "properties": {
              "__templateRef": "GateToken",
              "label": "Hardware pass",
              "receipt_kind": "codex_hardware_audit",
              "position": [
                -1.08,
                0.86,
                0.76
              ],
              "color": "#73daca"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 141,
                "column": 5
              },
              "end": {
                "line": 146,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "GraphWarningToken",
            "id": "GraphWarningToken",
            "properties": {
              "__templateRef": "GateToken",
              "label": "Graph warning",
              "receipt_kind": "graph_unavailable_receipt",
              "next_action": "Use local HoloShell source-files adapter",
              "position": [
                1.08,
                0.86,
                0.76
              ],
              "color": "#e0af68"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 148,
                "column": 5
              },
              "end": {
                "line": 154,
                "column": 6
              }
            }
          },
          {
            "type": "object",
            "name": "NoMutationToken",
            "id": "NoMutationToken",
            "properties": {
              "__templateRef": "GateToken",
              "label": "HoloLand read-only until promotion",
              "receipt_kind": "worktree_boundary_receipt",
              "position": [
                0,
                0.86,
                1.18
              ],
              "color": "#9ece6a"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 156,
                "column": 5
              },
              "end": {
                "line": 161,
                "column": 6
              }
            }
          }
        ],
        "traits": {},
        "loc": {
          "start": {
            "line": 140,
            "column": 3
          },
          "end": {
            "line": 162,
            "column": 4
          }
        }
      },
      {
        "type": "object",
        "name": "WorldBuildTimeline",
        "id": "WorldBuildTimeline",
        "properties": {
          "type": "timeline",
          "mesh": "cube",
          "material": "hologram",
          "color": "#6a7282",
          "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
          "position": [
            0,
            0.02,
            1.5
          ],
          "scale": [
            5.9,
            0.08,
            0.12
          ],
          "receipt_required": true
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 164,
            "column": 3
          },
          "end": {
            "line": 173,
            "column": 4
          }
        }
      },
      {
        "type": "logic",
        "name": "logic",
        "id": "logic",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": {
          "functions": [],
          "actions": [
            {
              "name": "focus_gate",
              "params": [
                "gateId"
              ],
              "body": "emit \"holoshell_world_build_gate_focused\""
            },
            {
              "name": "promote_preview",
              "params": [],
              "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
            }
          ],
          "eventHandlers": [],
          "tickHandlers": []
        },
        "loc": {
          "start": {
            "line": 175,
            "column": 3
          },
          "end": {
            "line": 190,
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
          "type": "metadata",
          "properties": {
            "title": "World Build Cockpit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "behavior_source": "apps/holoshell/source/holoshell-world-build-cockpit-policy.hsplus",
            "pipeline_source": "apps/holoshell/source/holoshell-world-build-cockpit-pipeline.hs",
            "shell_world_source": "apps/holoshell/source/holoshell-shell-world.holo",
            "readiness_source": "apps/holoshell/source/holoshell-readiness-evidence.hsplus",
            "build_custody_source": "apps/holoshell/source/holoshell-build-custody.hsplus",
            "hardware_reality_source": "apps/holoshell/source/holoshell-hardware-reality-bridge.hsplus",
            "source_validation_source": "apps/holoshell/source/holoshell-source-validation.hsplus",
            "visual_witness_source": "apps/holoshell/source/holoshell-visual-witness.hsplus",
            "local_file_manifest_source": "apps/holoshell/source/holoshell-local-file-manifest.hsplus",
            "codex_hardware_audit_source": "apps/holoshell/source/holoshell-codex-hardware-audit.hsplus",
            "agent_lane_source": "apps/holoshell/source/holoshell-agent-presence-lanes.hsplus"
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
              "line": 23,
              "column": 4
            }
          }
        },
        {
          "type": "environment",
          "properties": {
            "theme": "holo_os_world_build",
            "render_mode": "desktop_spatial",
            "ambient_light": 0.58,
            "receipt_underlay": true,
            "camera_mode": "stationary_perspective"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 25,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "humanOutcome": "Ready this computer for HoloLand world building",
            "readinessState": "unknown",
            "hololandMutationAllowed": false,
            "previewMode": "read_only",
            "selectedLocalFileCount": 0,
            "passedGateCount": 0,
            "warningGateCount": 0,
            "blockedGateCount": 0,
            "replayReady": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 33,
              "column": 3
            },
            "end": {
              "line": 43,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "WorldBuildGate",
          "properties": {
            "type": "readiness_gate",
            "mesh": "rounded_panel",
            "material": "liquid_glass",
            "color": "#14212c",
            "active_color": "#73daca",
            "warning_color": "#e0af68",
            "blocked_color": "#f7768e",
            "receipt_required": true,
            "inspectable": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 45,
              "column": 3
            },
            "end": {
              "line": 55,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "GateToken",
          "properties": {
            "type": "receipt_token",
            "mesh": "sphere",
            "material": "hologram",
            "radius": 0.15,
            "grabbable": true,
            "receipt_required": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 57,
              "column": 3
            },
            "end": {
              "line": 64,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "OutcomePedestal",
          "id": "OutcomePedestal",
          "properties": {
            "__templateRef": "WorldBuildGate",
            "label": "Ready This Computer",
            "gate_id": "human_outcome",
            "position": [
              0,
              2.35,
              -2.9
            ],
            "scale": [
              2.6,
              0.7,
              0.08
            ],
            "status_binding": "readinessState",
            "plain_language": "Use local files, verify hardware and source, preview the world, show what changed."
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 66,
              "column": 3
            },
            "end": {
              "line": 73,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessGates",
          "id": "ReadinessGates",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "LocalFilesGate",
              "id": "LocalFilesGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Local Files",
                "gate_id": "local_files",
                "receipt": "LocalFileManifestReceipt",
                "failure_states": [
                  "missing_manifest",
                  "sensitive_path",
                  "unreadable_file",
                  "duplicate_asset"
                ],
                "approval": "silent_read",
                "position": [
                  -3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 76,
                  "column": 5
                },
                "end": {
                  "line": 83,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "HardwareGate",
              "id": "HardwareGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Hardware",
                "gate_id": "hardware_reality",
                "receipt": "CodexHardwareAuditReceipt",
                "failure_states": [
                  "missing_browser_witness",
                  "weak_gpu",
                  "memory_pressure",
                  "stale_probe"
                ],
                "approval": "silent_read_or_guarded_witness",
                "position": [
                  -1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 85,
                  "column": 5
                },
                "end": {
                  "line": 92,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "SourceGate",
              "id": "SourceGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Source",
                "gate_id": "source_validation",
                "receipt": "SourceValidationReceipt",
                "failure_states": [
                  "invalid_source",
                  "stale_source_map",
                  "typescript_only_product_behavior"
                ],
                "approval": "guarded_validation",
                "position": [
                  1.08,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 94,
                  "column": 5
                },
                "end": {
                  "line": 101,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "BuildGate",
              "id": "BuildGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Build Custody",
                "gate_id": "build_custody",
                "receipt": "BuildCustodyReceipt",
                "failure_states": [
                  "unknown_owner",
                  "high_memory",
                  "long_running_build",
                  "scanner_unavailable"
                ],
                "approval": "break_glass_only_for_termination",
                "position": [
                  3.25,
                  1.35,
                  -1.55
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 103,
                  "column": 5
                },
                "end": {
                  "line": 110,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "PreviewGate",
              "id": "PreviewGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "World Preview",
                "gate_id": "hololand_preview",
                "receipt": "VisualWitnessReceipt",
                "failure_states": [
                  "preview_missing",
                  "screenshot_missing",
                  "dom_witness_missing"
                ],
                "approval": "publish_import_blocked_until_promoted",
                "position": [
                  -2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 112,
                  "column": 5
                },
                "end": {
                  "line": 119,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "AgentGate",
              "id": "AgentGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Agent Orchestra",
                "gate_id": "agent_orchestra",
                "receipt": "AgentLaneReceipt",
                "failure_states": [
                  "unattributed_shell_run",
                  "duplicate_task",
                  "unsigned_mutation"
                ],
                "approval": "owner_lanes_visible",
                "position": [
                  0,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 121,
                  "column": 5
                },
                "end": {
                  "line": 128,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "ReplayGate",
              "id": "ReplayGate",
              "properties": {
                "__templateRef": "WorldBuildGate",
                "label": "Replay",
                "gate_id": "replay",
                "receipt": "WorldBuildReadinessCockpitReceipt",
                "failure_states": [
                  "non_replayable_command",
                  "missing_stdout_hash",
                  "missing_rollback_note"
                ],
                "approval": "show_changes_before_promotion",
                "position": [
                  2.16,
                  0.42,
                  0.05
                ]
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 130,
                  "column": 5
                },
                "end": {
                  "line": 137,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 75,
              "column": 3
            },
            "end": {
              "line": 138,
              "column": 4
            }
          }
        },
        {
          "type": "spatial_group",
          "name": "ReadinessTokens",
          "id": "ReadinessTokens",
          "properties": {},
          "directives": [],
          "children": [
            {
              "type": "object",
              "name": "HardwarePassToken",
              "id": "HardwarePassToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Hardware pass",
                "receipt_kind": "codex_hardware_audit",
                "position": [
                  -1.08,
                  0.86,
                  0.76
                ],
                "color": "#73daca"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 141,
                  "column": 5
                },
                "end": {
                  "line": 146,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "GraphWarningToken",
              "id": "GraphWarningToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "Graph warning",
                "receipt_kind": "graph_unavailable_receipt",
                "next_action": "Use local HoloShell source-files adapter",
                "position": [
                  1.08,
                  0.86,
                  0.76
                ],
                "color": "#e0af68"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 148,
                  "column": 5
                },
                "end": {
                  "line": 154,
                  "column": 6
                }
              }
            },
            {
              "type": "object",
              "name": "NoMutationToken",
              "id": "NoMutationToken",
              "properties": {
                "__templateRef": "GateToken",
                "label": "HoloLand read-only until promotion",
                "receipt_kind": "worktree_boundary_receipt",
                "position": [
                  0,
                  0.86,
                  1.18
                ],
                "color": "#9ece6a"
              },
              "directives": [],
              "children": [],
              "traits": {},
              "loc": {
                "start": {
                  "line": 156,
                  "column": 5
                },
                "end": {
                  "line": 161,
                  "column": 6
                }
              }
            }
          ],
          "traits": {},
          "loc": {
            "start": {
              "line": 140,
              "column": 3
            },
            "end": {
              "line": 162,
              "column": 4
            }
          }
        },
        {
          "type": "object",
          "name": "WorldBuildTimeline",
          "id": "WorldBuildTimeline",
          "properties": {
            "type": "timeline",
            "mesh": "cube",
            "material": "hologram",
            "color": "#6a7282",
            "label": "files -> hardware -> source -> build custody -> preview -> tasks -> replay",
            "position": [
              0,
              0.02,
              1.5
            ],
            "scale": [
              5.9,
              0.08,
              0.12
            ],
            "receipt_required": true
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 164,
              "column": 3
            },
            "end": {
              "line": 173,
              "column": 4
            }
          }
        },
        {
          "type": "logic",
          "name": "logic",
          "id": "logic",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": {
            "functions": [],
            "actions": [
              {
                "name": "focus_gate",
                "params": [
                  "gateId"
                ],
                "body": "emit \"holoshell_world_build_gate_focused\""
              },
              {
                "name": "promote_preview",
                "params": [],
                "body": "if ( state . blockedGateCount == 0 ) {\n\n state . hololandMutationAllowed = true \n\nemit \"holoshell_world_build_preview_promoted\" \n\n }"
              }
            ],
            "eventHandlers": [],
            "tickHandlers": []
          },
          "loc": {
            "start": {
              "line": 175,
              "column": 3
            },
            "end": {
              "line": 190,
              "column": 4
            }
          }
        }
      ],
      "properties": {}
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 191,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}