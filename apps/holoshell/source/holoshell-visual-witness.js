{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Visual Witness",
      "id": "HoloShell Visual Witness",
      "properties": {
        "policy": "WitnessesAreReadOnly",
        "room": "VisualWitnessRoom"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Visual Witness",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-visual-witness.mjs",
            "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
            "defaultOutput": ".tmp/holoshell/visual-witness.json",
            "playableShardWitnessMode": "--shard-import-receipt",
            "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
            "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
              "line": 18,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "missingText": [],
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 20,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:visual:witness",
          "id": "holoshell:visual:witness",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
              "line": 37,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "VisualWitnessReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "visual_witness",
            "source": "local_chromium_headless",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "expectedText": [],
            "missingText": [],
            "destructiveActionsTaken": false,
            "terminationPerformed": false,
            "mutationPerformed": false,
            "rawCommandsIncluded": false
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 39,
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
          "name": "record_visual_witness",
          "id": "record_visual_witness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 125,
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
              "title": "Visual Witness",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-visual-witness.mjs",
              "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
              "defaultOutput": ".tmp/holoshell/visual-witness.json",
              "playableShardWitnessMode": "--shard-import-receipt",
              "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
              "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
                "line": 18,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "missingText": [],
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 20,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:visual:witness",
            "id": "holoshell:visual:witness",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
                "line": 37,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "VisualWitnessReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "visual_witness",
              "source": "local_chromium_headless",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "expectedText": [],
              "missingText": [],
              "destructiveActionsTaken": false,
              "terminationPerformed": false,
              "mutationPerformed": false,
              "rawCommandsIncluded": false
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 39,
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
            "name": "record_visual_witness",
            "id": "record_visual_witness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 125,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "WitnessesAreReadOnly",
          "room": "VisualWitnessRoom"
        }
      },
      "loc": {
        "start": {
          "line": 7,
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
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Visual Witness",
      "id": "HoloShell Visual Witness",
      "properties": {
        "policy": "WitnessesAreReadOnly",
        "room": "VisualWitnessRoom"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Visual Witness",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-visual-witness.mjs",
            "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
            "defaultOutput": ".tmp/holoshell/visual-witness.json",
            "playableShardWitnessMode": "--shard-import-receipt",
            "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
            "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
              "line": 18,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "missingText": [],
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 20,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:visual:witness",
          "id": "holoshell:visual:witness",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
              "line": 37,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "VisualWitnessReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "visual_witness",
            "source": "local_chromium_headless",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "expectedText": [],
            "missingText": [],
            "destructiveActionsTaken": false,
            "terminationPerformed": false,
            "mutationPerformed": false,
            "rawCommandsIncluded": false
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 39,
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
          "name": "record_visual_witness",
          "id": "record_visual_witness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 125,
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
              "title": "Visual Witness",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-visual-witness.mjs",
              "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
              "defaultOutput": ".tmp/holoshell/visual-witness.json",
              "playableShardWitnessMode": "--shard-import-receipt",
              "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
              "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
                "line": 18,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "missingText": [],
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 20,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:visual:witness",
            "id": "holoshell:visual:witness",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
                "line": 37,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "VisualWitnessReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "visual_witness",
              "source": "local_chromium_headless",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "expectedText": [],
              "missingText": [],
              "destructiveActionsTaken": false,
              "terminationPerformed": false,
              "mutationPerformed": false,
              "rawCommandsIncluded": false
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 39,
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
            "name": "record_visual_witness",
            "id": "record_visual_witness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 125,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "WitnessesAreReadOnly",
          "room": "VisualWitnessRoom"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 126,
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
      "line": 126,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Visual Witness",
      "id": "HoloShell Visual Witness",
      "properties": {
        "policy": "WitnessesAreReadOnly",
        "room": "VisualWitnessRoom"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Visual Witness",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-visual-witness.mjs",
            "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
            "defaultOutput": ".tmp/holoshell/visual-witness.json",
            "playableShardWitnessMode": "--shard-import-receipt",
            "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
            "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
              "line": 18,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "missingText": [],
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 20,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:visual:witness",
          "id": "holoshell:visual:witness",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
              "line": 37,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "VisualWitnessReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "visual_witness",
            "source": "local_chromium_headless",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "expectedText": [],
            "missingText": [],
            "destructiveActionsTaken": false,
            "terminationPerformed": false,
            "mutationPerformed": false,
            "rawCommandsIncluded": false
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 39,
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
          "name": "record_visual_witness",
          "id": "record_visual_witness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 125,
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
              "title": "Visual Witness",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-visual-witness.mjs",
              "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
              "defaultOutput": ".tmp/holoshell/visual-witness.json",
              "playableShardWitnessMode": "--shard-import-receipt",
              "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
              "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
                "line": 18,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "missingText": [],
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 20,
                "column": 3
              },
              "end": {
                "line": 31,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:visual:witness",
            "id": "holoshell:visual:witness",
            "properties": {
              "type": "append_only",
              "priority": "high",
              "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
                "line": 37,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "VisualWitnessReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "visual_witness",
              "source": "local_chromium_headless",
              "roomPath": "",
              "browserPath": "",
              "screenshotPath": "",
              "screenshotHash": "",
              "domWitnessPath": "",
              "domWitnessHash": "",
              "expectedText": [],
              "missingText": [],
              "destructiveActionsTaken": false,
              "terminationPerformed": false,
              "mutationPerformed": false,
              "rawCommandsIncluded": false
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 39,
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
            "name": "record_visual_witness",
            "id": "record_visual_witness",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
            "loc": {
              "start": {
                "line": 100,
                "column": 3
              },
              "end": {
                "line": 125,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "WitnessesAreReadOnly",
          "room": "VisualWitnessRoom"
        }
      },
      "loc": {
        "start": {
          "line": 7,
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
    "type": "composition",
    "name": "HoloShell Visual Witness",
    "id": "HoloShell Visual Witness",
    "properties": {
      "policy": "WitnessesAreReadOnly",
      "room": "VisualWitnessRoom"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Visual Witness",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-visual-witness.mjs",
          "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
          "defaultOutput": ".tmp/holoshell/visual-witness.json",
          "playableShardWitnessMode": "--shard-import-receipt",
          "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
          "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
            "line": 18,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "status": "unknown",
          "roomPath": "",
          "browserPath": "",
          "screenshotPath": "",
          "screenshotHash": "",
          "domWitnessPath": "",
          "domWitnessHash": "",
          "missingText": [],
          "destructiveActionsTaken": false,
          "rawCommandsIncluded": false
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 20,
            "column": 3
          },
          "end": {
            "line": 31,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:visual:witness",
        "id": "holoshell:visual:witness",
        "properties": {
          "type": "append_only",
          "priority": "high",
          "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
            "line": 37,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "VisualWitnessReceipt",
        "properties": {
          "type": "receipt",
          "receiptType": "visual_witness",
          "source": "local_chromium_headless",
          "roomPath": "",
          "browserPath": "",
          "screenshotPath": "",
          "screenshotHash": "",
          "domWitnessPath": "",
          "domWitnessHash": "",
          "expectedText": [],
          "missingText": [],
          "destructiveActionsTaken": false,
          "terminationPerformed": false,
          "mutationPerformed": false,
          "rawCommandsIncluded": false
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 39,
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
        "name": "record_visual_witness",
        "id": "record_visual_witness",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
        "loc": {
          "start": {
            "line": 100,
            "column": 3
          },
          "end": {
            "line": 125,
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
            "title": "Visual Witness",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-visual-witness.mjs",
            "defaultRoom": "apps/holoshell/prototype/hardware-reality-room.html",
            "defaultOutput": ".tmp/holoshell/visual-witness.json",
            "playableShardWitnessMode": "--shard-import-receipt",
            "playableShardWitnessOutput": ".tmp/holoshell/playable-shard-witness.json",
            "playableShardWitnessDir": ".tmp/holoshell/playable-shard-witness"
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
              "line": 18,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "missingText": [],
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 20,
              "column": 3
            },
            "end": {
              "line": 31,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:visual:witness",
          "id": "holoshell:visual:witness",
          "properties": {
            "type": "append_only",
            "priority": "high",
            "description": "Local screenshot and DOM receipts for HoloShell room verification"
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
              "line": 37,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "VisualWitnessReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "visual_witness",
            "source": "local_chromium_headless",
            "roomPath": "",
            "browserPath": "",
            "screenshotPath": "",
            "screenshotHash": "",
            "domWitnessPath": "",
            "domWitnessHash": "",
            "expectedText": [],
            "missingText": [],
            "destructiveActionsTaken": false,
            "terminationPerformed": false,
            "mutationPerformed": false,
            "rawCommandsIncluded": false
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 39,
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
          "name": "record_visual_witness",
          "id": "record_visual_witness",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = result.status\n    state.roomPath = result.room.path\n    state.browserPath = result.browser.path\n    state.screenshotPath = result.screenshot.path\n    state.screenshotHash = result.screenshot.sha256\n    state.domWitnessPath = result.domWitness.path\n    state.domWitnessHash = result.domWitness.sha256\n    state.missingText = result.domWitness.missingText\n    state.destructiveActionsTaken = result.safety.destructiveActionsTaken\n    state.rawCommandsIncluded = result.safety.rawCommandsIncluded\n\n    emit(\"holoshell:visual:witness\", {\n      status: state.status,\n      roomPath: state.roomPath,\n      browserPath: state.browserPath,\n      screenshotPath: state.screenshotPath,\n      screenshotHash: state.screenshotHash,\n      domWitnessPath: state.domWitnessPath,\n      domWitnessHash: state.domWitnessHash,\n      missingText: state.missingText,\n      destructiveActionsTaken: state.destructiveActionsTaken,\n      rawCommandsIncluded: state.rawCommandsIncluded,\n      receiptRequired: true\n    })",
          "loc": {
            "start": {
              "line": 100,
              "column": 3
            },
            "end": {
              "line": 125,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "policy": "WitnessesAreReadOnly",
        "room": "VisualWitnessRoom"
      }
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 126,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}