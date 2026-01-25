//! BYOK Cloud Providers
//!
//! Support for user-provided API keys:
//! - OpenAI (including fine-tuned Brittney models)
//! - Anthropic
//! - Google (Gemini)
//! - Grok (xAI)
//! - Azure OpenAI
//! - InfinityAssistant (infinityassistant.io)

use super::{ChatMessage, InferenceRequest, InferenceResponse, ProviderStatus, Usage};
use anyhow::{Result, anyhow};
use reqwest::Client;
use serde::{Deserialize, Serialize};

/// Provider type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    Local,
    OpenAI,
    Anthropic,
    Google,
    Grok,
    Azure,
    InfinityAssistant,
    Custom,
}

impl std::fmt::Display for ProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderType::Local => write!(f, "local"),
            ProviderType::OpenAI => write!(f, "openai"),
            ProviderType::Anthropic => write!(f, "anthropic"),
            ProviderType::Google => write!(f, "google"),
            ProviderType::Grok => write!(f, "grok"),
            ProviderType::Azure => write!(f, "azure"),
            ProviderType::InfinityAssistant => write!(f, "infinityassistant"),
            ProviderType::Custom => write!(f, "custom"),
        }
    }
}

/// OpenAI-compatible provider (works with OpenAI, Grok, Google, Azure, Custom)
#[derive(Debug, Clone)]
pub struct OpenAICompatibleProvider {
    client: Client,
    api_key: String,
    base_url: String,
    default_model: String,
    provider_type: ProviderType,
}

#[derive(Debug, Serialize)]
struct OpenAIChatRequest {
    model: String,
    messages: Vec<OpenAIMessage>,
    temperature: f32,
    max_tokens: u32,
}

#[derive(Debug, Serialize, Deserialize)]
struct OpenAIMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct OpenAIChatResponse {
    id: String,
    choices: Vec<OpenAIChoice>,
    usage: Option<OpenAIUsage>,
}

#[derive(Debug, Deserialize)]
struct OpenAIChoice {
    message: OpenAIMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAIUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

impl OpenAICompatibleProvider {
    /// Create OpenAI provider
    pub fn openai(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.openai.com/v1".to_string(),
            default_model: model.unwrap_or_else(|| "gpt-4o-mini".to_string()),
            provider_type: ProviderType::OpenAI,
        }
    }

    /// Create Grok (xAI) provider
    pub fn grok(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.x.ai/v1".to_string(),
            default_model: model.unwrap_or_else(|| "grok-3".to_string()),
            provider_type: ProviderType::Grok,
        }
    }

    /// Create Google (Gemini) provider
    pub fn google(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://generativelanguage.googleapis.com/v1beta/openai".to_string(),
            default_model: model.unwrap_or_else(|| "gemini-2.0-flash".to_string()),
            provider_type: ProviderType::Google,
        }
    }

    /// Create Azure OpenAI provider
    pub fn azure(api_key: String, endpoint: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: endpoint,
            default_model: model.unwrap_or_else(|| "gpt-4o".to_string()),
            provider_type: ProviderType::Azure,
        }
    }

    /// Create custom OpenAI-compatible provider
    pub fn custom(api_key: String, endpoint: String, model: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: endpoint,
            default_model: model,
            provider_type: ProviderType::Custom,
        }
    }

    /// Get provider status
    pub async fn get_status(&self) -> ProviderStatus {
        // Just check if we have an API key configured
        ProviderStatus {
            provider: self.provider_type.to_string(),
            available: !self.api_key.is_empty(),
            error: if self.api_key.is_empty() {
                Some("No API key configured".to_string())
            } else {
                None
            },
            models: vec![self.default_model.clone()],
        }
    }

    /// Chat completion
    pub async fn chat(&self, request: InferenceRequest) -> Result<InferenceResponse> {
        let url = format!("{}/chat/completions", self.base_url);

        let model = request.model.unwrap_or_else(|| self.default_model.clone());

        let openai_request = OpenAIChatRequest {
            model: model.clone(),
            messages: request.messages.into_iter().map(|m| OpenAIMessage {
                role: m.role,
                content: m.content,
            }).collect(),
            temperature: request.temperature,
            max_tokens: request.max_tokens,
        };

        let mut req = self.client.post(&url)
            .timeout(std::time::Duration::from_secs(120))
            .header("Content-Type", "application/json");

        // Azure uses different auth header
        if self.provider_type == ProviderType::Azure {
            req = req.header("api-key", &self.api_key);
        } else {
            req = req.header("Authorization", format!("Bearer {}", self.api_key));
        }

        let resp = req.json(&openai_request).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("{} error {}: {}", self.provider_type, status, text));
        }

        let openai_resp: OpenAIChatResponse = resp.json().await?;
        let choice = openai_resp.choices.into_iter().next()
            .ok_or_else(|| anyhow!("No response from {}", self.provider_type))?;

        Ok(InferenceResponse {
            id: openai_resp.id,
            content: choice.message.content,
            model,
            provider: self.provider_type.to_string(),
            usage: openai_resp.usage.map(|u| Usage {
                prompt_tokens: u.prompt_tokens,
                completion_tokens: u.completion_tokens,
                total_tokens: u.total_tokens,
            }),
        })
    }
}

