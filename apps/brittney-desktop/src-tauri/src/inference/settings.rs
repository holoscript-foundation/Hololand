//! BYOK Settings - Secure API Key Storage
//!
//! Stores user's API keys securely using Tauri's plugin-store
//! Keys are encrypted at rest on the user's machine

use serde::{Deserialize, Serialize};
use super::providers::ProviderType;

/// Provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub provider_type: ProviderType,
    pub enabled: bool,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub endpoint: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
}

/// Complete inference settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InferenceSettings {
    /// Active provider to use
    pub active_provider: ProviderType,

    /// Local (Ollama) settings
    pub local: LocalSettings,

    /// BYOK provider configurations
    pub providers: Providers,

    /// Behavior settings
    pub fallback_to_cloud: bool,
    pub prefer_local: bool,
    pub timeout_secs: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalSettings {
    pub enabled: bool,
    pub ollama_url: String,
    pub default_model: String,
    pub auto_download_model: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Providers {
    pub openai: ProviderConfig,
    pub anthropic: ProviderConfig,
    pub google: ProviderConfig,
    pub grok: ProviderConfig,
    pub azure: ProviderConfig,
    pub infinityassistant: ProviderConfig,
    pub custom: ProviderConfig,
}

impl Default for InferenceSettings {
    fn default() -> Self {
        Self {
            active_provider: ProviderType::Local,
            local: LocalSettings {
                enabled: true,
                ollama_url: "http://localhost:11434".to_string(),
                default_model: "brittney-qwen-v23:latest".to_string(),
                auto_download_model: true,
            },
            providers: Providers {
                openai: ProviderConfig {
                    provider_type: ProviderType::OpenAI,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: Some("gpt-4o-mini".to_string()),
                },
                anthropic: ProviderConfig {
                    provider_type: ProviderType::Anthropic,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: Some("claude-sonnet-4-20250514".to_string()),
                },
                google: ProviderConfig {
                    provider_type: ProviderType::Google,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: Some("gemini-2.0-flash".to_string()),
                },
                grok: ProviderConfig {
                    provider_type: ProviderType::Grok,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: Some("grok-3".to_string()),
                },
                azure: ProviderConfig {
                    provider_type: ProviderType::Azure,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: Some("gpt-4o".to_string()),
                },
                infinityassistant: ProviderConfig {
                    provider_type: ProviderType::InfinityAssistant,
                    enabled: false,
                    api_key: None,
                    endpoint: Some("http://localhost:3002".to_string()),
                    model: Some("mistral-nemo:12b".to_string()),
                },
                custom: ProviderConfig {
                    provider_type: ProviderType::Custom,
                    enabled: false,
                    api_key: None,
                    endpoint: None,
                    model: None,
                },
            },
            fallback_to_cloud: true,
            prefer_local: true,
            timeout_secs: 120,
        }
    }
}

/// Settings UI schema for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsSchema {
    pub sections: Vec<SettingsSection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsSection {
    pub id: String,
    pub title: String,
    pub description: String,
    pub fields: Vec<SettingsField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingsField {
    pub id: String,
    pub label: String,
    pub field_type: FieldType,
    #[serde(default)]
    pub placeholder: Option<String>,
    #[serde(default)]
    pub help: Option<String>,
    #[serde(default)]
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldType {
    Text,
    Password,
    Url,
    Toggle,
    Select { options: Vec<SelectOption> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelectOption {
    pub value: String,
    pub label: String,
}

/// Get the settings UI schema
pub fn get_settings_schema() -> SettingsSchema {
    SettingsSchema {
        sections: vec![
            SettingsSection {
                id: "local".to_string(),
                title: "Local AI (Free)".to_string(),
                description: "Use Ollama for free, private AI inference".to_string(),
                fields: vec![
                    SettingsField {
                        id: "local.enabled".to_string(),
                        label: "Enable Local AI".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: Some("Uses Ollama with brittney-qwen-v23 model".to_string()),
                        required: false,
                    },
                    SettingsField {
                        id: "local.ollama_url".to_string(),
                        label: "Ollama URL".to_string(),
                        field_type: FieldType::Url,
                        placeholder: Some("http://localhost:11434".to_string()),
                        help: None,
                        required: false,
                    },
                    SettingsField {
                        id: "local.auto_download_model".to_string(),
                        label: "Auto-download Brittney model".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: Some("Download brittney-qwen-v23 (7.6GB) on first use".to_string()),
                        required: false,
                    },
                ],
            },
            SettingsSection {
                id: "openai".to_string(),
                title: "OpenAI".to_string(),
                description: "Use your OpenAI API key for GPT models".to_string(),
                fields: vec![
                    SettingsField {
                        id: "providers.openai.enabled".to_string(),
                        label: "Enable OpenAI".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: None,
                        required: false,
                    },
                    SettingsField {
                        id: "providers.openai.api_key".to_string(),
                        label: "API Key".to_string(),
                        field_type: FieldType::Password,
                        placeholder: Some("sk-...".to_string()),
                        help: Some("Get your key at platform.openai.com".to_string()),
                        required: true,
                    },
                ],
            },
            SettingsSection {
                id: "anthropic".to_string(),
                title: "Anthropic".to_string(),
                description: "Use your Anthropic API key for Claude models".to_string(),
                fields: vec![
                    SettingsField {
                        id: "providers.anthropic.enabled".to_string(),
                        label: "Enable Anthropic".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: None,
                        required: false,
                    },
                    SettingsField {
                        id: "providers.anthropic.api_key".to_string(),
                        label: "API Key".to_string(),
                        field_type: FieldType::Password,
                        placeholder: Some("sk-ant-...".to_string()),
                        help: Some("Get your key at console.anthropic.com".to_string()),
                        required: true,
                    },
                ],
            },
            SettingsSection {
                id: "google".to_string(),
                title: "Google AI".to_string(),
                description: "Use your Google API key for Gemini models".to_string(),
                fields: vec![
                    SettingsField {
                        id: "providers.google.enabled".to_string(),
                        label: "Enable Google AI".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: None,
                        required: false,
                    },
                    SettingsField {
                        id: "providers.google.api_key".to_string(),
                        label: "API Key".to_string(),
                        field_type: FieldType::Password,
                        placeholder: Some("AIza...".to_string()),
                        help: Some("Get your key at aistudio.google.com".to_string()),
                        required: true,
                    },
                ],
            },
            SettingsSection {
                id: "grok".to_string(),
                title: "Grok (xAI)".to_string(),
                description: "Use your xAI API key for Grok models".to_string(),
                fields: vec![
                    SettingsField {
                        id: "providers.grok.enabled".to_string(),
                        label: "Enable Grok".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: None,
                        required: false,
                    },
                    SettingsField {
                        id: "providers.grok.api_key".to_string(),
                        label: "API Key".to_string(),
                        field_type: FieldType::Password,
                        placeholder: Some("xai-...".to_string()),
                        help: Some("Get your key at x.ai".to_string()),
                        required: true,
                    },
                ],
            },
            SettingsSection {
                id: "infinityassistant".to_string(),
                title: "Infinity Assistant".to_string(),
                description: "Connect to InfinityAssistant.io cloud service".to_string(),
                fields: vec![
                    SettingsField {
                        id: "providers.infinityassistant.enabled".to_string(),
                        label: "Enable Infinity Assistant".to_string(),
                        field_type: FieldType::Toggle,
                        placeholder: None,
                        help: Some("No API key required for local development".to_string()),
                        required: false,
                    },
                    SettingsField {
                        id: "providers.infinityassistant.endpoint".to_string(),
                        label: "Endpoint URL".to_string(),
                        field_type: FieldType::Url,
                        placeholder: Some("http://localhost:3002".to_string()),
                        help: Some("Local dev: localhost:3002, Production: infinityassistant.io".to_string()),
                        required: false,
                    },
                    SettingsField {
                        id: "providers.infinityassistant.api_key".to_string(),
                        label: "API Key (Optional)".to_string(),
                        field_type: FieldType::Password,
                        placeholder: Some("infinity-...".to_string()),
                        help: Some("Optional for local, required for production".to_string()),
                        required: false,
                    },
                ],
            },
        ],
    }
}
