-- Luman initial schema (Sprint 1).
-- Creates the five foundational tables EMPTY. No seed data, no feature logic.
-- This file is the single source of truth for the schema: the Rust side embeds
-- it via include_str! and the schema-validation test runs it against sql.js.

PRAGMA foreign_keys = ON;

-- Key/value application + user settings.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY NOT NULL,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One row per storage-analysis run. Scans are read-only.
CREATE TABLE IF NOT EXISTS scans (
  id           TEXT PRIMARY KEY NOT NULL,
  started_at   TEXT NOT NULL,
  completed_at TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
);

-- Items discovered during a scan.
CREATE TABLE IF NOT EXISTS findings (
  id             TEXT PRIMARY KEY NOT NULL,
  scan_id        TEXT NOT NULL,
  category       TEXT NOT NULL,
  path           TEXT NOT NULL,
  size           INTEGER NOT NULL DEFAULT 0,
  safe_to_delete INTEGER NOT NULL DEFAULT 0,
  safety         TEXT NOT NULL DEFAULT 'unsafe',
  plugin         TEXT NOT NULL,
  FOREIGN KEY (scan_id) REFERENCES scans (id) ON DELETE CASCADE
);

-- Record of confirmed cleanup actions. Cleanup is always explicit.
CREATE TABLE IF NOT EXISTS cleanup_history (
  id              TEXT PRIMARY KEY NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  reclaimed_bytes INTEGER NOT NULL DEFAULT 0,
  finding_ids     TEXT NOT NULL DEFAULT '[]',
  completed_at    TEXT
);

-- Installed/known plugins and their enablement.
CREATE TABLE IF NOT EXISTS plugins (
  id          TEXT PRIMARY KEY NOT NULL,
  name        TEXT NOT NULL,
  version     TEXT NOT NULL,
  kind        TEXT NOT NULL,
  enabled     INTEGER NOT NULL DEFAULT 0,
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_findings_scan_id ON findings (scan_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans (status);
