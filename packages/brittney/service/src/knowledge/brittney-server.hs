// =============================================================================
// Brittney Server Routes - HoloScript+ Format
// =============================================================================
// Declarative API route definitions. Agents can observe API structure.
//
// Pattern: P.API.BRITTNEY.01
// Wisdom: W.API.DECLARATIVE.01 - "APIs should be self-documenting"
// =============================================================================

meta {
  id: "API_BRITTNEY_001"
  name: "Brittney Server API"
  version: "1.0.0"
  port: 11435
  base_path: "/"
}

// === SERVER CONFIGURATION ===
server brittney_service {
  port: 11435
  host: "localhost"
  cors: {
    origin: "*"
    methods: ["GET", "POST", "OPTIONS"]
  }
  timeout: 30000
}

// === API ROUTES ===
api brittney_api {

  // ─────────────────────────────────────────────────────────────
  // CHAT ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  POST /chat {
    description: "Main chat endpoint for Brittney interactions"
    handler: chat_handler

    input: {
      messages: {
        type: "array"
        items: {
          role: "string"  // "system" | "user" | "assistant"
          content: "string"
        }
        required: true
      }
      preferCloud: {
        type: "boolean"
        default: true
        description: "Prefer cloud provider over local model"
      }
      context: {
        type: "object"
        description: "Optional scene/code context"
        properties: {
          currentScene: "string"
          recentErrors: "array"
          projectType: "string"
        }
      }
    }

    output: {
      content: "string"
      model: "string"
      provider: "string"
      usage: {
        promptTokens: "number"
        completionTokens: "number"
        totalTokens: "number"
      }
    }

    events: ["chat_request", "chat_response"]
  }

  POST /v1/chat/completions {
    description: "OpenAI-compatible chat completions endpoint"
    handler: openai_compat_handler

    input: {
      model: {
        type: "string"
        default: "brittney"
      }
      messages: {
        type: "array"
        required: true
      }
      max_tokens: {
        type: "number"
        default: 4096
      }
      temperature: {
        type: "number"
        default: 0.7
      }
      stream: {
        type: "boolean"
        default: false
      }
    }

    output: {
      // OpenAI format
      id: "string"
      object: "chat.completion"
      choices: "array"
      usage: "object"
    }
  }

  POST /chat/stream {
    description: "Server-sent events streaming chat"
    handler: stream_handler
    response_type: "text/event-stream"

    input: {
      messages: "array"
      preferCloud: "boolean"
    }

    events: [
      "stream_start",
      "stream_chunk",
      "stream_end"
    ]
  }

  // ─────────────────────────────────────────────────────────────
  // SPECIALIST ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  POST /explain-error {
    description: "Context-aware error explanation"
    handler: error_explainer
    prompt: "error_explanation"

    input: {
      error: {
        type: "string"
        required: true
        description: "The error message or stack trace"
      }
      context: {
        type: "object"
        properties: {
          file: "string"
          line: "number"
          code: "string"
          scene: "string"
        }
      }
    }

    output: {
      explanation: "string"
      cause: "string"
      fix: "string"
      codeExample: "string"
    }
  }

  POST /suggest-fix {
    description: "Generate fix suggestions for issues"
    handler: fix_suggester

    input: {
      issue: {
        type: "string"
        required: true
      }
      code: {
        type: "string"
        description: "Current code with the issue"
      }
      errorType: {
        type: "string"
        enum: ["syntax", "runtime", "performance", "logic"]
      }
    }

    output: {
      suggestions: {
        type: "array"
        items: {
          fix: "string"
          code: "string"
          confidence: "number"
        }
      }
    }
  }

  POST /analyze-performance {
    description: "VR performance analysis and recommendations"
    handler: performance_analyzer
    prompt: "performance"

    input: {
      sceneStats: {
        type: "object"
        properties: {
          drawCalls: "number"
          triangles: "number"
          materials: "number"
          textures: "number"
          particleSystems: "number"
        }
      }
      targetFPS: {
        type: "number"
        default: 90
      }
    }

    output: {
      score: "number"
      issues: "array"
      recommendations: "array"
    }
  }

  // ─────────────────────────────────────────────────────────────
  // KNOWLEDGE / RAG ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  POST /knowledge/search {
    description: "Search HoloScript knowledge base"
    handler: knowledge_search
    knowledge_source: "@knowledge/holoscript-knowledge.hs"

    input: {
      query: {
        type: "string"
        required: true
      }
      limit: {
        type: "number"
        default: 5
      }
      categories: {
        type: "array"
        items: "string"
        description: "Filter by category"
      }
    }

    output: {
      results: {
        type: "array"
        items: {
          id: "string"
          category: "string"
          content: "string"
          keywords: "array"
          score: "number"
        }
      }
    }
  }

  GET /knowledge/categories {
    description: "List available knowledge categories"
    handler: list_categories

    output: {
      categories: ["objects", "traits", "animation", "interaction", "ui", "effects", "scene", "gameplay", "audio", "materials"]
    }
  }

  // ─────────────────────────────────────────────────────────────
  // CONFIGURATION ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  GET /config {
    description: "Get current Brittney configuration"
    handler: get_config

    output: {
      modelName: "string"
      contextSize: "number"
      cloudProvider: "string"
      preferCloud: "boolean"
      azureFoundry: "object"
      foundryLocal: "object"
    }
  }

  POST /config {
    description: "Update Brittney configuration"
    handler: update_config
    auth_required: true

    input: {
      preferCloud: "boolean"
      cloudProvider: "string"
      cloudModel: "string"
    }

    output: {
      success: "boolean"
      config: "object"
    }
  }

  GET /providers {
    description: "List available AI providers"
    handler: list_providers

    output: {
      providers: {
        type: "array"
        items: {
          id: "string"
          name: "string"
          available: "boolean"
          models: "array"
        }
      }
      active: "string"
    }
  }

  POST /providers/switch {
    description: "Switch active AI provider"
    handler: switch_provider

    input: {
      provider: {
        type: "string"
        required: true
        enum: ["grok", "openai", "anthropic", "azure", "google", "foundry-local"]
      }
      model: "string"
    }

    output: {
      success: "boolean"
      provider: "string"
      model: "string"
    }
  }

  // ─────────────────────────────────────────────────────────────
  // HEALTH & STATUS ENDPOINTS
  // ─────────────────────────────────────────────────────────────

  GET /health {
    description: "Service health check"
    handler: health_check
    cache: 5s

    output: {
      status: "ok" | "degraded" | "error"
      uptime: "number"
      version: "string"
      model: {
        loaded: "boolean"
        name: "string"
      }
      providers: {
        available: "array"
        active: "string"
      }
    }
  }

  GET /status {
    description: "Detailed service status"
    handler: status_check

    output: {
      orchestrator: {
        primaryProvider: "string"
        primaryModel: "string"
        specialistEndpoint: "string"
        hybridMode: "boolean"
        azureFoundryEnabled: "boolean"
        foundryLocalEnabled: "boolean"
      }
      runtime: {
        providers: "array"
        state: "object"
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // WEBSOCKET
  // ─────────────────────────────────────────────────────────────

  WS /ws {
    description: "WebSocket connection for real-time communication"

    message_types: {
      chat: {
        direction: "bidirectional"
        payload: {
          messages: "array"
        }
      }
      chat_stream: {
        direction: "server_to_client"
        payload: {
          chunk: "string"
          done: "boolean"
        }
      }
      ping: {
        direction: "bidirectional"
        payload: {
          timestamp: "number"
        }
      }
      orchestration_event: {
        direction: "server_to_client"
        payload: {
          type: "string"
          data: "object"
        }
      }
    }
  }
}

// === MIDDLEWARE ===
middleware {
  cors: {
    enabled: true
    origin: "*"
  }

  logging: {
    enabled: true
    level: "info"
    format: "[{timestamp}] {method} {path} {status} {duration}ms"
  }

  rate_limiting: {
    enabled: true
    requests_per_minute: 60
    burst: 10
  }

  error_handling: {
    format: "json"
    include_stack: false
  }
}

// === EVENT EMISSIONS ===
// These events are emitted for agent observation
events {
  chat_request: {
    description: "Chat request received"
    payload: ["messages", "preferCloud"]
  }

  chat_response: {
    description: "Chat response sent"
    payload: ["content", "model", "provider", "usage"]
  }

  knowledge_search: {
    description: "Knowledge base searched"
    payload: ["query", "results_count"]
  }

  provider_switch: {
    description: "AI provider switched"
    payload: ["from", "to", "model"]
  }

  config_update: {
    description: "Configuration updated"
    payload: ["changes"]
  }
}