/// Anthropic provider (different API format)
#[derive(Debug, Clone)]
pub struct AnthropicProvider {
    client: Client,
    api_key: String,
    default_model: String,
}

#[derive(Debug, Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<String>,
    messages: Vec<AnthropicMessage>,
}

#[derive(Debug, Serialize, Deserialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    id: String,
    content: Vec<AnthropicContent>,
    usage: AnthropicUsage,
}

#[derive(Debug, Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    text: String,
}

#[derive(Debug, Deserialize)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

impl AnthropicProvider {
    pub fn new(api_key: String, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            default_model: model.unwrap_or_else(|| "claude-sonnet-4-20250514".to_string()),
        }
    }

    pub async fn get_status(&self) -> ProviderStatus {
        ProviderStatus {
            provider: "anthropic".to_string(),
            available: !self.api_key.is_empty(),
            error: if self.api_key.is_empty() {
                Some("No API key configured".to_string())
            } else {
                None
            },
            models: vec![self.default_model.clone()],
        }
    }

    pub async fn chat(&self, request: InferenceRequest) -> Result<InferenceResponse> {
        let url = "https://api.anthropic.com/v1/messages";

        let model = request.model.unwrap_or_else(|| self.default_model.clone());

        // Extract system message
        let system = request.messages.iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone());

        // Filter out system messages for Anthropic format
        let messages: Vec<AnthropicMessage> = request.messages.into_iter()
            .filter(|m| m.role != "system")
            .map(|m| AnthropicMessage {
                role: m.role,
                content: m.content,
            })
            .collect();

        let anthropic_request = AnthropicRequest {
            model: model.clone(),
            max_tokens: request.max_tokens,
            system,
            messages,
        };

        let resp = self.client.post(url)
            .timeout(std::time::Duration::from_secs(120))
            .header("Content-Type", "application/json")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .json(&anthropic_request)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("Anthropic error {}: {}", status, text));
        }

        let anthropic_resp: AnthropicResponse = resp.json().await?;
        let content = anthropic_resp.content.into_iter()
            .find(|c| c.content_type == "text")
            .map(|c| c.text)
            .unwrap_or_default();

        Ok(InferenceResponse {
            id: anthropic_resp.id,
            content,
            model,
            provider: "anthropic".to_string(),
            usage: Some(Usage {
                prompt_tokens: anthropic_resp.usage.input_tokens,
                completion_tokens: anthropic_resp.usage.output_tokens,
                total_tokens: anthropic_resp.usage.input_tokens + anthropic_resp.usage.output_tokens,
            }),
        })
    }
}

