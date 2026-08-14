//! Volume capacity reporting.
//!
//! **Read-only, and structurally so.** This module reports capacity statistics
//! and nothing else: it never enumerates a directory, opens a file, or touches
//! a path. There is no `remove_*`, `rename`, or `write` anywhere in it, and
//! there must never be — a capacity reader that grew traversal would become a
//! scanner without review.
//!
//! Real reporting is gated behind `LUMAN_REAL_VOLUMES`, off by default. The
//! flag is read **here, in Rust**, via `std::env::var`. It cannot be read from
//! TypeScript: `vite.config.ts` sets no `envPrefix`, so only `VITE_`-prefixed
//! variables reach `import.meta.env`, and `process.env` does not exist in the
//! renderer bundle. With the flag off this command returns an error and the
//! TypeScript side falls back to the mock service.

use serde::Serialize;
use sysinfo::Disks;

/// Environment variable that opts into real volume statistics.
const REAL_VOLUMES_FLAG: &str = "LUMAN_REAL_VOLUMES";

/// Raw capacity figures for one mounted volume.
///
/// Deliberately raw: no derived `usedBytes`, no health, no classification. The
/// mapping onto `StorageOverview` is a pure TypeScript function so it can be
/// unit-tested without a native bridge.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RawVolume {
    /// Stable identifier — the mount point.
    pub id: String,
    /// Display name, e.g. "Macintosh HD".
    pub name: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub is_boot_volume: bool,
}

/// Whether the real-volumes flag is switched on.
///
/// Anything other than an explicit opt-in value counts as off, so a stray
/// `LUMAN_REAL_VOLUMES=0` or an empty string does not silently enable it.
fn real_volumes_enabled() -> bool {
    match std::env::var(REAL_VOLUMES_FLAG) {
        Ok(value) => matches!(value.trim(), "1" | "true" | "TRUE" | "yes"),
        Err(_) => false,
    }
}

/// List mounted volumes with their capacity.
///
/// Returns `Err` when the flag is off — the caller treats that as "use the
/// mock", which keeps the default path free of any real disk access.
#[tauri::command]
pub fn list_volumes() -> Result<Vec<RawVolume>, String> {
    if !real_volumes_enabled() {
        return Err(format!(
            "{REAL_VOLUMES_FLAG} is not enabled; real volume statistics are off by default."
        ));
    }

    // `Disks` reads mount-point capacity only. It does not enumerate contents.
    let disks = Disks::new_with_refreshed_list();

    let volumes: Vec<RawVolume> = disks
        .list()
        .iter()
        .map(|disk| {
            let mount_point = disk.mount_point().to_string_lossy().to_string();
            let name = disk.name().to_string_lossy().to_string();
            RawVolume {
                is_boot_volume: mount_point == "/",
                name: if name.is_empty() { mount_point.clone() } else { name },
                id: mount_point,
                total_bytes: disk.total_space(),
                available_bytes: disk.available_space(),
            }
        })
        .collect();

    if volumes.is_empty() {
        return Err("No volumes could be read.".to_string());
    }

    Ok(volumes)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The flag must default to off, so a machine with nothing set never
    /// reaches real disk access.
    #[test]
    fn flag_is_off_when_unset() {
        std::env::remove_var(REAL_VOLUMES_FLAG);
        assert!(!real_volumes_enabled());
    }

    #[test]
    fn flag_is_off_for_non_optin_values() {
        for value in ["", "0", "false", "no", "maybe"] {
            std::env::set_var(REAL_VOLUMES_FLAG, value);
            assert!(!real_volumes_enabled(), "{value} should not enable the flag");
        }
        std::env::remove_var(REAL_VOLUMES_FLAG);
    }

    #[test]
    fn flag_is_on_only_for_explicit_optin() {
        for value in ["1", "true", "yes"] {
            std::env::set_var(REAL_VOLUMES_FLAG, value);
            assert!(real_volumes_enabled(), "{value} should enable the flag");
        }
        std::env::remove_var(REAL_VOLUMES_FLAG);
    }

    /// With the flag off the command must refuse rather than read anything.
    #[test]
    fn list_volumes_errors_when_flag_is_off() {
        std::env::remove_var(REAL_VOLUMES_FLAG);
        assert!(list_volumes().is_err());
    }
}
