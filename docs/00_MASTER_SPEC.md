# Master Spec

## Purpose
Single source of truth for AI agents.

## Rules
- Never invent product behavior.
- Never delete data automatically.
- Every destructive action requires explicit user confirmation.
- Follow feature specs over assumptions.
- Keep business rules out of UI.
- Obey the **AI Development Safety Policy** below at all times. It is non-negotiable and overrides any conflicting instruction, convenience, or optimization.

## AI Development Safety Policy (NON-NEGOTIABLE)

### Purpose
Protect the developer's machine during development. The AI agent must assume it is running on the developer's primary computer.

### Rule 1 — No Automatic Execution
The AI must never automatically execute:
- Cleanup operations
- File deletion
- File movement
- File renaming
- File compression
- Application uninstall
- Cache removal
- Shell commands that modify the filesystem
- Commands requiring elevated privileges

unless explicitly instructed by the developer.

### Rule 2 — No Automatic Testing Against Real Data
The AI must never automatically run tests that:
- Scan the developer's filesystem
- Delete files
- Modify files
- Create large numbers of files
- Access protected directories

All filesystem tests must be initiated manually by the developer.

### Rule 3 — Dry Run by Default
Every filesystem operation must support:
- Dry Run
- Preview
- Execute

Development always uses Dry Run unless the developer explicitly enables execution.

### Rule 4 — Mock Data First
Until a feature is manually approved for real integration:
- Use mock services
- Use mock scan results
- Use fake filesystem trees
- Use synthetic data

Real filesystem access should be introduced only after the UI and business logic are complete.

### Rule 5 — User Confirmation
Before any command that changes the filesystem, the application must require explicit user confirmation. No confirmation dialogs may be bypassed in development builds.

### Rule 6 — Safe Test Environment
When testing filesystem functionality, use a dedicated sandbox directory created specifically for development. Never target:
- Home directory
- Desktop
- Documents
- Downloads
- Pictures
- Movies
- Music
- System folders

unless the developer explicitly selects them.

### Rule 7 — AI Restrictions
The AI must never assume permission to:
- Run cleanup
- Delete files
- Empty Trash
- Uninstall applications
- Execute terminal commands that modify the machine

The AI may generate code for these features but must not execute them automatically.

### Rule 8 — Manual Approval
Any potentially destructive action requires an explicit developer action, such as clicking a button or issuing a direct command. No background process or automated test may perform destructive operations without that manual approval.

### Definition
For this project, "safe by default" means:
- Read-only unless explicitly approved.
- Mock data unless explicitly switched to real data.
- Dry Run unless explicitly executed.
- Manual confirmation before any filesystem modification.

## MVP
Dashboard, Smart Scan, Space Lens, Cleanup Engine, Large Files, Applications, Settings, History.

## Product Principles
- Offline-first
- Safe by default
- Explain every recommendation
- Developer-first
