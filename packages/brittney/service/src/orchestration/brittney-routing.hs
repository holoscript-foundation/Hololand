// =============================================================================
// Brittney AI Model Routing - HoloScript+ Orchestration
// =============================================================================
// Declarative routing graph for AI model selection.
// Agents can observe routing decisions, fallbacks, and provider status.
//
// Pattern: P.ORCH.BRITTNEY.ROUTING.01
// Wisdom: W.AGENT.OBSERVE.01 - "Agents need to see what's happening"
// =============================================================================

meta {
  id: "ORCH_BRITTNEY_ROUTING_001"
  name: "Brittney AI Model Routing"
  version: "1.0.0"
  compiled_target: "uAAL_VM_Epoch11"
}

// === PROVIDER DEFINITIONS ===
providers {
  foundry_local {
    id: "foundry-local"
    name: "Foundry Local"
    color: "#10b981"  // Green - local/offline
    endpoint: "http://localhost:5272/v1/chat/completions"
    priority: 1
    offline_capable: true
    latency_class: "fast"
  }

  azure_foundry {
    id: "azure-foundry"
    name: "Azure AI Foundry"
    color: "#3b82f6"  // Blue - cloud fine-tuned
    endpoint: "${config.azure_endpoint}/openai/deployments/${config.deployment}/chat/completions"
    priority: 2
    offline_capable: false
    latency_class: "medium"
  }

  brittney_cloud {
    id: "brittney-cloud"
    name: "Brittney (Grok-3)"
    color: "#8b5cf6"  // Purple - specialist
    endpoint: "http://localhost:11435/chat"
    priority: 3
    offline_capable: false
    latency_class: "medium"
  }

  primary_grok {
    id: "primary-grok"
    name: "Grok-4 Fast Reasoning"
    color: "#f59e0b"  // Amber - primary
    endpoint: "https://api.x.ai/v1/chat/completions"
    priority: 10
    offline_capable: false
    latency_class: "fast"
  }
}

// === TASK CATEGORIES ===
categories {
  specialist: ["holoscript", "vr_scene", "debugging", "performance"]
  primary: ["general_code", "explanation", "planning"]
  hybrid: ["mixed", "low_confidence"]
}

// === KEYWORD CLASSIFICATION ===
classification {
  specialist_keywords: [
    // HoloScript
    "holoscript", "@scene", "@object", "@ui", "@pointable", "@grabbable",
    // Hololand
    "hololand", "brittney", "vr world", "ar world", "metaverse",
    // VR/AR
    "hand tracking", "teleport", "avatar", "spatial audio",
    // 3D
    "mesh", "gltf", "position:", "rotation:", "scale:", "animation"
  ]

  primary_keywords: [
    "typescript", "javascript", "python", "react", "api", "database",
    "architecture", "refactor", "security", "explain", "plan"
  ]
}

