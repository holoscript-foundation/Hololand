// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod inference;

use inference::{
    ChatMessage, InferenceRequest, InferenceResponse, ProviderStatus,
    ollama::OllamaClient,
    providers::{OpenAICompatibleProvider, AnthropicProvider, InfinityAssistantProvider, ProviderType},
    settings::{InferenceSettings, get_settings_schema, SettingsSchema},
    HOLOSCRIPT_SYSTEM_PROMPT, select_model_for_task,
};
use tauri::Manager;
use std::sync::Mutex;

/// Global state for inference client
struct AppState {
    ollama: OllamaClient,
    settings: Mutex<InferenceSettings>,
}

// =============================================================================
// INFERENCE COMMANDS
// =============================================================================

/// Check inference status (Ollama + configured providers)
#[tauri::command]
async fn check_inference_status(state: tauri::State<'_, AppState>) -> Result<Vec<ProviderStatus>, String> {
    let mut statuses = vec![];

    // Check Ollama
    statuses.push(state.ollama.get_status().await);

    // Check configured BYOK providers
    let settings = state.settings.lock().map_err(|e| e.to_string())?;

    if settings.providers.openai.enabled && settings.providers.openai.api_key.is_some() {
        statuses.push(ProviderStatus {
            provider: "openai".to_string(),
            available: true,
            error: None,
            models: vec!["gpt-4o-mini".to_string(), "gpt-4o".to_string()],
        });
    }

    if settings.providers.anthropic.enabled && settings.providers.anthropic.api_key.is_some() {
        statuses.push(ProviderStatus {
            provider: "anthropic".to_string(),
            available: true,
            error: None,
            models: vec!["claude-sonnet-4-20250514".to_string()],
        });
    }

    if settings.providers.google.enabled && settings.providers.google.api_key.is_some() {
        statuses.push(ProviderStatus {
            provider: "google".to_string(),
            available: true,
            error: None,
            models: vec!["gemini-2.0-flash".to_string()],
        });
    }

    if settings.providers.grok.enabled && settings.providers.grok.api_key.is_some() {
        statuses.push(ProviderStatus {
            provider: "grok".to_string(),
            available: true,
            error: None,
            models: vec!["grok-3".to_string()],
        });
    }

    // InfinityAssistant doesn't require API key - check if enabled and endpoint is configured
    if settings.providers.infinityassistant.enabled {
        let provider = InfinityAssistantProvider::new(
            settings.providers.infinityassistant.api_key.clone(),
            settings.providers.infinityassistant.endpoint.clone(),
            settings.providers.infinityassistant.model.clone(),
        );
        statuses.push(provider.get_status().await);
    }

    Ok(statuses)
}

/// Chat with AI (auto-selects best provider)
#[tauri::command]
async fn chat(
    state: tauri::State<'_, AppState>,
    messages: Vec<ChatMessage>,
    model: Option<String>,
) -> Result<InferenceResponse, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;

    // Build request
    let request = InferenceRequest {
        messages,
        model,
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
    };

    // Try local first if preferred
    if settings.prefer_local && settings.local.enabled {
        if state.ollama.health().await {
            return state.ollama.chat(request).await.map_err(|e| e.to_string());
        }
    }

    // Try configured cloud providers
    if settings.providers.openai.enabled {
        if let Some(api_key) = &settings.providers.openai.api_key {
            let provider = OpenAICompatibleProvider::openai(
                api_key.clone(),
                settings.providers.openai.model.clone(),
            );
            return provider.chat(request).await.map_err(|e| e.to_string());
        }
    }

    if settings.providers.anthropic.enabled {
        if let Some(api_key) = &settings.providers.anthropic.api_key {
            let provider = AnthropicProvider::new(
                api_key.clone(),
                settings.providers.anthropic.model.clone(),
            );
            return provider.chat(request).await.map_err(|e| e.to_string());
        }
    }

    if settings.providers.grok.enabled {
        if let Some(api_key) = &settings.providers.grok.api_key {
            let provider = OpenAICompatibleProvider::grok(
                api_key.clone(),
                settings.providers.grok.model.clone(),
            );
            return provider.chat(request).await.map_err(|e| e.to_string());
        }
    }

    if settings.providers.google.enabled {
        if let Some(api_key) = &settings.providers.google.api_key {
            let provider = OpenAICompatibleProvider::google(
                api_key.clone(),
                settings.providers.google.model.clone(),
            );
            return provider.chat(request).await.map_err(|e| e.to_string());
        }
    }

    // InfinityAssistant doesn't require API key
    if settings.providers.infinityassistant.enabled {
        let provider = InfinityAssistantProvider::new(
            settings.providers.infinityassistant.api_key.clone(),
            settings.providers.infinityassistant.endpoint.clone(),
            settings.providers.infinityassistant.model.clone(),
        );
        return provider.chat(request).await.map_err(|e| e.to_string());
    }

    Err("No AI providers available. Enable local Ollama or configure a BYOK cloud provider.".to_string())
}

/// Generate HoloScript code
#[tauri::command]
async fn generate_holoscript(
    state: tauri::State<'_, AppState>,
    description: String,
) -> Result<InferenceResponse, String> {
    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: HOLOSCRIPT_SYSTEM_PROMPT.to_string(),
        },
        ChatMessage {
            role: "user".to_string(),
            content: format!("Generate HoloScript for: {}", description),
        },
    ];

    // Select optimal model for HoloScript
    let model = select_model_for_task(&description, true);

    chat(state, messages, Some(model.to_string())).await
}

// =============================================================================
// SETTINGS COMMANDS
// =============================================================================

/// Get current settings
#[tauri::command]
fn get_settings(state: tauri::State<'_, AppState>) -> Result<InferenceSettings, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

/// Update settings
#[tauri::command]
fn update_settings(
    state: tauri::State<'_, AppState>,
    new_settings: InferenceSettings,
) -> Result<(), String> {
    let mut settings = state.settings.lock().map_err(|e| e.to_string())?;
    *settings = new_settings;
    Ok(())
}

/// Get settings UI schema
#[tauri::command]
fn get_settings_ui_schema() -> SettingsSchema {
    get_settings_schema()
}

// =============================================================================
// MODEL COMMANDS
// =============================================================================

/// Check if Brittney model is downloaded
#[tauri::command]
async fn check_model_downloaded(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(state.ollama.has_model(&settings.local.default_model).await)
}

/// Download Brittney model
#[tauri::command]
async fn download_model(
    state: tauri::State<'_, AppState>,
    model: Option<String>,
) -> Result<(), String> {
    let model_name = model.unwrap_or_else(|| "brittney-v4-expert:latest".to_string());
    state.ollama.pull_model(&model_name).await.map_err(|e| e.to_string())
}

/// Get the path to the bundled model file (for embedded mode)
#[tauri::command]
fn get_model_path(app: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("models")
        .join("brittney-v4-expert.gguf");

    Ok(resource_path.to_string_lossy().to_string())
}

/// Get system info for model loading decisions
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY,
    })
}

// =============================================================================
// MAIN
// =============================================================================

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(AppState {
            ollama: OllamaClient::default(),
            settings: Mutex::new(InferenceSettings::default()),
        })
        .invoke_handler(tauri::generate_handler![
            // Inference
            check_inference_status,
            chat,
            generate_holoscript,
            // Settings
            get_settings,
            update_settings,
            get_settings_ui_schema,
            // Model
            check_model_downloaded,
            download_model,
            get_model_path,
            get_system_info,
        ])
        .setup(|app| {
            // Create tray icon
            #[cfg(desktop)]
            {
                let _tray = app.tray_by_id("main");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Brittney AI");
}
