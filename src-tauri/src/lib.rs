use std::fs;
use std::path::PathBuf;
use std::env;
use serde_json::Value;
use tauri::{AppHandle, Manager};

/// Get the path to questions.json
/// In development: writes directly to src/data/questions.json
/// In production: uses app data directory
fn get_questions_path(app: &AppHandle) -> Result<PathBuf, String> {
    // Check if we're in development mode by looking for src/data relative to current dir
    // or by checking the TAURI_DEV environment variable
    let current_dir = env::current_dir()
        .map_err(|e| format!("Failed to get current dir: {}", e))?;

    // Try to find src/data/questions.json relative to current directory
    let dev_path = current_dir.join("src").join("data").join("questions.json");

    if dev_path.exists() {
        // Development mode - write directly to source
        return Ok(dev_path);
    }

    // Also check parent directory (in case running from src-tauri)
    let parent_dev_path = current_dir.parent()
        .map(|p| p.join("src").join("data").join("questions.json"));

    if let Some(path) = parent_dev_path {
        if path.exists() {
            return Ok(path);
        }
    }

    // Production mode - use app data directory
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    if !app_data_dir.exists() {
        fs::create_dir_all(&app_data_dir)
            .map_err(|e| format!("Failed to create app data dir: {}", e))?;
    }

    Ok(app_data_dir.join("questions.json"))
}

/// Initialize questions.json if needed (only for production mode)
fn init_questions(app: &AppHandle) -> Result<(), String> {
    let questions_path = get_questions_path(app)?;

    // If questions.json already exists, we're done
    if questions_path.exists() {
        return Ok(());
    }

    // Try to copy from bundled resources (production only)
    let resource_path = app.path().resource_dir()
        .map_err(|e| format!("Failed to get resource dir: {}", e))?
        .join("data")
        .join("questions.json");

    if resource_path.exists() {
        fs::copy(&resource_path, &questions_path)
            .map_err(|e| format!("Failed to copy questions from resources: {}", e))?;
        return Ok(());
    }

    // Fallback: Create empty questions structure
    let empty_questions = r#"{
        "questions": [],
        "version": "1.0.0",
        "lastUpdated": ""
    }"#;

    fs::write(&questions_path, empty_questions)
        .map_err(|e| format!("Failed to create empty questions file: {}", e))?;

    Ok(())
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_questions(app: AppHandle, questions_json: String) -> Result<String, String> {
    let questions_path = get_questions_path(&app)?;

    // Parse and validate JSON
    let parsed: Value = serde_json::from_str(&questions_json)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Write to file with pretty formatting
    let pretty_json = serde_json::to_string_pretty(&parsed)
        .map_err(|e| format!("Failed to format JSON: {}", e))?;

    fs::write(&questions_path, pretty_json)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(format!("Questions saved successfully to {:?}", questions_path))
}

#[tauri::command]
fn read_questions(app: AppHandle) -> Result<String, String> {
    // Ensure questions file exists
    init_questions(&app)?;

    let questions_path = get_questions_path(&app)?;

    fs::read_to_string(&questions_path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize questions on app startup
            if let Err(e) = init_questions(app.handle()) {
                eprintln!("Warning: Failed to initialize questions: {}", e);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, save_questions, read_questions])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
