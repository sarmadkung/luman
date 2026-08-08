# Luman Visual Redesign — Design Spec

**Date:** 2026-08-09
**Status:** Approved for planning
**Source:** Stitch-generated `Luman Dashboard` HTML mockup

## Purpose

Adopt the Stitch mockup's visual language (green accent, aurora-lit dark surface,
frosted glass, hero-led dashboard) across the application, expressed entirely in
the existing `@luman/ui` token system.

The mockup is a *visual reference*, not an artifact to port. It ships Tailwind via
CDN, Material Symbols via CDN, Inter via Google Fonts, a remotely-hosted hero
image, and hardcoded hex values throughout — all of which are rejected here. Every
one of those is a network fetch that fails in a packaged offline Tauri app, and
hardcoded values contradict `docs/design-system/18_UI_IMPLEMENTATION_RULES.md`.

## Decisions

| Question | Decision |
|---|---|
| Scope | Full visual redesign, app-wide |
| Themes | Keep light + dark. Dark matches the mockup; light gets a derived equivalent |
| Dashboard content | Adopt the mockup's layout; extend services with the data it needs |
| Styling | Translate to existing CSS custom-property tokens. No Tailwind |
| Hero visual | Token-driven inline SVG + CSS orb. No raster asset |
| Structure | Tokens-first, bottom-up: `@luman/ui` → shell → Dashboard |
| Glass on cards | Allowed. `Glass.tsx` and `docs/design-system/09` are amended to match |
| Icons | Lucide (already a dependency), per `docs/design-system/14` |
| Typography | Keep the `-apple-system` / SF Pro stack. Mockup *sizes* carry over |

## Non-goals

- Real storage introspection. Services stay mock-backed; only their contracts grow.
- A working search feature. The header search is presentational only (see below).
- Content for the new Cleanup and Developer Center pages beyond placeholders.
- Migrating any styling to Tailwind, now or later.

---

## Section 1 — Design foundations (`@luman/ui`)

### Color

The mockup's `#34c759` is macOS system green. It measures ~2.3:1 on white, so it
cannot serve as the light-mode accent for text or borders. The accent is therefore
theme-split; the dark value is the mockup's exact value.

| Token | Light | Dark |
|---|---|---|
| `--color-accent` | `#0f7a35` | `#34c759` |
| `--color-accent-hover` | `#0c6329` | `#5ed77c` |
| `--color-accent-soft` | `rgba(15, 122, 53, 0.12)` | `rgba(52, 199, 89, 0.18)` |
| `--color-bg` | `#f4f8f5` | `#021c0d` |
| `--color-bg-elevated` | `#ffffff` | `#04240f` |
| `--color-sidebar` | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.03)` |

`--color-success` currently equals the new accent closely enough to be
indistinguishable. Success shifts toward a cooler green (`#1a8f4c` light /
`#4ade80` dark) so "primary action" and "healthy" remain separable; where they
still risk collision, iconography carries the distinction, not color alone.

A new `--glass-blur-chrome: 64px` token carries the mockup's shell blur. The
existing `--glass-blur: 20px` is unchanged and is what content cards use, so text
over them stays crisp.

### Aurora

`Aurora` today renders static blobs at 5–8% opacity, and
`docs/design-system/10_AURORA_SYSTEM.md` mandates that range. The mockup runs
three blobs at 40–60% opacity, 120px blur, drifting on 20–30s alternating
animations.

- **Dark:** adopt the mockup's treatment — three blobs (mint, amber, deep green),
  high opacity, 120px blur, drift animation.
- **Light:** same blob geometry and animation over the light base, at low opacity,
  so the light theme reads as the same product.
- `prefers-reduced-motion: reduce` freezes all drift; blobs render static.
- The aurora is `aria-hidden` and `pointer-events: none` (already true today).
- `docs/design-system/10_AURORA_SYSTEM.md` is rewritten to describe the new
  opacity ranges and the motion rule.

### Glass

`Glass` gains a `variant` prop:

- `variant="chrome"` (default, current behavior) — sidebar, header, dialogs,
  popovers, toasts. Heavy blur.
- `variant="surface"` — content cards. `rgba(255,255,255,0.04)` fill, hairline
  `rgba(255,255,255,0.08)` border, `0 8px 32px rgba(0,0,0,0.15)` shadow, and the
  lighter card blur.

