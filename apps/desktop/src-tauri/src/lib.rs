use tauri_plugin_sql::{Migration, MigrationKind};

mod permissions;
mod volumes;

/// Registers the SQLite migrations. Migration 0001 creates the five empty
/// foundation tables. The SQL is the single source of truth shared with the
/// frontend schema-validation test.
fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "initial_schema",
        sql: include_str!("../migrations/0001_initial_schema.sql"),
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:luman.db", migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            volumes::list_volumes,
            permissions::check_permission
        ])
        .run(tauri::generate_context!())
        .expect("error while running Luman");
}
