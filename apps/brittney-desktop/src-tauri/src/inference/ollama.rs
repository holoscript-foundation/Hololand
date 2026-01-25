//! Ollama Client for Local LLM Inference
//!
//! Connects to local Ollama server (default: localhost:11434)
//! Provides chat completion with Brittney models

use super::{ChatMessage, InferenceRequest, InferenceResponse, ProviderStatus, Usage};
use anyhow::{Result, anyhow};
use reqwest::Client;
use serde::{Deserialize, Serialize};

const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434";

#[derive(Debug, Clone)]
pub struct OllamaClient {
    client: Client,
    base_url: String,
    timeout_secs: u64,
}

#[derive(Debug, Serialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
    options: OllamaOptions,
}

#[derive(Debug, Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Debug, Serialize)]
struct OllamaOptions {
    temperature: f32,
    num_predict: u32,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    model: String,
    message: OllamaResponseMessage,
    done: bool,
    #[serde(default)]
    prompt_eval_count: u32,
    #[serde(default)]
    eval_count: u32,
}

#[derive(Debug, Deserialize)]
struct OllamaResponseMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
    #[serde(default)]
    size: u64,
}

impl OllamaClient {
    pub fn new(base_url: Option<String>, timeout_secs: Option<u64>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.unwrap_or_else(|| DEFAULT_OLLAMA_URL.to_string()),
            timeout_secs: timeout_secs.unwrap_or(120),
        }
    }

    /// Check if Ollama is running and available
    pub async fn health(&self) -> bool {
        let url = format!("{}/api/tags", self.base_url);
        match self.client.get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }

    /// Get status with available models
    pub async fn get_status(&self) -> ProviderStatus {
        let url = format!("{}/api/tags", self.base_url);

        match self.client.get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<OllamaModelsResponse>().await {
                    Ok(data) => ProviderStatus {
                        provider: "local".to_string(),
                        available: true,
                        error: None,
                        models: data.models.into_iter().map(|m| m.name).collect(),
                    },
                    Err(e) => ProviderStatus {
                        provider: "local".to_string(),
                        available: false,
                        error: Some(format!("Failed to parse models: {}", e)),
                        models: vec![],
                    },
                }
            },
            Ok(resp) => ProviderStatus {
                provider: "local".to_string(),
                available: false,
                error: Some(format!("Ollama returned status: {}", resp.status())),
                models: vec![],
            },
            Err(e) => ProviderStatus {
                provider: "local".to_string(),
                available: false,
                error: Some(format!("Ollama not running: {}", e)),
                models: vec![],
            },
        }
    }

    /// Check if a specific model is available
    pub async fn has_model(&self, model_name: &str) -> bool {
        let status = self.get_status().await;
        status.models.iter().any(|m| m.starts_with(model_name.split(':').next().unwrap_or(model_name)))
    }

    /// Chat completion
    pub async fn chat(&self, request: InferenceRequest) -> Result<InferenceResponse> {
        let url = format!("{}/api/chat", self.base_url);

        let model = request.model.unwrap_or_else(|| "brittney-v4-expert:latest".to_string());

        let ollama_request = OllamaChatRequest {
            model: model.clone(),
            messages: request.messages.into_iter().map(|m| OllamaMessage {
                role: m.role,
                content: m.content,
            }).collect(),
            stream: false,
            options: OllamaOptions {
                temperature: request.temperature,
                num_predict: request.max_tokens,
            },
        };

        let resp = self.client.post(&url)
            .timeout(std::time::Duration::from_secs(self.timeout_secs))
            .json(&ollama_request)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Ollama error {}: {}", status, text));
        }

        let ollama_resp: OllamaChatResponse = resp.json().await?;

        Ok(InferenceResponse {
            id: format!("ollama_{}", chrono::Utc::now().timestamp_millis()),
            content: ollama_resp.message.content,
            model,
            provider: "local".to_string(),
            usage: Some(Usage {
                prompt_tokens: ollama_resp.prompt_eval_count,
                completion_tokens: ollama_resp.eval_count,
                total_tokens: ollama_resp.prompt_eval_count + ollama_resp.eval_count,
            }),
        })
    }

    /// Pull a model from Ollama registry
    pub async fn pull_model(&self, model_name: &str) -> Result<()> {
        let url = format!("{}/api/pull", self.base_url);

        let resp = self.client.post(&url)
            .json(&serde_json::json!({ "name": model_name }))
            .send()
            .await?;

        if !resp.status().is_success() {
            return Err(anyhow!("Failed to pull model: {}", resp.status()));
        }

        // Read the streaming response (just consume it for now)
        let _ = resp.text().await?;

        Ok(())
    }
}

impl Default for OllamaClient {
    fn default() -> Self {
        Self::new(None, None)
    }
}
