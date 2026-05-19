{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Build Custody",
      "id": "HoloShell Build Custody",
      "properties": {
        "room": "BuildCustodyRoom",
        "policy": "BuildOwnershipInferenceIsEvidence"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Build Custody",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-build-custody.mjs",
            "defaultMode": "read_only_hardware_custody"
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
              "line": 14,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "riskState": "unknown",
            "scannerStatus": "unknown",
            "processCount": 0,
            "buildProcessCount": 0,
            "activeBuildTreeCount": 0,
            "ownedBuildProcessCount": 0,
            "ownedBuildTreeCount": 0,
            "ownerUnknownBuildTreeCount": 0,
            "longRunningBuildCount": 0,
            "highMemoryBuildCount": 0,
            "reviewRequiredCount": 0,
            "lastBuildCustodyReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 16,
              "column": 3
            },
            "end": {
              "line": 29,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:build:custody",
          "id": "holoshell:build:custody",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Local build process trees and guarded PID custody state"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 31,
              "column": 3
            },
            "end": {
              "line": 35,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildProcess",
          "properties": {
            "type": "machine",
            "machineType": "build_process",
            "pid": 0,
            "parentPid": 0,
            "processName": "process",
            "buildKind": "build_child",
            "ageMinutes": 0,
            "memoryMb": 0,
            "commandHash": "",
            "rawCommandHidden": true,
            "custodyState": "active_build",
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "stopPolicy": "break_glass_required",
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 37,
              "column": 3
            },
            "end": {
              "line": 57,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildTree",
          "properties": {
            "type": "machine",
            "machineType": "build_tree",
            "treeId": "",
            "rootPid": 0,
            "status": "active",
            "processCount": 0,
            "maxAgeMinutes": 0,
            "totalMemoryMb": 0,
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "ownedProcessCount": 0,
            "processPids": [],
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 59,
              "column": 3
            },
            "end": {
              "line": 77,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_build_custody",
          "id": "consume_build_custody",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
          "loc": {
            "start": {
              "line": 157,
              "column": 3
            },
            "end": {
              "line": 185,
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
              "title": "Build Custody",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-build-custody.mjs",
              "defaultMode": "read_only_hardware_custody"
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
                "line": 14,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "riskState": "unknown",
              "scannerStatus": "unknown",
              "processCount": 0,
              "buildProcessCount": 0,
              "activeBuildTreeCount": 0,
              "ownedBuildProcessCount": 0,
              "ownedBuildTreeCount": 0,
              "ownerUnknownBuildTreeCount": 0,
              "longRunningBuildCount": 0,
              "highMemoryBuildCount": 0,
              "reviewRequiredCount": 0,
              "lastBuildCustodyReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 16,
                "column": 3
              },
              "end": {
                "line": 29,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:build:custody",
            "id": "holoshell:build:custody",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Local build process trees and guarded PID custody state"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 31,
                "column": 3
              },
              "end": {
                "line": 35,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildProcess",
            "properties": {
              "type": "machine",
              "machineType": "build_process",
              "pid": 0,
              "parentPid": 0,
              "processName": "process",
              "buildKind": "build_child",
              "ageMinutes": 0,
              "memoryMb": 0,
              "commandHash": "",
              "rawCommandHidden": true,
              "custodyState": "active_build",
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "stopPolicy": "break_glass_required",
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 37,
                "column": 3
              },
              "end": {
                "line": 57,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildTree",
            "properties": {
              "type": "machine",
              "machineType": "build_tree",
              "treeId": "",
              "rootPid": 0,
              "status": "active",
              "processCount": 0,
              "maxAgeMinutes": 0,
              "totalMemoryMb": 0,
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "ownedProcessCount": 0,
              "processPids": [],
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 59,
                "column": 3
              },
              "end": {
                "line": 77,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_build_custody",
            "id": "consume_build_custody",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
            "loc": {
              "start": {
                "line": 157,
                "column": 3
              },
              "end": {
                "line": 185,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "BuildCustodyRoom",
          "policy": "BuildOwnershipInferenceIsEvidence"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 186,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Build Custody",
      "id": "HoloShell Build Custody",
      "properties": {
        "room": "BuildCustodyRoom",
        "policy": "BuildOwnershipInferenceIsEvidence"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Build Custody",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-build-custody.mjs",
            "defaultMode": "read_only_hardware_custody"
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
              "line": 14,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "riskState": "unknown",
            "scannerStatus": "unknown",
            "processCount": 0,
            "buildProcessCount": 0,
            "activeBuildTreeCount": 0,
            "ownedBuildProcessCount": 0,
            "ownedBuildTreeCount": 0,
            "ownerUnknownBuildTreeCount": 0,
            "longRunningBuildCount": 0,
            "highMemoryBuildCount": 0,
            "reviewRequiredCount": 0,
            "lastBuildCustodyReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 16,
              "column": 3
            },
            "end": {
              "line": 29,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:build:custody",
          "id": "holoshell:build:custody",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Local build process trees and guarded PID custody state"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 31,
              "column": 3
            },
            "end": {
              "line": 35,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildProcess",
          "properties": {
            "type": "machine",
            "machineType": "build_process",
            "pid": 0,
            "parentPid": 0,
            "processName": "process",
            "buildKind": "build_child",
            "ageMinutes": 0,
            "memoryMb": 0,
            "commandHash": "",
            "rawCommandHidden": true,
            "custodyState": "active_build",
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "stopPolicy": "break_glass_required",
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 37,
              "column": 3
            },
            "end": {
              "line": 57,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildTree",
          "properties": {
            "type": "machine",
            "machineType": "build_tree",
            "treeId": "",
            "rootPid": 0,
            "status": "active",
            "processCount": 0,
            "maxAgeMinutes": 0,
            "totalMemoryMb": 0,
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "ownedProcessCount": 0,
            "processPids": [],
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 59,
              "column": 3
            },
            "end": {
              "line": 77,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_build_custody",
          "id": "consume_build_custody",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
          "loc": {
            "start": {
              "line": 157,
              "column": 3
            },
            "end": {
              "line": 185,
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
              "title": "Build Custody",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-build-custody.mjs",
              "defaultMode": "read_only_hardware_custody"
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
                "line": 14,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "riskState": "unknown",
              "scannerStatus": "unknown",
              "processCount": 0,
              "buildProcessCount": 0,
              "activeBuildTreeCount": 0,
              "ownedBuildProcessCount": 0,
              "ownedBuildTreeCount": 0,
              "ownerUnknownBuildTreeCount": 0,
              "longRunningBuildCount": 0,
              "highMemoryBuildCount": 0,
              "reviewRequiredCount": 0,
              "lastBuildCustodyReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 16,
                "column": 3
              },
              "end": {
                "line": 29,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:build:custody",
            "id": "holoshell:build:custody",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Local build process trees and guarded PID custody state"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 31,
                "column": 3
              },
              "end": {
                "line": 35,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildProcess",
            "properties": {
              "type": "machine",
              "machineType": "build_process",
              "pid": 0,
              "parentPid": 0,
              "processName": "process",
              "buildKind": "build_child",
              "ageMinutes": 0,
              "memoryMb": 0,
              "commandHash": "",
              "rawCommandHidden": true,
              "custodyState": "active_build",
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "stopPolicy": "break_glass_required",
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 37,
                "column": 3
              },
              "end": {
                "line": 57,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildTree",
            "properties": {
              "type": "machine",
              "machineType": "build_tree",
              "treeId": "",
              "rootPid": 0,
              "status": "active",
              "processCount": 0,
              "maxAgeMinutes": 0,
              "totalMemoryMb": 0,
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "ownedProcessCount": 0,
              "processPids": [],
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 59,
                "column": 3
              },
              "end": {
                "line": 77,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_build_custody",
            "id": "consume_build_custody",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
            "loc": {
              "start": {
                "line": 157,
                "column": 3
              },
              "end": {
                "line": 185,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "BuildCustodyRoom",
          "policy": "BuildOwnershipInferenceIsEvidence"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 186,
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
      "line": 186,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Build Custody",
      "id": "HoloShell Build Custody",
      "properties": {
        "room": "BuildCustodyRoom",
        "policy": "BuildOwnershipInferenceIsEvidence"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Build Custody",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-build-custody.mjs",
            "defaultMode": "read_only_hardware_custody"
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
              "line": 14,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "riskState": "unknown",
            "scannerStatus": "unknown",
            "processCount": 0,
            "buildProcessCount": 0,
            "activeBuildTreeCount": 0,
            "ownedBuildProcessCount": 0,
            "ownedBuildTreeCount": 0,
            "ownerUnknownBuildTreeCount": 0,
            "longRunningBuildCount": 0,
            "highMemoryBuildCount": 0,
            "reviewRequiredCount": 0,
            "lastBuildCustodyReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 16,
              "column": 3
            },
            "end": {
              "line": 29,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:build:custody",
          "id": "holoshell:build:custody",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Local build process trees and guarded PID custody state"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 31,
              "column": 3
            },
            "end": {
              "line": 35,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildProcess",
          "properties": {
            "type": "machine",
            "machineType": "build_process",
            "pid": 0,
            "parentPid": 0,
            "processName": "process",
            "buildKind": "build_child",
            "ageMinutes": 0,
            "memoryMb": 0,
            "commandHash": "",
            "rawCommandHidden": true,
            "custodyState": "active_build",
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "stopPolicy": "break_glass_required",
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 37,
              "column": 3
            },
            "end": {
              "line": 57,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildTree",
          "properties": {
            "type": "machine",
            "machineType": "build_tree",
            "treeId": "",
            "rootPid": 0,
            "status": "active",
            "processCount": 0,
            "maxAgeMinutes": 0,
            "totalMemoryMb": 0,
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "ownedProcessCount": 0,
            "processPids": [],
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 59,
              "column": 3
            },
            "end": {
              "line": 77,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_build_custody",
          "id": "consume_build_custody",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
          "loc": {
            "start": {
              "line": 157,
              "column": 3
            },
            "end": {
              "line": 185,
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
              "title": "Build Custody",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-build-custody.mjs",
              "defaultMode": "read_only_hardware_custody"
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
                "line": 14,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "riskState": "unknown",
              "scannerStatus": "unknown",
              "processCount": 0,
              "buildProcessCount": 0,
              "activeBuildTreeCount": 0,
              "ownedBuildProcessCount": 0,
              "ownedBuildTreeCount": 0,
              "ownerUnknownBuildTreeCount": 0,
              "longRunningBuildCount": 0,
              "highMemoryBuildCount": 0,
              "reviewRequiredCount": 0,
              "lastBuildCustodyReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 16,
                "column": 3
              },
              "end": {
                "line": 29,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:build:custody",
            "id": "holoshell:build:custody",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Local build process trees and guarded PID custody state"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 31,
                "column": 3
              },
              "end": {
                "line": 35,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildProcess",
            "properties": {
              "type": "machine",
              "machineType": "build_process",
              "pid": 0,
              "parentPid": 0,
              "processName": "process",
              "buildKind": "build_child",
              "ageMinutes": 0,
              "memoryMb": 0,
              "commandHash": "",
              "rawCommandHidden": true,
              "custodyState": "active_build",
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "stopPolicy": "break_glass_required",
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 37,
                "column": 3
              },
              "end": {
                "line": 57,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "BuildTree",
            "properties": {
              "type": "machine",
              "machineType": "build_tree",
              "treeId": "",
              "rootPid": 0,
              "status": "active",
              "processCount": 0,
              "maxAgeMinutes": 0,
              "totalMemoryMb": 0,
              "ownerLaneId": "",
              "ownerLaneLabel": "",
              "ownerColorHint": "white",
              "ownerEvidence": "",
              "ownerParentPid": 0,
              "ownerTrustState": "unknown",
              "ownedProcessCount": 0,
              "processPids": [],
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 59,
                "column": 3
              },
              "end": {
                "line": 77,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_build_custody",
            "id": "consume_build_custody",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
            "loc": {
              "start": {
                "line": 157,
                "column": 3
              },
              "end": {
                "line": 185,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "BuildCustodyRoom",
          "policy": "BuildOwnershipInferenceIsEvidence"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 186,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Build Custody",
    "id": "HoloShell Build Custody",
    "properties": {
      "room": "BuildCustodyRoom",
      "policy": "BuildOwnershipInferenceIsEvidence"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Build Custody",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-build-custody.mjs",
          "defaultMode": "read_only_hardware_custody"
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
            "line": 14,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "riskState": "unknown",
          "scannerStatus": "unknown",
          "processCount": 0,
          "buildProcessCount": 0,
          "activeBuildTreeCount": 0,
          "ownedBuildProcessCount": 0,
          "ownedBuildTreeCount": 0,
          "ownerUnknownBuildTreeCount": 0,
          "longRunningBuildCount": 0,
          "highMemoryBuildCount": 0,
          "reviewRequiredCount": 0,
          "lastBuildCustodyReceiptId": ""
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 16,
            "column": 3
          },
          "end": {
            "line": 29,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:build:custody",
        "id": "holoshell:build:custody",
        "properties": {
          "type": "pub_sub",
          "priority": "critical",
          "description": "Local build process trees and guarded PID custody state"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 31,
            "column": 3
          },
          "end": {
            "line": 35,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "BuildProcess",
        "properties": {
          "type": "machine",
          "machineType": "build_process",
          "pid": 0,
          "parentPid": 0,
          "processName": "process",
          "buildKind": "build_child",
          "ageMinutes": 0,
          "memoryMb": 0,
          "commandHash": "",
          "rawCommandHidden": true,
          "custodyState": "active_build",
          "ownerLaneId": "",
          "ownerLaneLabel": "",
          "ownerColorHint": "white",
          "ownerEvidence": "",
          "ownerParentPid": 0,
          "ownerTrustState": "unknown",
          "stopPolicy": "break_glass_required",
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 37,
            "column": 3
          },
          "end": {
            "line": 57,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "BuildTree",
        "properties": {
          "type": "machine",
          "machineType": "build_tree",
          "treeId": "",
          "rootPid": 0,
          "status": "active",
          "processCount": 0,
          "maxAgeMinutes": 0,
          "totalMemoryMb": 0,
          "ownerLaneId": "",
          "ownerLaneLabel": "",
          "ownerColorHint": "white",
          "ownerEvidence": "",
          "ownerParentPid": 0,
          "ownerTrustState": "unknown",
          "ownedProcessCount": 0,
          "processPids": [],
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 59,
            "column": 3
          },
          "end": {
            "line": 77,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_build_custody",
        "id": "consume_build_custody",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
        "loc": {
          "start": {
            "line": 157,
            "column": 3
          },
          "end": {
            "line": 185,
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
            "title": "Build Custody",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-build-custody.mjs",
            "defaultMode": "read_only_hardware_custody"
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
              "line": 14,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "riskState": "unknown",
            "scannerStatus": "unknown",
            "processCount": 0,
            "buildProcessCount": 0,
            "activeBuildTreeCount": 0,
            "ownedBuildProcessCount": 0,
            "ownedBuildTreeCount": 0,
            "ownerUnknownBuildTreeCount": 0,
            "longRunningBuildCount": 0,
            "highMemoryBuildCount": 0,
            "reviewRequiredCount": 0,
            "lastBuildCustodyReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 16,
              "column": 3
            },
            "end": {
              "line": 29,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:build:custody",
          "id": "holoshell:build:custody",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Local build process trees and guarded PID custody state"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 31,
              "column": 3
            },
            "end": {
              "line": 35,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildProcess",
          "properties": {
            "type": "machine",
            "machineType": "build_process",
            "pid": 0,
            "parentPid": 0,
            "processName": "process",
            "buildKind": "build_child",
            "ageMinutes": 0,
            "memoryMb": 0,
            "commandHash": "",
            "rawCommandHidden": true,
            "custodyState": "active_build",
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "stopPolicy": "break_glass_required",
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 37,
              "column": 3
            },
            "end": {
              "line": 57,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "BuildTree",
          "properties": {
            "type": "machine",
            "machineType": "build_tree",
            "treeId": "",
            "rootPid": 0,
            "status": "active",
            "processCount": 0,
            "maxAgeMinutes": 0,
            "totalMemoryMb": 0,
            "ownerLaneId": "",
            "ownerLaneLabel": "",
            "ownerColorHint": "white",
            "ownerEvidence": "",
            "ownerParentPid": 0,
            "ownerTrustState": "unknown",
            "ownedProcessCount": 0,
            "processPids": [],
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 59,
              "column": 3
            },
            "end": {
              "line": 77,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_build_custody",
          "id": "consume_build_custody",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.riskState = custody.summary.riskState\n    state.scannerStatus = custody.summary.scannerStatus || \"available\"\n    state.processCount = custody.summary.processCount\n    state.buildProcessCount = custody.summary.buildProcessCount\n    state.activeBuildTreeCount = custody.summary.activeBuildTreeCount\n    state.ownedBuildProcessCount = custody.summary.ownedBuildProcessCount || 0\n    state.ownedBuildTreeCount = custody.summary.ownedBuildTreeCount || 0\n    state.ownerUnknownBuildTreeCount = custody.summary.ownerUnknownBuildTreeCount || 0\n    state.longRunningBuildCount = custody.summary.longRunningBuildCount\n    state.highMemoryBuildCount = custody.summary.highMemoryBuildCount\n    state.reviewRequiredCount = custody.summary.reviewRequiredCount\n    state.lastBuildCustodyReceiptId = custody.receipt.buildCustodyHash\n\n    emit(\"holoshell:build:custody\", {\n      riskState: state.riskState,\n      scannerStatus: state.scannerStatus,\n      processCount: state.processCount,\n      buildProcesses: state.buildProcessCount,\n      activeBuildTrees: state.activeBuildTreeCount,\n      ownedBuildProcesses: state.ownedBuildProcessCount,\n      ownedBuildTrees: state.ownedBuildTreeCount,\n      ownerUnknownBuildTrees: state.ownerUnknownBuildTreeCount,\n      longRunningBuilds: state.longRunningBuildCount,\n      highMemoryBuilds: state.highMemoryBuildCount,\n      reviewRequired: state.reviewRequiredCount,\n      receipt: state.lastBuildCustodyReceiptId\n    })",
          "loc": {
            "start": {
              "line": 157,
              "column": 3
            },
            "end": {
              "line": 185,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "room": "BuildCustodyRoom",
        "policy": "BuildOwnershipInferenceIsEvidence"
      }
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 186,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}