//! Brittney Inference Module
//!
//! Provides AI inference for HoloScript generation and assistance.
//!
//! Architecture:
//! 1. Check for running Ollama → use if available
//! 2. Fall back to BYOK cloud providers (user's API keys)
//! 3. (Future) Embedded llama.cpp for fully offline mode

pub mod ollama;
pub mod providers;
pub mod settings;

use serde::{Deserialize, Serialize};
use anyhow::Result;

/// Chat message for inference
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,     // "system", "user", "assistant"
    pub content: String,
}

/// Inference request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceRequest {
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default)]
    pub stream: bool,
}

fn default_temperature() -> f32 { 0.7 }
fn default_max_tokens() -> u32 { 2048 }

/// Inference response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceResponse {
    pub id: String,
    pub content: String,
    pub model: String,
    pub provider: String,
    pub usage: Option<Usage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Provider status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderStatus {
    pub provider: String,
    pub available: bool,
    pub error: Option<String>,
    pub models: Vec<String>,
}

/// HoloScript system prompt for optimal code generation
pub const HOLOSCRIPT_SYSTEM_PROMPT: &str = r#"You are Brittney, an expert HoloScript developer for Hololand VR/AR platform.

HoloScript is a visual graph language for 3D worlds. Key syntax:
- `composition "Name" { }` - Root container
- `template "Type" { state { } action name() { } }` - Define reusable types
- `spatial_group "Area" { }` - Group objects in space
- `object "Name" using "Template" { position: [x,y,z] }` - Create instances
- `orb "Name" { shape: "sphere" }` - Quick object definition
- `logic { on_event("name") { } every(ms) { } }` - Event handling

Always output valid HoloScript syntax. Prefer .holo files for scenes."#;

/// Brittney models optimized for HoloScript
pub mod models {
    /// Local Ollama models
    pub const LOCAL_EXPERT: &str = "brittney-v4-expert:latest";
    pub const LOCAL_HOLOSCRIPT: &str = "brittney-v1:latest";
    pub const LOCAL_GENERAL: &str = "brittney-v2:latest";

    /// Cloud fine-tuned models (OpenAI - BYOK)
    pub const CLOUD_HOLOSCRIPT: &str = "ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney:CztHDZP4";
    pub const CLOUD_GENERAL: &str = "ft:gpt-4o-mini-2024-07-18:brian-x-base-llc:brittney-v2:CzuzuPXc";
}

/// Select the best model for a HoloScript task
pub fn select_model_for_task(task: &str, prefer_local: bool) -> &'static str {
    let is_holoscript = task.to_lowercase().contains("holoscript")
        || task.to_lowercase().contains("scene")
        || task.to_lowercase().contains("world")
        || task.to_lowercase().contains("composition")
        || task.to_lowercase().contains("entity")
        || task.to_lowercase().contains("vr")
        || task.to_lowercase().contains("ar");

    if prefer_local {
        if is_holoscript {
            models::LOCAL_EXPERT
        } else {
            models::LOCAL_GENERAL
        }
    } else {
        if is_holoscript {
            models::CLOUD_HOLOSCRIPT
        } else {
            models::CLOUD_GENERAL
        }
    }
}