`Glass.tsx`'s docblock and `docs/design-system/09_GLASS_SYSTEM.md` are rewritten
to permit glass on content cards, replacing the current prohibition. `Card`,
`DashboardCard`, and `Panel` route their surface through the `surface` variant so
this is one change, not a per-component one.

**Contrast is verified, not assumed.** Because body text now sits over a blurred
aurora rather than a flat surface, the worst-case composite (text over the
brightest blob region, both themes) must be measured against WCAG AA (4.5:1 body,
3:1 large text) before the redesign is considered done. If a region fails, the
card fill opacity rises until it passes. This is an acceptance criterion, not a
review note.

### Typography

The mockup loads Inter from Google Fonts. Keeping the existing
`-apple-system` / SF Pro stack instead: it is the native macOS choice, matches
`docs/design-system/01_DESIGN_PHILOSOPHY.md`, and needs no network.

Mockup sizes carry over as tokens:

- `--font-size-hero: 44px` (new) — hero headline, `--letter-spacing-tight`
- `--font-size-hero-sub: 22px` (new) — hero subhead
- Metric values reuse the existing `--font-size-metric: 40px`

### Layout dimensions

- `--sidebar-width`: 220px → 240px
- `--header-height`: 52px → 56px
- `--content-max-width: 1200px` (new)

---

## Section 2 — App shell

### Sidebar

Adopts the mockup's branded header: a rounded logo tile, "Luman" as the wordmark,
and "Storage Intelligence" as a caption beneath. Settings pins to the bottom above
a hairline divider.

Navigation becomes, in order:

| Item | Path | Status |
|---|---|---|
| Dashboard | `/` | exists |
| Smart Scan | `/smart-scan` | exists |
| Cleanup | `/cleanup` | **new placeholder page** |
| Space Lens | `/space-lens` | exists |
| Applications | `/applications` | exists (page already a placeholder) |
| Developer Center | `/developer-center` | **new placeholder page** |
| History | `/history` | exists |
| *(bottom group)* Playground | `/playground` | exists, moves to bottom |
| *(bottom group)* Settings | `/settings` | exists, moves to bottom |

Playground is retained against the mockup because it is the visual-regression
surface for `@luman/ui`; it simply moves out of the primary group. New placeholder
pages follow the existing `LargeFilesPage` pattern exactly.

Collapse behavior, the `aria-label="Primary"` nav landmark, and roving arrow-key
navigation are all preserved. When collapsed, the brand caption hides with the
labels.

### Header

Grows to the mockup's composition: page title, search field, primary "Quick
Action" button, and an icon-button cluster.

- **Title + breadcrumb are kept.** The mockup has no page-title affordance at all;
  removing it would cost wayfinding the app currently has. The title sits at the
  header's left, breadcrumb beneath it, search to its right.
- **Search is presentational.** It renders disabled with a "Search is coming soon"
  tooltip. Shipping an enabled text box that silently does nothing is worse than
  showing it as not-yet-available.
- **"Quick Action" is a popover menu**, not a single button. It lists the existing
  `QUICK_ACTIONS` entries (Smart Scan, Space Lens, Large Files, Applications,
  Settings) using the existing `Popover` component. This preserves the mockup's
  single-button appearance while keeping `/large-files` reachable — it has no
  sidebar entry in the new nav, and would otherwise be URL-only.
- **Icon cluster:** theme toggle (moved from `Toolbar`) and a settings shortcut.
  The mockup's account icon is omitted; the app has no account concept.

### Toolbar and StatusBar

- **`Toolbar` is deleted.** It exists solely to host the theme toggle, which moves
  into the header's icon cluster. `Toolbar.tsx`, `Toolbar.css`, its export, and
  `--toolbar-height` all go.
- **`StatusBar` is kept.** The mockup has no equivalent, but it is the only
  always-visible signal that the app initialized, and it is load-bearing for the
  "Never freezes during scanning" acceptance criterion in
  `docs/features/01_dashboard.md`. It is restyled to the new palette.

---

## Section 3 — Dashboard

### Layout

Three bands, matching the mockup:

1. **Hero** — headline, subhead, primary Smart Scan button; storage orb at right.
2. **Metrics row** — two equal cards: Storage Used, Health.
3. **Bento grid** — Storage Breakdown (2 columns) + Recommendations (1 column),
   then Recent Activity spanning all 3.

