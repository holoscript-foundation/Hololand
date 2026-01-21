// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

/// Get the path to the bundled model file
#[tauri::command]
fn get_model_path(app: tauri::AppHandle) -> Result<String, String> {
    let resource_path = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("models")
        .join("brittney-f16.gguf");
    
    Ok(resource_path.to_string_lossy().to_string())
}

/// Check if the model file exists
#[tauri::command]
fn check_model_exists(app: tauri::AppHandle) -> bool {
    if let Ok(resource_path) = app.path().resource_dir() {
        let model_path = resource_path.join("models").join("brittney-f16.gguf");
        model_path.exists()
    } else {
        false
    }
}

/// Get system info for model loading decisions
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "family": std::env::consts::FAMILY,
        // Could add GPU detection here with platform-specific code
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            get_model_path,
            check_model_exists,
            get_system_info
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
