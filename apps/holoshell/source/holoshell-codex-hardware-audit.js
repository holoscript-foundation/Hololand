{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Codex Hardware Audit",
      "id": "HoloShell Codex Hardware Audit",
      "properties": {
        "policy": "HardwareProbesAreReadOnly"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Codex Hardware Audit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
            "defaultMode": "read_only_hardware_probe"
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
              "line": 15,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "overallStatus": "unknown",
            "lastAuditReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 17,
              "column": 3
            },
            "end": {
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:audit",
          "id": "holoshell:hardware:audit",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 30,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "CodexHardwareAuditReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "codex_hardware_audit",
            "source": "local_hardware_probe",
            "auditId": "",
            "checks": [],
            "overallStatus": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 53,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_audit",
          "id": "consume_audit",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
          "loc": {
            "start": {
              "line": 79,
              "column": 3
            },
            "end": {
              "line": 103,
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
              "title": "Codex Hardware Audit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
              "defaultMode": "read_only_hardware_probe"
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
                "line": 15,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "overallStatus": "unknown",
              "lastAuditReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 17,
                "column": 3
              },
              "end": {
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:audit",
            "id": "holoshell:hardware:audit",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 30,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "CodexHardwareAuditReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "codex_hardware_audit",
              "source": "local_hardware_probe",
              "auditId": "",
              "checks": [],
              "overallStatus": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 53,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_audit",
            "id": "consume_audit",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
            "loc": {
              "start": {
                "line": 79,
                "column": 3
              },
              "end": {
                "line": 103,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "HardwareProbesAreReadOnly"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 104,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Codex Hardware Audit",
      "id": "HoloShell Codex Hardware Audit",
      "properties": {
        "policy": "HardwareProbesAreReadOnly"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Codex Hardware Audit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
            "defaultMode": "read_only_hardware_probe"
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
              "line": 15,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "overallStatus": "unknown",
            "lastAuditReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 17,
              "column": 3
            },
            "end": {
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:audit",
          "id": "holoshell:hardware:audit",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 30,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "CodexHardwareAuditReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "codex_hardware_audit",
            "source": "local_hardware_probe",
            "auditId": "",
            "checks": [],
            "overallStatus": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 53,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_audit",
          "id": "consume_audit",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
          "loc": {
            "start": {
              "line": 79,
              "column": 3
            },
            "end": {
              "line": 103,
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
              "title": "Codex Hardware Audit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
              "defaultMode": "read_only_hardware_probe"
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
                "line": 15,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "overallStatus": "unknown",
              "lastAuditReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 17,
                "column": 3
              },
              "end": {
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:audit",
            "id": "holoshell:hardware:audit",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 30,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "CodexHardwareAuditReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "codex_hardware_audit",
              "source": "local_hardware_probe",
              "auditId": "",
              "checks": [],
              "overallStatus": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 53,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_audit",
            "id": "consume_audit",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
            "loc": {
              "start": {
                "line": 79,
                "column": 3
              },
              "end": {
                "line": 103,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "HardwareProbesAreReadOnly"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 104,
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
      "line": 104,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Codex Hardware Audit",
      "id": "HoloShell Codex Hardware Audit",
      "properties": {
        "policy": "HardwareProbesAreReadOnly"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Codex Hardware Audit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
            "defaultMode": "read_only_hardware_probe"
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
              "line": 15,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "overallStatus": "unknown",
            "lastAuditReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 17,
              "column": 3
            },
            "end": {
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:audit",
          "id": "holoshell:hardware:audit",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 30,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "CodexHardwareAuditReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "codex_hardware_audit",
            "source": "local_hardware_probe",
            "auditId": "",
            "checks": [],
            "overallStatus": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 53,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_audit",
          "id": "consume_audit",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
          "loc": {
            "start": {
              "line": 79,
              "column": 3
            },
            "end": {
              "line": 103,
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
              "title": "Codex Hardware Audit",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
              "defaultMode": "read_only_hardware_probe"
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
                "line": 15,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "overallStatus": "unknown",
              "lastAuditReceiptId": ""
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 17,
                "column": 3
              },
              "end": {
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:hardware:audit",
            "id": "holoshell:hardware:audit",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 30,
                "column": 3
              },
              "end": {
                "line": 34,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "CodexHardwareAuditReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "codex_hardware_audit",
              "source": "local_hardware_probe",
              "auditId": "",
              "checks": [],
              "overallStatus": "unknown",
              "nodeVersion": "",
              "pnpmVersion": "",
              "wasmSimdAvailable": false,
              "gpuName": "",
              "webgpuAvailable": false,
              "browserAvailable": false,
              "memoryTotalBytes": 0,
              "destructiveActionsTaken": false,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 36,
                "column": 3
              },
              "end": {
                "line": 53,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_audit",
            "id": "consume_audit",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
            "loc": {
              "start": {
                "line": 79,
                "column": 3
              },
              "end": {
                "line": 103,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "HardwareProbesAreReadOnly"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 104,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Codex Hardware Audit",
    "id": "HoloShell Codex Hardware Audit",
    "properties": {
      "policy": "HardwareProbesAreReadOnly"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Codex Hardware Audit",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
          "defaultMode": "read_only_hardware_probe"
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
            "line": 15,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "status": "unknown",
          "nodeVersion": "",
          "pnpmVersion": "",
          "wasmSimdAvailable": false,
          "gpuName": "",
          "webgpuAvailable": false,
          "browserAvailable": false,
          "memoryTotalBytes": 0,
          "overallStatus": "unknown",
          "lastAuditReceiptId": ""
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 17,
            "column": 3
          },
          "end": {
            "line": 28,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:hardware:audit",
        "id": "holoshell:hardware:audit",
        "properties": {
          "type": "pub_sub",
          "priority": "critical",
          "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 30,
            "column": 3
          },
          "end": {
            "line": 34,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "CodexHardwareAuditReceipt",
        "properties": {
          "type": "receipt",
          "receiptType": "codex_hardware_audit",
          "source": "local_hardware_probe",
          "auditId": "",
          "checks": [],
          "overallStatus": "unknown",
          "nodeVersion": "",
          "pnpmVersion": "",
          "wasmSimdAvailable": false,
          "gpuName": "",
          "webgpuAvailable": false,
          "browserAvailable": false,
          "memoryTotalBytes": 0,
          "destructiveActionsTaken": false,
          "rawCommandsIncluded": false,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 36,
            "column": 3
          },
          "end": {
            "line": 53,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_audit",
        "id": "consume_audit",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
        "loc": {
          "start": {
            "line": 79,
            "column": 3
          },
          "end": {
            "line": 103,
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
            "title": "Codex Hardware Audit",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-codex-hardware-audit.mjs",
            "defaultMode": "read_only_hardware_probe"
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
              "line": 15,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "overallStatus": "unknown",
            "lastAuditReceiptId": ""
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 17,
              "column": 3
            },
            "end": {
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:hardware:audit",
          "id": "holoshell:hardware:audit",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Codex hardware audit receipts for the world-build cockpit HardwareGate"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 30,
              "column": 3
            },
            "end": {
              "line": 34,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "CodexHardwareAuditReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "codex_hardware_audit",
            "source": "local_hardware_probe",
            "auditId": "",
            "checks": [],
            "overallStatus": "unknown",
            "nodeVersion": "",
            "pnpmVersion": "",
            "wasmSimdAvailable": false,
            "gpuName": "",
            "webgpuAvailable": false,
            "browserAvailable": false,
            "memoryTotalBytes": 0,
            "destructiveActionsTaken": false,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 36,
              "column": 3
            },
            "end": {
              "line": 53,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_audit",
          "id": "consume_audit",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = audit.summary.status\n    state.nodeVersion = audit.summary.nodeVersion\n    state.pnpmVersion = audit.summary.pnpmVersion\n    state.wasmSimdAvailable = audit.summary.wasmSimdAvailable\n    state.gpuName = audit.summary.gpuName\n    state.webgpuAvailable = audit.summary.webgpuAvailable\n    state.browserAvailable = audit.summary.browserAvailable\n    state.memoryTotalBytes = audit.summary.memoryTotalBytes\n    state.overallStatus = audit.summary.overallStatus\n    state.lastAuditReceiptId = audit.receipt.auditId\n\n    emit(\"holoshell:hardware:audit\", {\n      status: state.status,\n      nodeVersion: state.nodeVersion,\n      pnpmVersion: state.pnpmVersion,\n      wasmSimdAvailable: state.wasmSimdAvailable,\n      gpuName: state.gpuName,\n      webgpuAvailable: state.webgpuAvailable,\n      browserAvailable: state.browserAvailable,\n      memoryTotalBytes: state.memoryTotalBytes,\n      overallStatus: state.overallStatus,\n      receipt: state.lastAuditReceiptId\n    })",
          "loc": {
            "start": {
              "line": 79,
              "column": 3
            },
            "end": {
              "line": 103,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "policy": "HardwareProbesAreReadOnly"
      }
    },
    "loc": {
      "start": {
        "line": 8,
        "column": 1
      },
      "end": {
        "line": 104,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}