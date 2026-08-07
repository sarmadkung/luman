# Dashboard Feature

## Purpose
Home screen showing storage health and entry points.

## Widgets
- Storage Overview
- Recoverable Space
- Quick Actions
- Recommendations
- Recent Activity

## Quick Actions
- Smart Scan
- Space Lens
- Applications
- Settings

## States
Loading
No Scan
Ready
Scanning
Permission Required
Error

## Business Rules
- Never starts cleanup automatically.
- Uses latest completed scan.
- Read-only.

## Acceptance Criteria
- Opens without previous scans.
- Handles missing permissions.
- Opens Smart Scan.
- Opens Space Lens.
- Never freezes during scanning.

## Out of Scope
Charts
AI summaries
Marketplace
