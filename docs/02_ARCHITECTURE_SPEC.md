# Architecture Spec

## Modules
- UI
- Application
- Domain
- Infrastructure
- Plugin SDK

## Ownership
UI renders only.
Application orchestrates.
Domain contains business rules.
Infrastructure performs filesystem operations.

## Events
ScanRequested -> ScanCompleted -> ResultsAvailable -> CleanupRequested -> CleanupCompleted
