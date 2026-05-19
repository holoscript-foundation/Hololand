{
  "type": "Program",
  "id": "root",
  "properties": {},
  "directives": [],
  "children": [
    {
      "type": "composition",
      "name": "HoloShell Source Validation Guard",
      "id": "HoloShell Source Validation Guard",
      "properties": {
        "policy": "BrowserProjectionIsNotSource"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "HoloShell Source Validation Guard",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-source-validation.mjs",
            "sourceRoot": "apps/holoshell/source",
            "latestReceipt": ".tmp/holoshell/source-validation.json",
            "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "fileCount": 0,
            "passCount": 0,
            "failCount": 0,
            "holoCount": 0,
            "hsCount": 0,
            "hsplusCount": 0,
            "lastValidationHash": ""
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
              "line": 27,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:source:validation",
          "id": "holoshell:source:validation",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Whole-source HoloScript parser guard for HoloShell"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 29,
              "column": 3
            },
            "end": {
              "line": 33,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "SourceValidationReceipt",
          "properties": {
            "type": "source_validation_receipt",
            "receiptType": "hololand.holoshell.source-validation.v0.1.0",
            "validatesExtensions": [
              ".holo",
              ".hs",
              ".hsplus"
            ],
            "failOnAnyInvalidSource": true,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 35,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_source_validation",
          "id": "consume_source_validation",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 80,
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
              "title": "HoloShell Source Validation Guard",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-source-validation.mjs",
              "sourceRoot": "apps/holoshell/source",
              "latestReceipt": ".tmp/holoshell/source-validation.json",
              "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "fileCount": 0,
              "passCount": 0,
              "failCount": 0,
              "holoCount": 0,
              "hsCount": 0,
              "hsplusCount": 0,
              "lastValidationHash": ""
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
                "line": 27,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:source:validation",
            "id": "holoshell:source:validation",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Whole-source HoloScript parser guard for HoloShell"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 29,
                "column": 3
              },
              "end": {
                "line": 33,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "SourceValidationReceipt",
            "properties": {
              "type": "source_validation_receipt",
              "receiptType": "hololand.holoshell.source-validation.v0.1.0",
              "validatesExtensions": [
                ".holo",
                ".hs",
                ".hsplus"
              ],
              "failOnAnyInvalidSource": true,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 35,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_source_validation",
            "id": "consume_source_validation",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "BrowserProjectionIsNotSource"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 81,
          "column": 2
        }
      }
    }
  ],
  "worlds": [],
  "compositions": [
    {
      "type": "composition",
      "name": "HoloShell Source Validation Guard",
      "id": "HoloShell Source Validation Guard",
      "properties": {
        "policy": "BrowserProjectionIsNotSource"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "HoloShell Source Validation Guard",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-source-validation.mjs",
            "sourceRoot": "apps/holoshell/source",
            "latestReceipt": ".tmp/holoshell/source-validation.json",
            "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "fileCount": 0,
            "passCount": 0,
            "failCount": 0,
            "holoCount": 0,
            "hsCount": 0,
            "hsplusCount": 0,
            "lastValidationHash": ""
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
              "line": 27,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:source:validation",
          "id": "holoshell:source:validation",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Whole-source HoloScript parser guard for HoloShell"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 29,
              "column": 3
            },
            "end": {
              "line": 33,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "SourceValidationReceipt",
          "properties": {
            "type": "source_validation_receipt",
            "receiptType": "hololand.holoshell.source-validation.v0.1.0",
            "validatesExtensions": [
              ".holo",
              ".hs",
              ".hsplus"
            ],
            "failOnAnyInvalidSource": true,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 35,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_source_validation",
          "id": "consume_source_validation",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 80,
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
              "title": "HoloShell Source Validation Guard",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-source-validation.mjs",
              "sourceRoot": "apps/holoshell/source",
              "latestReceipt": ".tmp/holoshell/source-validation.json",
              "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "fileCount": 0,
              "passCount": 0,
              "failCount": 0,
              "holoCount": 0,
              "hsCount": 0,
              "hsplusCount": 0,
              "lastValidationHash": ""
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
                "line": 27,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:source:validation",
            "id": "holoshell:source:validation",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Whole-source HoloScript parser guard for HoloShell"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 29,
                "column": 3
              },
              "end": {
                "line": 33,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "SourceValidationReceipt",
            "properties": {
              "type": "source_validation_receipt",
              "receiptType": "hololand.holoshell.source-validation.v0.1.0",
              "validatesExtensions": [
                ".holo",
                ".hs",
                ".hsplus"
              ],
              "failOnAnyInvalidSource": true,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 35,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_source_validation",
            "id": "consume_source_validation",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "BrowserProjectionIsNotSource"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 81,
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
      "line": 81,
      "column": 2
    }
  },
  "body": [
    {
      "type": "composition",
      "name": "HoloShell Source Validation Guard",
      "id": "HoloShell Source Validation Guard",
      "properties": {
        "policy": "BrowserProjectionIsNotSource"
      },
      "directives": [],
      "children": [
        {
          "type": "config",
          "properties": {
            "title": "HoloShell Source Validation Guard",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-source-validation.mjs",
            "sourceRoot": "apps/holoshell/source",
            "latestReceipt": ".tmp/holoshell/source-validation.json",
            "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "fileCount": 0,
            "passCount": 0,
            "failCount": 0,
            "holoCount": 0,
            "hsCount": 0,
            "hsplusCount": 0,
            "lastValidationHash": ""
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
              "line": 27,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:source:validation",
          "id": "holoshell:source:validation",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Whole-source HoloScript parser guard for HoloShell"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 29,
              "column": 3
            },
            "end": {
              "line": 33,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "SourceValidationReceipt",
          "properties": {
            "type": "source_validation_receipt",
            "receiptType": "hololand.holoshell.source-validation.v0.1.0",
            "validatesExtensions": [
              ".holo",
              ".hs",
              ".hsplus"
            ],
            "failOnAnyInvalidSource": true,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 35,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_source_validation",
          "id": "consume_source_validation",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 80,
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
              "title": "HoloShell Source Validation Guard",
              "product": "HoloShell",
              "sourceLayer": "HoloScript",
              "adapterScript": "scripts/holoshell-source-validation.mjs",
              "sourceRoot": "apps/holoshell/source",
              "latestReceipt": ".tmp/holoshell/source-validation.json",
              "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
                "line": 16,
                "column": 4
              }
            }
          },
          {
            "type": "state",
            "properties": {
              "status": "unknown",
              "fileCount": 0,
              "passCount": 0,
              "failCount": 0,
              "holoCount": 0,
              "hsCount": 0,
              "hsplusCount": 0,
              "lastValidationHash": ""
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
                "line": 27,
                "column": 4
              }
            }
          },
          {
            "type": "channel",
            "name": "holoshell:source:validation",
            "id": "holoshell:source:validation",
            "properties": {
              "type": "pub_sub",
              "priority": "critical",
              "description": "Whole-source HoloScript parser guard for HoloShell"
            },
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 29,
                "column": 3
              },
              "end": {
                "line": 33,
                "column": 4
              }
            }
          },
          {
            "type": "template",
            "name": "SourceValidationReceipt",
            "properties": {
              "type": "source_validation_receipt",
              "receiptType": "hololand.holoshell.source-validation.v0.1.0",
              "validatesExtensions": [
                ".holo",
                ".hs",
                ".hsplus"
              ],
              "failOnAnyInvalidSource": true,
              "rawCommandsIncluded": false,
              "receiptRequired": true
            },
            "migrations": [],
            "directives": [],
            "children": [],
            "traits": {},
            "loc": {
              "start": {
                "line": 35,
                "column": 3
              },
              "end": {
                "line": 42,
                "column": 4
              }
            }
          },
          {
            "type": "action",
            "name": "consume_source_validation",
            "id": "consume_source_validation",
            "properties": {},
            "directives": [],
            "children": [],
            "traits": {},
            "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
            "loc": {
              "start": {
                "line": 60,
                "column": 3
              },
              "end": {
                "line": 80,
                "column": 4
              }
            }
          }
        ],
        "properties": {
          "policy": "BrowserProjectionIsNotSource"
        }
      },
      "loc": {
        "start": {
          "line": 7,
          "column": 1
        },
        "end": {
          "line": 81,
          "column": 2
        }
      }
    }
  ],
  "version": "1.0",
  "root": {
    "type": "composition",
    "name": "HoloShell Source Validation Guard",
    "id": "HoloShell Source Validation Guard",
    "properties": {
      "policy": "BrowserProjectionIsNotSource"
    },
    "directives": [],
    "children": [
      {
        "type": "config",
        "properties": {
          "title": "HoloShell Source Validation Guard",
          "product": "HoloShell",
          "sourceLayer": "HoloScript",
          "adapterScript": "scripts/holoshell-source-validation.mjs",
          "sourceRoot": "apps/holoshell/source",
          "latestReceipt": ".tmp/holoshell/source-validation.json",
          "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
            "line": 16,
            "column": 4
          }
        }
      },
      {
        "type": "state",
        "properties": {
          "status": "unknown",
          "fileCount": 0,
          "passCount": 0,
          "failCount": 0,
          "holoCount": 0,
          "hsCount": 0,
          "hsplusCount": 0,
          "lastValidationHash": ""
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
            "line": 27,
            "column": 4
          }
        }
      },
      {
        "type": "channel",
        "name": "holoshell:source:validation",
        "id": "holoshell:source:validation",
        "properties": {
          "type": "pub_sub",
          "priority": "critical",
          "description": "Whole-source HoloScript parser guard for HoloShell"
        },
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 29,
            "column": 3
          },
          "end": {
            "line": 33,
            "column": 4
          }
        }
      },
      {
        "type": "template",
        "name": "SourceValidationReceipt",
        "properties": {
          "type": "source_validation_receipt",
          "receiptType": "hololand.holoshell.source-validation.v0.1.0",
          "validatesExtensions": [
            ".holo",
            ".hs",
            ".hsplus"
          ],
          "failOnAnyInvalidSource": true,
          "rawCommandsIncluded": false,
          "receiptRequired": true
        },
        "migrations": [],
        "directives": [],
        "children": [],
        "traits": {},
        "loc": {
          "start": {
            "line": 35,
            "column": 3
          },
          "end": {
            "line": 42,
            "column": 4
          }
        }
      },
      {
        "type": "action",
        "name": "consume_source_validation",
        "id": "consume_source_validation",
        "properties": {},
        "directives": [],
        "children": [],
        "traits": {},
        "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
        "loc": {
          "start": {
            "line": 60,
            "column": 3
          },
          "end": {
            "line": 80,
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
            "title": "HoloShell Source Validation Guard",
            "product": "HoloShell",
            "sourceLayer": "HoloScript",
            "adapterScript": "scripts/holoshell-source-validation.mjs",
            "sourceRoot": "apps/holoshell/source",
            "latestReceipt": ".tmp/holoshell/source-validation.json",
            "latestBootstrap": ".tmp/holoshell/source-validation.js"
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
              "line": 16,
              "column": 4
            }
          }
        },
        {
          "type": "state",
          "properties": {
            "status": "unknown",
            "fileCount": 0,
            "passCount": 0,
            "failCount": 0,
            "holoCount": 0,
            "hsCount": 0,
            "hsplusCount": 0,
            "lastValidationHash": ""
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
              "line": 27,
              "column": 4
            }
          }
        },
        {
          "type": "channel",
          "name": "holoshell:source:validation",
          "id": "holoshell:source:validation",
          "properties": {
            "type": "pub_sub",
            "priority": "critical",
            "description": "Whole-source HoloScript parser guard for HoloShell"
          },
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 29,
              "column": 3
            },
            "end": {
              "line": 33,
              "column": 4
            }
          }
        },
        {
          "type": "template",
          "name": "SourceValidationReceipt",
          "properties": {
            "type": "source_validation_receipt",
            "receiptType": "hololand.holoshell.source-validation.v0.1.0",
            "validatesExtensions": [
              ".holo",
              ".hs",
              ".hsplus"
            ],
            "failOnAnyInvalidSource": true,
            "rawCommandsIncluded": false,
            "receiptRequired": true
          },
          "migrations": [],
          "directives": [],
          "children": [],
          "traits": {},
          "loc": {
            "start": {
              "line": 35,
              "column": 3
            },
            "end": {
              "line": 42,
              "column": 4
            }
          }
        },
        {
          "type": "action",
          "name": "consume_source_validation",
          "id": "consume_source_validation",
          "properties": {},
          "directives": [],
          "children": [],
          "traits": {},
          "body": "state.status = receipt.summary.status\n    state.fileCount = receipt.summary.fileCount\n    state.passCount = receipt.summary.passCount\n    state.failCount = receipt.summary.failCount\n    state.holoCount = receipt.summary.holoCount\n    state.hsCount = receipt.summary.hsCount\n    state.hsplusCount = receipt.summary.hsplusCount\n    state.lastValidationHash = receipt.receipt.validationHash\n\n    emit(\"holoshell:source:validation\", {\n      status: state.status,\n      files: state.fileCount,\n      passed: state.passCount,\n      failed: state.failCount,\n      holo: state.holoCount,\n      hs: state.hsCount,\n      hsplus: state.hsplusCount,\n      receipt: state.lastValidationHash\n    })",
          "loc": {
            "start": {
              "line": 60,
              "column": 3
            },
            "end": {
              "line": 80,
              "column": 4
            }
          }
        }
      ],
      "properties": {
        "policy": "BrowserProjectionIsNotSource"
      }
    },
    "loc": {
      "start": {
        "line": 7,
        "column": 1
      },
      "end": {
        "line": 81,
        "column": 2
      }
    }
  },
  "imports": [],
  "hasState": false,
  "hasVRTraits": false,
  "hasControlFlow": false
}