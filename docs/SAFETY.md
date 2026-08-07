# Safety rules (non-negotiable)

These are enforced by design and must never be weakened.

1. **Scans are read-only.** A scanner never receives a delete capability
   (`ScannerPlugin` has no cleanup method; `ScanContext` exposes no fs writes).
2. **Cleanup is always explicit and confirmed.** `CleanupService.requestCleanup`
   requires `confirmed: true`; `CleanContext.confirmedByUser` is `true` by type.
3. **AI never performs destructive actions.** Analyzers are read-only and only
   produce explainable recommendations.
4. **Nothing is deleted automatically.** No code path triggers cleanup without a
   user action.

Safe vs unsafe defaults (see `../docs/05_BUSINESS_RULES.md`):

- Safe: caches, logs, temporary files.
- Unsafe: Downloads, user documents, photos.
- Always require confirmation: application uninstall, file deletion.
