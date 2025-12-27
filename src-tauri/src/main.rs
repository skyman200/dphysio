// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_updater::UpdaterExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .setup(|app| {
            // Check for updates on startup
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = check_for_updates(handle).await {
                    eprintln!("Failed to check for updates: {}", e);
                }
            });

            // Create system tray
            let tray_menu = tauri::menu::MenuBuilder::new(app)
                .text("open", "열기")
                .text("update", "업데이트 확인")
                .separator()
                .text("quit", "완전히 종료")
                .build()?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .tooltip("물리치료학과 대시보드")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "update" => {
                        let handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = check_for_updates(handle).await {
                                eprintln!("Failed to check for updates: {}", e);
                            }
                        });
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            // Hide window instead of closing (minimize to tray)
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn check_for_updates(app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let updater = app.updater()?;
    
    match updater.check().await {
        Ok(Some(update)) => {
            println!("Update available: {}", update.version);
            
            // Show update dialog
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.emit("update-available", update.version.clone());
            }
            
            // Download and install update
            let mut downloaded = 0;
            let _ = update
                .download_and_install(
                    |chunk_length, content_length| {
                        downloaded += chunk_length;
                        println!("Downloaded {} of {:?}", downloaded, content_length);
                    },
                    || {
                        println!("Download finished, installing...");
                    },
                )
                .await;
            
            println!("Update installed, please restart the app");
        }
        Ok(None) => {
            println!("No update available");
        }
        Err(e) => {
            eprintln!("Failed to check for updates: {}", e);
        }
    }
    
    Ok(())
}