Below the `lg` breakpoint the bento collapses to one column and the hero stacks
with the orb above the copy, per the mockup's own responsive classes.

### Hero

The mockup's hero copy is hardcoded. Here it derives from live data:

| Health band | Headline | Subhead |
|---|---|---|
| ≥ 80 | "Storage is healthy" | "Your Mac is optimized. {reclaimable} can be safely reclaimed." |
| 60–79 | "Storage needs attention" | "{reclaimable} can be reclaimed. A Smart Scan will find more." |
| < 60 | "Storage is running low" | "Only {free} free. Reclaim {reclaimable} now." |
| no scan yet | "Ready when you are" | "Run a Smart Scan to see what you can safely reclaim." |
| error | "Storage status unavailable" | "We couldn't read your storage. Try again." |

The Smart Scan button routes to `/smart-scan`. It **never** starts a scan or a
cleanup from the dashboard — `docs/features/01_dashboard.md` makes the dashboard
read-only and that rule is unchanged.

### Storage orb

Inline SVG plus CSS, in `@luman/ui` as `StorageOrb`:

- Concentric rings with a radial accent-colored glow, built from
  `--color-accent`, `--aurora-mint`, and `--color-bg-elevated`. No hardcoded hex.
- Themes correctly in both light and dark because it references tokens only.
- A slow rotation on the outer ring, disabled under `prefers-reduced-motion`.
- `aria-hidden="true"` — it is decorative and conveys nothing the copy doesn't.

### Cards

| Card | Data source | Notes |
|---|---|---|
| Storage Used | `storage.getOverview()` | used / total, segmented progress bar. Reuses `ProgressBar` |
| Health | `computeHealthScore(overview)` | score + one-line description |
| Storage Breakdown | `storage.getBreakdown()` (**new**) | category rows with color dot, label, size |
| Recommendations | `recommendations.getRecommendations()` | existing widget, restyled |
| Recent Activity | `history.getActivitySummary()` | existing widget, restyled |

Every card keeps the existing `StateView` loading / empty / error / success
handling. The mockup shows only the success state; the other three are
non-negotiable and already exist in each widget.

### Widget disposition

- `StorageOverviewWidget` → splits into `StorageUsedWidget` (metrics row) and
  `StorageBreakdownWidget` (bento).
- `RecoverableSpaceWidget` → **removed as a card**; its number is the hero subhead
  and its Smart Scan CTA is the hero button. No data is lost.
- `QuickActionsWidget` → **removed**; becomes the header's Quick Action popover.
  `quick-actions.ts` survives as the popover's data source, with its placeholder
  glyph icons (`◎`, `◔`, `⬒`, `▦`, `⚙`) replaced by Lucide icons.
- `SystemStatusWidget` → **moves to `SettingsPage`** as a "System" section. It is
  diagnostics, not a storage insight, and the mockup has no place for it.
- `HealthWidget` → **new**.

---

## Section 4 — Service extensions

Two additions, both mock-backed, both matching the existing read-only contract
style in `packages/core/src/services/`.

### Storage breakdown

```ts
// packages/core/src/services/types.ts
export interface StorageCategory {
  readonly key: string;      // 'system' | 'apps' | 'documents' | ...
  readonly label: string;
  readonly bytes: number;
}

// packages/core/src/services/storage-service.ts
export interface StorageService {
  getOverview(): Promise<StorageOverview | null>;
  /** Per-category usage, or null when unknown (no scan / no data). */
  getBreakdown(): Promise<readonly StorageCategory[] | null>;
}
```

`StubStorageService` returns `null` (Sprint 1 behavior — "No Scan").
`MockStorageService` returns realistic categories that **sum to
`DEFAULT_OVERVIEW.usedBytes`**, so the breakdown and the Storage Used card cannot
contradict each other on screen. A unit test asserts that invariant.

Category → color mapping is token-driven (`--color-accent`, `--aurora-purple`,
`--aurora-blue`, `--color-warning`, `--color-text-muted`), not the mockup's
literal `bg-blue-400` / `bg-purple-400` / `bg-green-400`.

### Health score

A pure function in `@luman/domain`, so it is a business rule with tests rather
than view logic:

```ts
// packages/domain/src/models/health.ts
export interface StorageHealth {
  readonly score: number;                        // 0–100
  readonly band: 'healthy' | 'attention' | 'low';
  readonly description: string;
}
export function computeHealthScore(o: StorageOverview): StorageHealth;
```