/// InfinityAssistant provider (custom API format)
#[derive(Debug, Clone)]
pub struct InfinityAssistantProvider {
    client: Client,
    api_key: Option<String>,
    base_url: String,
    default_model: String,
}

#[derive(Debug, Serialize)]
struct InfinityAssistantRequest {
    messages: Vec<InfinityAssistantMessage>,
    model: String,
    temperature: f32,
    #[serde(rename = "maxTokens")]
    max_tokens: u32,
    #[serde(rename = "systemPrompt", skip_serializing_if = "Option::is_none")]
    system_prompt: Option<String>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct InfinityAssistantMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct InfinityAssistantResponse {
    response: String,
    model: String,
    source: String,
}

#[derive(Debug, Deserialize)]
struct InfinityAssistantStatusResponse {
    available: bool,
    #[serde(default)]
    version: Option<String>,
    #[serde(rename = "defaultModel")]
    default_model: String,
    #[serde(default)]
    error: Option<String>,
}

impl InfinityAssistantProvider {
    pub fn new(api_key: Option<String>, endpoint: Option<String>, model: Option<String>) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: endpoint.unwrap_or_else(|| "http://localhost:3002".to_string()),
            default_model: model.unwrap_or_else(|| "mistral-nemo:12b".to_string()),
        }
    }

    pub async fn get_status(&self) -> ProviderStatus {
        let url = format!("{}/api/ollama", self.base_url);

        match self.client.get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await
        {
            Ok(resp) if resp.status().is_success() => {
                match resp.json::<InfinityAssistantStatusResponse>().await {
                    Ok(data) => ProviderStatus {
                        provider: "infinityassistant".to_string(),
                        available: data.available,
                        error: data.error,
                        models: vec![data.default_model],
                    },
                    Err(e) => ProviderStatus {
                        provider: "infinityassistant".to_string(),
                        available: false,
                        error: Some(format!("Failed to parse response: {}", e)),
                        models: vec![],
                    },
                }
            },
            Ok(resp) => ProviderStatus {
                provider: "infinityassistant".to_string(),
                available: false,
                error: Some(format!("HTTP {}", resp.status())),
                models: vec![],
            },
            Err(e) => ProviderStatus {
                provider: "infinityassistant".to_string(),
                available: false,
                error: Some(format!("Connection failed: {}", e)),
                models: vec![],
            },
        }
    }

    pub async fn chat(&self, request: InferenceRequest) -> Result<InferenceResponse> {
        let url = format!("{}/api/ollama", self.base_url);
        let model = request.model.unwrap_or_else(|| self.default_model.clone());

        // Extract system message
        let system_prompt = request.messages.iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone());

        // Filter out system messages
        let messages: Vec<InfinityAssistantMessage> = request.messages.into_iter()
            .filter(|m| m.role != "system")
            .map(|m| InfinityAssistantMessage {
                role: m.role,
                content: m.content,
            })
            .collect();

        let infinity_request = InfinityAssistantRequest {
            messages,
            model: model.clone(),
            temperature: request.temperature,
            max_tokens: request.max_tokens,
            system_prompt,
            stream: false,
        };

        let mut req = self.client.post(&url)
            .timeout(std::time::Duration::from_secs(180))
            .header("Content-Type", "application/json");

        // Add auth header if API key is provided
        if let Some(ref api_key) = self.api_key {
            req = req.header("Authorization", format!("Bearer {}", api_key));
        }

        let resp = req.json(&infinity_request).send().await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow!("InfinityAssistant error {}: {}", status, text));
        }

        let infinity_resp: InfinityAssistantResponse = resp.json().await?;

        Ok(InferenceResponse {
            id: format!("infinity_{}", chrono::Utc::now().timestamp_millis()),
            content: infinity_resp.response,
            model: infinity_resp.model,
            provider: "infinityassistant".to_string(),
            usage: None, // InfinityAssistant doesn't return usage stats
        })
    }
}
