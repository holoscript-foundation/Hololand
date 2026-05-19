{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Readiness Evidence",
      "id": "HoloShell Readiness Evidence",
      "properties": {
        "room": "ReadinessEvidenceRoom",
        "policy": "LiveFeedIsDownstreamProjection"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Readiness Evidence",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
            "defaultMode": "live_hardware_evidence_ingest"
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
            "status": "unknown",
            "tokenCount": 0,
            "warningCount": 0,
            "reportGraphStatus": "unknown",
            "liveCoreImportStatus": "unknown",
            "effectiveGraphStatus": "unknown",
            "buildStatus": "unknown",
            "hardwareRealityStatus": "unknown",
            "processHealthStatus": "unknown",
            "liveFeedConsumerStatus": "unknown",
            "lastReadinessReceiptId": ""
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
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:readiness:evidence",
          "id": "holoshell:readiness:evidence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
          "name": "ReadinessToken",
          "properties": {
            "type": "machine",
            "machineType": "readiness_token",
            "tokenId": "",
            "kind": "evidence",
            "status": "unknown",
            "trustState": "unknown",
            "receiptType": "",
            "nextAction": "",
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
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_readiness_evidence",
          "id": "consume_readiness_evidence",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
          "loc": {
            "start": {
              "line": 106,
              "column": 3
            },
            "end": {
              "line": 132,
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
              "title": "Readiness Evidence",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
              "defaultMode": "live_hardware_evidence_ingest"
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
              "status": "unknown",
              "tokenCount": 0,
              "warningCount": 0,
              "reportGraphStatus": "unknown",
              "liveCoreImportStatus": "unknown",
              "effectiveGraphStatus": "unknown",
              "buildStatus": "unknown",
              "hardwareRealityStatus": "unknown",
              "processHealthStatus": "unknown",
              "liveFeedConsumerStatus": "unknown",
              "lastReadinessReceiptId": ""
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
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:readiness:evidence",
            "id": "holoshell:readiness:evidence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
            "name": "ReadinessToken",
            "properties": {
              "type": "machine",
              "machineType": "readiness_token",
              "tokenId": "",
              "kind": "evidence",
              "status": "unknown",
              "trustState": "unknown",
              "receiptType": "",
              "nextAction": "",
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
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_readiness_evidence",
            "id": "consume_readiness_evidence",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
            "loc": {
              "start": {
                "line": 106,
                "column": 3
              },
              "end": {
                "line": 132,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "ReadinessEvidenceRoom",
          "policy": "LiveFeedIsDownstreamProjection"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 133,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Readiness Evidence",
      "id": "HoloShell Readiness Evidence",
      "properties": {
        "room": "ReadinessEvidenceRoom",
        "policy": "LiveFeedIsDownstreamProjection"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Readiness Evidence",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
            "defaultMode": "live_hardware_evidence_ingest"
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
            "status": "unknown",
            "tokenCount": 0,
            "warningCount": 0,
            "reportGraphStatus": "unknown",
            "liveCoreImportStatus": "unknown",
            "effectiveGraphStatus": "unknown",
            "buildStatus": "unknown",
            "hardwareRealityStatus": "unknown",
            "processHealthStatus": "unknown",
            "liveFeedConsumerStatus": "unknown",
            "lastReadinessReceiptId": ""
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
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:readiness:evidence",
          "id": "holoshell:readiness:evidence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
          "name": "ReadinessToken",
          "properties": {
            "type": "machine",
            "machineType": "readiness_token",
            "tokenId": "",
            "kind": "evidence",
            "status": "unknown",
            "trustState": "unknown",
            "receiptType": "",
            "nextAction": "",
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
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_readiness_evidence",
          "id": "consume_readiness_evidence",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
          "loc": {
            "start": {
              "line": 106,
              "column": 3
            },
            "end": {
              "line": 132,
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
              "title": "Readiness Evidence",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
              "defaultMode": "live_hardware_evidence_ingest"
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
              "status": "unknown",
              "tokenCount": 0,
              "warningCount": 0,
              "reportGraphStatus": "unknown",
              "liveCoreImportStatus": "unknown",
              "effectiveGraphStatus": "unknown",
              "buildStatus": "unknown",
              "hardwareRealityStatus": "unknown",
              "processHealthStatus": "unknown",
              "liveFeedConsumerStatus": "unknown",
              "lastReadinessReceiptId": ""
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
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:readiness:evidence",
            "id": "holoshell:readiness:evidence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
            "name": "ReadinessToken",
            "properties": {
              "type": "machine",
              "machineType": "readiness_token",
              "tokenId": "",
              "kind": "evidence",
              "status": "unknown",
              "trustState": "unknown",
              "receiptType": "",
              "nextAction": "",
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
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_readiness_evidence",
            "id": "consume_readiness_evidence",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
            "loc": {
              "start": {
                "line": 106,
                "column": 3
              },
              "end": {
                "line": 132,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "ReadinessEvidenceRoom",
          "policy": "LiveFeedIsDownstreamProjection"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 133,
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
      "line": 133,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Readiness Evidence",
      "id": "HoloShell Readiness Evidence",
      "properties": {
        "room": "ReadinessEvidenceRoom",
        "policy": "LiveFeedIsDownstreamProjection"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Readiness Evidence",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
            "defaultMode": "live_hardware_evidence_ingest"
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
            "status": "unknown",
            "tokenCount": 0,
            "warningCount": 0,
            "reportGraphStatus": "unknown",
            "liveCoreImportStatus": "unknown",
            "effectiveGraphStatus": "unknown",
            "buildStatus": "unknown",
            "hardwareRealityStatus": "unknown",
            "processHealthStatus": "unknown",
            "liveFeedConsumerStatus": "unknown",
            "lastReadinessReceiptId": ""
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
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:readiness:evidence",
          "id": "holoshell:readiness:evidence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
          "name": "ReadinessToken",
          "properties": {
            "type": "machine",
            "machineType": "readiness_token",
            "tokenId": "",
            "kind": "evidence",
            "status": "unknown",
            "trustState": "unknown",
            "receiptType": "",
            "nextAction": "",
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
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_readiness_evidence",
          "id": "consume_readiness_evidence",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
          "loc": {
            "start": {
              "line": 106,
              "column": 3
            },
            "end": {
              "line": 132,
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
              "title": "Readiness Evidence",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
              "defaultMode": "live_hardware_evidence_ingest"
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
              "status": "unknown",
              "tokenCount": 0,
              "warningCount": 0,
              "reportGraphStatus": "unknown",
              "liveCoreImportStatus": "unknown",
              "effectiveGraphStatus": "unknown",
              "buildStatus": "unknown",
              "hardwareRealityStatus": "unknown",
              "processHealthStatus": "unknown",
              "liveFeedConsumerStatus": "unknown",
              "lastReadinessReceiptId": ""
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
                "line": 28,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:readiness:evidence",
            "id": "holoshell:readiness:evidence",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
            "name": "ReadinessToken",
            "properties": {
              "type": "machine",
              "machineType": "readiness_token",
              "tokenId": "",
              "kind": "evidence",
              "status": "unknown",
              "trustState": "unknown",
              "receiptType": "",
              "nextAction": "",
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
                "line": 46,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_readiness_evidence",
            "id": "consume_readiness_evidence",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
            "loc": {
              "start": {
                "line": 106,
                "column": 3
              },
              "end": {
                "line": 132,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "room": "ReadinessEvidenceRoom",
          "policy": "LiveFeedIsDownstreamProjection"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 133,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Readiness Evidence",
    "id": "HoloShell Readiness Evidence",
    "properties": {
      "room": "ReadinessEvidenceRoom",
      "policy": "LiveFeedIsDownstreamProjection"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Readiness Evidence",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
          "defaultMode": "live_hardware_evidence_ingest"
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
          "status": "unknown",
          "tokenCount": 0,
          "warningCount": 0,
          "reportGraphStatus": "unknown",
          "liveCoreImportStatus": "unknown",
          "effectiveGraphStatus": "unknown",
          "buildStatus": "unknown",
          "hardwareRealityStatus": "unknown",
          "processHealthStatus": "unknown",
          "liveFeedConsumerStatus": "unknown",
          "lastReadinessReceiptId": ""
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
            "line": 28,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:readiness:evidence",
        "id": "holoshell:readiness:evidence",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
        "name": "ReadinessToken",
        "properties": {
          "type": "machine",
          "machineType": "readiness_token",
          "tokenId": "",
          "kind": "evidence",
          "status": "unknown",
          "trustState": "unknown",
          "receiptType": "",
          "nextAction": "",
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
            "line": 46,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_readiness_evidence",
        "id": "consume_readiness_evidence",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
        "loc": {
          "start": {
            "line": 106,
            "column": 3
          },
          "end": {
            "line": 132,
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
            "title": "Readiness Evidence",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-readiness-evidence.mjs",
            "defaultMode": "live_hardware_evidence_ingest"
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
            "status": "unknown",
            "tokenCount": 0,
            "warningCount": 0,
            "reportGraphStatus": "unknown",
            "liveCoreImportStatus": "unknown",
            "effectiveGraphStatus": "unknown",
            "buildStatus": "unknown",
            "hardwareRealityStatus": "unknown",
            "processHealthStatus": "unknown",
            "liveFeedConsumerStatus": "unknown",
            "lastReadinessReceiptId": ""
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
              "line": 28,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:readiness:evidence",
          "id": "holoshell:readiness:evidence",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "HoloShell readiness tokens grounded by historical evidence and live local probes"
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
          "name": "ReadinessToken",
          "properties": {
            "type": "machine",
            "machineType": "readiness_token",
            "tokenId": "",
            "kind": "evidence",
            "status": "unknown",
            "trustState": "unknown",
            "receiptType": "",
            "nextAction": "",
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
              "line": 46,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_readiness_evidence",
          "id": "consume_readiness_evidence",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = feed.summary.status\n    state.tokenCount = feed.summary.tokenCount\n    state.warningCount = feed.summary.warningCount\n    state.reportGraphStatus = feed.summary.reportGraphStatus\n    state.liveCoreImportStatus = feed.summary.liveCoreImportStatus\n    state.effectiveGraphStatus = feed.summary.graphStatus\n    state.buildStatus = feed.summary.buildStatus\n    state.hardwareRealityStatus = feed.summary.hardwareRealityStatus\n    state.processHealthStatus = feed.summary.processHealthStatus\n    state.liveFeedConsumerStatus = feed.summary.liveFeedStatus\n    state.lastReadinessReceiptId = feed.readinessId\n\n    emit(\"holoshell:readiness:evidence\", {\n      status: state.status,\n      tokens: state.tokenCount,\n      warnings: state.warningCount,\n      reportGraphStatus: state.reportGraphStatus,\n      liveCoreImport: state.liveCoreImportStatus,\n      effectiveGraphStatus: state.effectiveGraphStatus,\n      buildStatus: state.buildStatus,\n      hardwareReality: state.hardwareRealityStatus,\n      processHealth: state.processHealthStatus,\n      liveFeedConsumer: state.liveFeedConsumerStatus,\n      receipt: state.lastReadinessReceiptId\n    })",
          "loc": {
            "start": {
              "line": 106,
              "column": 3
            },
            "end": {
              "line": 132,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "room": "ReadinessEvidenceRoom",
        "policy": "LiveFeedIsDownstreamProjection"
      }
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 133,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}