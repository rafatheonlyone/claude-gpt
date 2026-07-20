mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // The database must exist before the webview can issue any command.
            let state = db::init(app.handle())?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            db::db_query,
            db::db_execute,
            db::db_transaction,
            db::db_execute_batch,
            db::db_integrity_check,
            db::db_backup,
            db::app_paths,
            show_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running SYSTEM");
}

/// The window is created hidden and revealed by the frontend once the first
/// frame is ready. This avoids the white flash that would otherwise undercut
/// the deliberately dark, cinematic first impression.
#[tauri::command]
fn show_main_window(window: tauri::Window) {
    if let Some(main) = window.get_webview_window("main") {
        let _ = main.show();
        let _ = main.set_focus();
    }
}
