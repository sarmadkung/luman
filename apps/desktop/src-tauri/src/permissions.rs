//! Permission status reporting.
//!
//! **This module must never trigger a macOS permission dialog.** Prompting is a
//! real-machine side effect and a UX decision belonging to Sprint 05. The probe
//! below is a read attempt we *expect* to fail: failure is the answer, not an
//! error to surface.
//!
//! Read-only and bounded: exactly one metadata read of one representative
//! location, no directory enumeration, no recursion, no traversal.
//!
//! Gated behind `LUMAN_REAL_PERMISSIONS`, off by default, read here in Rust for
//! the same reason as `LUMAN_REAL_VOLUMES` — see `volumes.rs`.

use serde::Serialize;

const REAL_PERMISSIONS_FLAG: &str = "LUMAN_REAL_PERMISSIONS";

/// Mirrors `PermissionStatus` in `@luman/domain`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum PermissionStatus {
    Granted,
    Denied,
    NotDetermined,
    Unknown,
}

/// Whether the real-permissions flag is switched on.
fn real_permissions_enabled() -> bool {
    match std::env::var(REAL_PERMISSIONS_FLAG) {
        Ok(value) => matches!(value.trim(), "1" | "true" | "TRUE" | "yes"),
        Err(_) => false,
    }
}

/// The representative location whose readability stands in for Full Disk Access.
///
/// `~/Library/Application Support/com.apple.TCC` is unreadable without Full Disk
/// Access and readable with it, which makes it the conventional probe. We only
/// ever ask for its metadata — never its contents.
fn probe_path() -> Option<std::path::PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(std::path::PathBuf::from(home).join("Library/Application Support/com.apple.TCC"))
}

/// Probe readability of one protected location.
///
/// Uses `symlink_metadata`, which reads the directory entry itself and does not
/// follow links or list children. An `EPERM`/`EACCES` is mapped to `Denied`
/// rather than escaping as an exception — a refusal is a normal outcome here.
fn probe() -> PermissionStatus {
    let Some(path) = probe_path() else {
        return PermissionStatus::Unknown;
    };

    match std::fs::symlink_metadata(&path) {
        Ok(_) => PermissionStatus::Granted,
        Err(error) => match error.kind() {
            std::io::ErrorKind::PermissionDenied => PermissionStatus::Denied,
            // The location is absent on this machine; nothing was refused.
            std::io::ErrorKind::NotFound => PermissionStatus::NotDetermined,
            _ => PermissionStatus::Unknown,
        },
    }
}

/// Report permission status.
///
/// Never prompts. With the flag off it returns `Err`, and the TypeScript side
/// falls back to the mock — so the default path performs no probe at all.
///
/// The error string deliberately carries no path: a protected location must
/// never be logged (INF-006 requirement).
#[tauri::command]
pub fn check_permission() -> Result<PermissionStatus, String> {
    if !real_permissions_enabled() {
        return Err(format!(
            "{REAL_PERMISSIONS_FLAG} is not enabled; real permission checks are off by default."
        ));
    }
    Ok(probe())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn flag_is_off_when_unset() {
        std::env::remove_var(REAL_PERMISSIONS_FLAG);
        assert!(!real_permissions_enabled());
    }

    #[test]
    fn flag_is_off_for_non_optin_values() {
        for value in ["", "0", "false", "no"] {
            std::env::set_var(REAL_PERMISSIONS_FLAG, value);
            assert!(!real_permissions_enabled(), "{value} should not enable the flag");
        }
        std::env::remove_var(REAL_PERMISSIONS_FLAG);
    }

    /// With the flag off the command must refuse before probing anything.
    #[test]
    fn check_permission_errors_when_flag_is_off() {
        std::env::remove_var(REAL_PERMISSIONS_FLAG);
        assert!(check_permission().is_err());
    }

    /// The refusal must not name a protected location.
    #[test]
    fn flag_off_error_leaks_no_path() {
        std::env::remove_var(REAL_PERMISSIONS_FLAG);
        let message = check_permission().unwrap_err();
        assert!(!message.contains('/'), "error must not contain a path: {message}");
    }
}