Derivation, fixed here so it is testable without further decisions:

```
freeRatio        = freeBytes / totalBytes
reclaimableRatio = reclaimableBytes / totalBytes
raw              = (freeRatio * 100 * 0.8) + ((1 - reclaimableRatio) * 100 * 0.2)
score            = clamp(round(raw), 0, 100)
```

Free space dominates because it is what actually constrains the user;
reclaimable clutter penalizes the score mildly. `totalBytes <= 0` returns
`{ score: 0, band: 'low' }` rather than dividing by zero. Bands at ≥80 / 60–79 /
<60, matching the hero table above. Unit-tested at every band boundary.

The mockup's "98%" and "All sectors operating normally" are illustrative. The
description string comes from the band, and never claims hardware-level health
the app cannot observe — "All sectors operating normally" specifically is not
used, because Luman does not read SMART data.

---

## Section 5 — Testing

Existing tests that **will** break and must be updated, not deleted:

- `apps/desktop/src/pages/DashboardPage.test.tsx` — asserts "Quick Actions" and
  "System Status" headings that move off the page.
- `apps/desktop/e2e/dashboard.spec.ts` — same headings, plus a quick-action click
  that becomes a popover interaction.
- `apps/desktop/e2e/navigation.spec.ts` — nav list changes; new destinations added.

New coverage:

- `computeHealthScore` — unit tests at every band boundary and on degenerate input
  (zero total bytes must not divide by zero).
- `MockStorageService.getBreakdown` — categories sum to `usedBytes`.
- `StorageBreakdownWidget`, `HealthWidget`, `HeroBanner` — loading / empty / error
  / success for each.
- Header Quick Action popover — opens, lists actions, routes to `/large-files`.
- Sidebar — new items render and route; collapsed state hides the brand caption.
- `SettingsPage` — System section renders the relocated status rows.

Visual verification:

- Every new `@luman/ui` component is added to `PlaygroundPage`, which serves as
  the regression surface for the token change across all existing components.
- Contrast measured in both themes against the acceptance criterion in Section 1.
- `prefers-reduced-motion` verified: aurora drift and orb rotation both stop.

`pnpm ci` (lint, format check, typecheck, unit + integration tests, build) must
pass before the work is considered complete.

---

## Files affected

**`packages/ui`** — `styles/tokens.css`, `components/Aurora.{tsx,css}`,
`components/Glass.{tsx,css}`, `components/Card.css`, `components/DashboardCard.css`,
`components/Panel.css`, new `components/StorageOrb.{tsx,css}`, new
`components/HeroBanner.{tsx,css}`, new `components/MetricCard.{tsx,css}`, new
`components/BreakdownList.{tsx,css}`, `index.ts`.

**`packages/core`** — `services/types.ts`, `services/storage-service.ts`.

**`packages/domain`** — new `models/health.ts` + test, `index.ts`.

**`apps/desktop`** — `components/layout/` (Sidebar, Header, AppLayout, StatusBar
restyle; Toolbar deleted), `components/dashboard/` (widget split described in
Section 3), `pages/DashboardPage.tsx`, `pages/SettingsPage.tsx`, new
`pages/CleanupPage.tsx` + `pages/DeveloperCenterPage.tsx`, `pages/index.ts`,
`app/router.tsx`, `app/nav-items.ts`, `stores/navigation-store.ts` (new `NavKey`
values), `services/mocks/mock-storage-service.ts`, and the tests listed above.

**`docs/design-system`** — `09_GLASS_SYSTEM.md`, `10_AURORA_SYSTEM.md`,
`04_COLORS.md`, `08_LAYOUT.md` updated to describe what the code now does.

**`docs/features/01_dashboard.md`** — widget list updated to match Section 3.

---

## Risks

- **Token change ripples app-wide.** Retheming `tokens.css` restyles all nine
  pages at once. Mitigation: Playground is reviewed immediately after the token
  commit, before shell or dashboard work begins.
- **Glass over aurora can fail contrast.** Addressed by the measured acceptance
  criterion in Section 1 rather than by eyeballing it.
- **Accent and success are both green.** Addressed by shifting success and by
  relying on iconography where color alone would be ambiguous.
- **`NavKey` is a typed union in the navigation store.** Adding Cleanup and
  Developer Center touches the store's types; typecheck will catch any missed
  call site.