// === ORCHESTRATION GRAPH ===
orchestration brittney_routing {
  entry: classify_task

  config {
    routing_threshold: 0.7
    fallback_enabled: true
    max_retries: 2
    timeout_ms: 30000
  }

  state {
    // Classification
    category: null
    confidence: 0
    matched_keywords: []

    // Routing
    route: null
    selected_provider: null
    fallback_chain: []

    // Execution
    attempt: 0
    response: null
    error: null
    latency_ms: 0
  }

  // === NODES ===
  nodes {
    // ─────────────────────────────────────────────────────────────
    // CLASSIFY_TASK: Analyze input and determine category
    // ─────────────────────────────────────────────────────────────
    classify_task {
      type: "classifier"
      description: "Classify task based on keywords"

      actions: [
        { op: "STATE_SET", key: "attempt", value: 0 },
        { op: "CLASSIFY_KEYWORDS",
          specialist: "classification.specialist_keywords",
          primary: "classification.primary_keywords" },
        { op: "STATE_SET", key: "category", value: "classification.category" },
        { op: "STATE_SET", key: "confidence", value: "classification.confidence" },
        { op: "STATE_SET", key: "matched_keywords", value: "classification.matched" },
        { op: "EMIT", event: "task_classified", data: "state" }
      ]

      routes: {
        conditions: [
          { if: "state.category in categories.specialist", goto: specialist_route },
          { if: "state.confidence < config.routing_threshold", goto: hybrid_route },
          { default: primary_route }
        ]
      }
    }

    // ─────────────────────────────────────────────────────────────
    // SPECIALIST_ROUTE: HoloScript/VR tasks with fallback chain
    // ─────────────────────────────────────────────────────────────
    specialist_route {
      type: "fallback_chain"
      description: "Route to specialist providers with fallback"

      // Ordered fallback: Local → Azure → Cloud
      chain: [
        { provider: "foundry_local", condition: "providers.foundry_local.enabled" },
        { provider: "azure_foundry", condition: "providers.azure_foundry.enabled" },
        { provider: "brittney_cloud", condition: "true" }
      ]

      actions: [
        { op: "STATE_SET", key: "route", value: "specialist" },
        { op: "STATE_SET", key: "fallback_chain", value: "chain" },
        { op: "EMIT", event: "route_selected", data: { route: "specialist", chain: "chain" } }
      ]

      next: try_provider
    }

    // ─────────────────────────────────────────────────────────────
    // PRIMARY_ROUTE: General tasks to primary provider
    // ─────────────────────────────────────────────────────────────
    primary_route {
      type: "direct"
      description: "Route to primary provider"

      actions: [
        { op: "STATE_SET", key: "route", value: "primary" },
        { op: "STATE_SET", key: "selected_provider", value: "primary_grok" },
        { op: "STATE_SET", key: "fallback_chain", value: ["primary_grok"] },
        { op: "EMIT", event: "route_selected", data: { route: "primary" } }
      ]

      next: try_provider
    }

    // ─────────────────────────────────────────────────────────────
    // HYBRID_ROUTE: Mixed tasks - primary analyzes, specialist executes
    // ─────────────────────────────────────────────────────────────
    hybrid_route {
      type: "hybrid"
      description: "Hybrid routing - primary + specialist collaboration"

      actions: [
        { op: "STATE_SET", key: "route", value: "hybrid" },
        { op: "EMIT", event: "route_selected", data: { route: "hybrid" } },
        // First call primary for analysis
        { op: "CALL_PROVIDER", provider: "primary_grok", purpose: "analyze" },
        // Check if specialist needed
        { op: "EXTRACT_SPECIALIST_TASKS", from: "response" }
      ]

      routes: {
        condition: "specialist_tasks.length > 0"
        true: delegate_to_specialist
        false: complete
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TRY_PROVIDER: Attempt to call current provider in chain
    // ─────────────────────────────────────────────────────────────
    try_provider {
      type: "provider_call"
      description: "Attempt provider call with timeout"

      actions: [
        { op: "STATE_INCREMENT", key: "attempt" },
        { op: "GET_NEXT_PROVIDER", from: "state.fallback_chain" },
        { op: "STATE_SET", key: "selected_provider", value: "next_provider" },
        { op: "EMIT", event: "provider_attempt", data: {
            provider: "state.selected_provider",
            attempt: "state.attempt"
          }
        },
        { op: "TIMER_START", key: "latency" },
        { op: "CALL_PROVIDER",
          provider: "state.selected_provider",
          timeout: "config.timeout_ms" },
        { op: "TIMER_STOP", key: "latency" },
        { op: "STATE_SET", key: "latency_ms", value: "timer.latency" }
      ]

      routes: {
        conditions: [
          { if: "response.success", goto: complete },
          { if: "state.fallback_chain.hasNext", goto: fallback },
          { default: error_handler }
        ]
      }
    }

    // ─────────────────────────────────────────────────────────────
    // FALLBACK: Move to next provider in chain
    // ─────────────────────────────────────────────────────────────
    fallback {
      type: "fallback"
      description: "Fallback to next provider"

      actions: [
        { op: "STATE_SET", key: "error", value: "last_error" },
        { op: "EMIT", event: "provider_fallback", data: {
            failed_provider: "state.selected_provider",
            error: "state.error",
            next_provider: "state.fallback_chain.next"
          }
        },
        { op: "ADVANCE_CHAIN", key: "fallback_chain" }
      ]

      next: try_provider
    }

    // ─────────────────────────────────────────────────────────────
    // DELEGATE_TO_SPECIALIST: Hand off specialist tasks
    // ─────────────────────────────────────────────────────────────
    delegate_to_specialist {
      type: "delegation"
      description: "Delegate specialist portions to Brittney"

      actions: [
        { op: "EMIT", event: "hybrid_delegation", data: { tasks: "specialist_tasks" } },
        { op: "STATE_SET", key: "fallback_chain", value: ["foundry_local", "azure_foundry", "brittney_cloud"] }
      ]

      next: try_provider
    }

    // ─────────────────────────────────────────────────────────────
    // ERROR_HANDLER: All providers failed
    // ─────────────────────────────────────────────────────────────
    error_handler {
      type: "error"
      description: "Handle complete routing failure"

      actions: [
        { op: "EMIT", event: "routing_failed", data: {
            route: "state.route",
            attempts: "state.attempt",
            last_error: "state.error"
          }
        },
        { op: "STATE_SET", key: "response", value: {
            success: false,
            error: "All providers failed"
          }
        }
      ]

      next: complete
    }

    // ─────────────────────────────────────────────────────────────
    // COMPLETE: Finalize and emit result
    // ─────────────────────────────────────────────────────────────
    complete {
      type: "terminal"
      description: "Routing complete"

      actions: [
        { op: "EMIT", event: "routing_complete", data: {
            route: "state.route",
            provider: "state.selected_provider",
            category: "state.category",
            confidence: "state.confidence",
            latency_ms: "state.latency_ms",
            attempts: "state.attempt"
          }
        },
        { op: "GRAPH_END" }
      ]
    }
  }

  // === EVENTS FOR AGENT OBSERVATION ===
  events {
    task_classified: {
      description: "Task has been classified"
      payload: ["category", "confidence", "matched_keywords"]
    }
    route_selected: {
      description: "Routing decision made"
      payload: ["route", "fallback_chain"]
    }
    provider_attempt: {
      description: "Attempting to call provider"
      payload: ["provider", "attempt"]
    }
    provider_fallback: {
      description: "Provider failed, falling back"
      payload: ["failed_provider", "error", "next_provider"]
    }
    hybrid_delegation: {
      description: "Delegating specialist tasks in hybrid mode"
      payload: ["tasks"]
    }
    routing_failed: {
      description: "All providers failed"
      payload: ["route", "attempts", "last_error"]
    }
    routing_complete: {
      description: "Routing finished successfully"
      payload: ["route", "provider", "category", "confidence", "latency_ms"]
    }
  }
}
