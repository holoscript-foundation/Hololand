{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Local File Manifest",
      "id": "HoloShell Local File Manifest",
      "properties": {
        "policy": "NoHiddenImports"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Local File Manifest",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
            "defaultMode": "read_only_manifest"
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
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePathCount": 0,
            "unreadableCount": 0,
            "duplicateAssetCount": 0,
            "lastManifestReceiptId": ""
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
              "line": 26,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:local:manifest",
          "id": "holoshell:local:manifest",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Local file manifest receipts for the world-build cockpit"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 28,
              "column": 3
            },
            "end": {
              "line": 32,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LocalFileManifestReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "local_file_manifest",
            "source": "local_filesystem_scan",
            "manifestId": "",
            "rootPaths": [],
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePaths": [],
            "unreadablePaths": [],
            "duplicateAssets": [],
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
              "line": 34,
              "column": 3
            },
            "end": {
              "line": 49,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_manifest",
          "id": "consume_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
          "loc": {
            "start": {
              "line": 76,
              "column": 3
            },
            "end": {
              "line": 96,
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
              "title": "Local File Manifest",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
              "defaultMode": "read_only_manifest"
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
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePathCount": 0,
              "unreadableCount": 0,
              "duplicateAssetCount": 0,
              "lastManifestReceiptId": ""
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
                "line": 26,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:local:manifest",
            "id": "holoshell:local:manifest",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Local file manifest receipts for the world-build cockpit"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 28,
                "column": 3
              },
              "end": {
                "line": 32,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LocalFileManifestReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "local_file_manifest",
              "source": "local_filesystem_scan",
              "manifestId": "",
              "rootPaths": [],
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePaths": [],
              "unreadablePaths": [],
              "duplicateAssets": [],
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
                "line": 34,
                "column": 3
              },
              "end": {
                "line": 49,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_manifest",
            "id": "consume_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
            "loc": {
              "start": {
                "line": 76,
                "column": 3
              },
              "end": {
                "line": 96,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "NoHiddenImports"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 97,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Local File Manifest",
      "id": "HoloShell Local File Manifest",
      "properties": {
        "policy": "NoHiddenImports"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Local File Manifest",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
            "defaultMode": "read_only_manifest"
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
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePathCount": 0,
            "unreadableCount": 0,
            "duplicateAssetCount": 0,
            "lastManifestReceiptId": ""
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
              "line": 26,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:local:manifest",
          "id": "holoshell:local:manifest",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Local file manifest receipts for the world-build cockpit"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 28,
              "column": 3
            },
            "end": {
              "line": 32,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LocalFileManifestReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "local_file_manifest",
            "source": "local_filesystem_scan",
            "manifestId": "",
            "rootPaths": [],
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePaths": [],
            "unreadablePaths": [],
            "duplicateAssets": [],
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
              "line": 34,
              "column": 3
            },
            "end": {
              "line": 49,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_manifest",
          "id": "consume_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
          "loc": {
            "start": {
              "line": 76,
              "column": 3
            },
            "end": {
              "line": 96,
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
              "title": "Local File Manifest",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
              "defaultMode": "read_only_manifest"
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
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePathCount": 0,
              "unreadableCount": 0,
              "duplicateAssetCount": 0,
              "lastManifestReceiptId": ""
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
                "line": 26,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:local:manifest",
            "id": "holoshell:local:manifest",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Local file manifest receipts for the world-build cockpit"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 28,
                "column": 3
              },
              "end": {
                "line": 32,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LocalFileManifestReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "local_file_manifest",
              "source": "local_filesystem_scan",
              "manifestId": "",
              "rootPaths": [],
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePaths": [],
              "unreadablePaths": [],
              "duplicateAssets": [],
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
                "line": 34,
                "column": 3
              },
              "end": {
                "line": 49,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_manifest",
            "id": "consume_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
            "loc": {
              "start": {
                "line": 76,
                "column": 3
              },
              "end": {
                "line": 96,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "NoHiddenImports"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 97,
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
      "line": 97,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Local File Manifest",
      "id": "HoloShell Local File Manifest",
      "properties": {
        "policy": "NoHiddenImports"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "Local File Manifest",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
            "defaultMode": "read_only_manifest"
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
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePathCount": 0,
            "unreadableCount": 0,
            "duplicateAssetCount": 0,
            "lastManifestReceiptId": ""
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
              "line": 26,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:local:manifest",
          "id": "holoshell:local:manifest",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Local file manifest receipts for the world-build cockpit"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 28,
              "column": 3
            },
            "end": {
              "line": 32,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LocalFileManifestReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "local_file_manifest",
            "source": "local_filesystem_scan",
            "manifestId": "",
            "rootPaths": [],
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePaths": [],
            "unreadablePaths": [],
            "duplicateAssets": [],
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
              "line": 34,
              "column": 3
            },
            "end": {
              "line": 49,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_manifest",
          "id": "consume_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
          "loc": {
            "start": {
              "line": 76,
              "column": 3
            },
            "end": {
              "line": 96,
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
              "title": "Local File Manifest",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
              "defaultMode": "read_only_manifest"
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
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePathCount": 0,
              "unreadableCount": 0,
              "duplicateAssetCount": 0,
              "lastManifestReceiptId": ""
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
                "line": 26,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:local:manifest",
            "id": "holoshell:local:manifest",
            "properties": {
              "type": "pub_sub",
              "priority": "high",
              "description": "Local file manifest receipts for the world-build cockpit"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 28,
                "column": 3
              },
              "end": {
                "line": 32,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "LocalFileManifestReceipt",
            "properties": {
              "type": "receipt",
              "receiptType": "local_file_manifest",
              "source": "local_filesystem_scan",
              "manifestId": "",
              "rootPaths": [],
              "fileCount": 0,
              "directoryCount": 0,
              "totalSizeBytes": 0,
              "sensitivePaths": [],
              "unreadablePaths": [],
              "duplicateAssets": [],
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
                "line": 34,
                "column": 3
              },
              "end": {
                "line": 49,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_manifest",
            "id": "consume_manifest",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
            "loc": {
              "start": {
                "line": 76,
                "column": 3
              },
              "end": {
                "line": 96,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "NoHiddenImports"
        }
      },
      "loc": {
        "start": {
          "line": 8,
          "column": 1
        },
        "end": {
          "line": 97,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Local File Manifest",
    "id": "HoloShell Local File Manifest",
    "properties": {
      "policy": "NoHiddenImports"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "Local File Manifest",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
          "defaultMode": "read_only_manifest"
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
          "fileCount": 0,
          "directoryCount": 0,
          "totalSizeBytes": 0,
          "sensitivePathCount": 0,
          "unreadableCount": 0,
          "duplicateAssetCount": 0,
          "lastManifestReceiptId": ""
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
            "line": 26,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:local:manifest",
        "id": "holoshell:local:manifest",
        "properties": {
          "type": "pub_sub",
          "priority": "high",
          "description": "Local file manifest receipts for the world-build cockpit"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 28,
            "column": 3
          },
          "end": {
            "line": 32,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "LocalFileManifestReceipt",
        "properties": {
          "type": "receipt",
          "receiptType": "local_file_manifest",
          "source": "local_filesystem_scan",
          "manifestId": "",
          "rootPaths": [],
          "fileCount": 0,
          "directoryCount": 0,
          "totalSizeBytes": 0,
          "sensitivePaths": [],
          "unreadablePaths": [],
          "duplicateAssets": [],
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
            "line": 34,
            "column": 3
          },
          "end": {
            "line": 49,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_manifest",
        "id": "consume_manifest",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
        "loc": {
          "start": {
            "line": 76,
            "column": 3
          },
          "end": {
            "line": 96,
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
            "title": "Local File Manifest",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-local-file-manifest.mjs",
            "defaultMode": "read_only_manifest"
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
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePathCount": 0,
            "unreadableCount": 0,
            "duplicateAssetCount": 0,
            "lastManifestReceiptId": ""
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
              "line": 26,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:local:manifest",
          "id": "holoshell:local:manifest",
          "properties": {
            "type": "pub_sub",
            "priority": "high",
            "description": "Local file manifest receipts for the world-build cockpit"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 28,
              "column": 3
            },
            "end": {
              "line": 32,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "LocalFileManifestReceipt",
          "properties": {
            "type": "receipt",
            "receiptType": "local_file_manifest",
            "source": "local_filesystem_scan",
            "manifestId": "",
            "rootPaths": [],
            "fileCount": 0,
            "directoryCount": 0,
            "totalSizeBytes": 0,
            "sensitivePaths": [],
            "unreadablePaths": [],
            "duplicateAssets": [],
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
              "line": 34,
              "column": 3
            },
            "end": {
              "line": 49,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_manifest",
          "id": "consume_manifest",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = manifest.summary.status\n    state.fileCount = manifest.summary.fileCount\n    state.directoryCount = manifest.summary.directoryCount\n    state.totalSizeBytes = manifest.summary.totalSizeBytes\n    state.sensitivePathCount = manifest.summary.sensitivePathCount\n    state.unreadableCount = manifest.summary.unreadableCount\n    state.duplicateAssetCount = manifest.summary.duplicateAssetCount\n    state.lastManifestReceiptId = manifest.receipt.manifestId\n\n    emit(\"holoshell:local:manifest\", {\n      status: state.status,\n      fileCount: state.fileCount,\n      directoryCount: state.directoryCount,\n      totalSizeBytes: state.totalSizeBytes,\n      sensitivePathCount: state.sensitivePathCount,\n      unreadableCount: state.unreadableCount,\n      duplicateAssetCount: state.duplicateAssetCount,\n      receipt: state.lastManifestReceiptId\n    })",
          "loc": {
            "start": {
              "line": 76,
              "column": 3
            },
            "end": {
              "line": 96,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "policy": "NoHiddenImports"
      }
    },
    "loc": {
      "start": {
        "line": 8,
        "column": 1
      },
      "end": {
        "line": 97,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}