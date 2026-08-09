# Luman Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt the Stitch dashboard mockup's visual language (green accent, aurora-lit surface, frosted glass, hero-led dashboard) across the Luman desktop app, expressed entirely in the existing `@luman/ui` CSS token system.

**Architecture:** Tokens-first and bottom-up. `packages/ui` foundations change first (tokens, Aurora, Glass), so all nine pages inherit the new look before any page is touched by hand. Then pure data additions (`@luman/domain` health score, `@luman/core` storage breakdown). Then new presentational components. Then the app shell. Then the dashboard recomposition. Each layer is committed working.

**Tech Stack:** React 18, TypeScript 5.7, Vite 5, Tauri 2, `react-router-dom` 6, `zustand` 5, `lucide-react`, Vitest 2 (happy-dom) + Testing Library, Playwright 1.56, pnpm workspaces.

**Source spec:** `docs/superpowers/specs/2026-08-09-luman-visual-redesign-design.md`

## Global Constraints

- **No hardcoded colors, spacing, radii, shadows, durations, or type sizes** in any component CSS. Every value references a token in `packages/ui/src/styles/tokens.css`. (`docs/design-system/18_UI_IMPLEMENTATION_RULES.md`)
- **No network fetches for assets.** No CDN scripts, no Google Fonts, no remote images. The app ships offline in Tauri. The mockup's Tailwind CDN, Material Symbols, Inter webfont, and `lh3.googleusercontent.com` hero image are all rejected.
- **No Tailwind.** Styling is CSS custom properties plus `.lm-*` class conventions.
- **Icons are Lucide only**, rendered through the `Icon` component from `@luman/ui`. Never import a Lucide icon into JSX directly.
- **Both themes stay working.** Light and dark are both first-class; `[data-theme]` on `<html>` is the only switch.
- **`prefers-reduced-motion: reduce` disables all decorative motion** (aurora drift, orb rotation).
- **The dashboard is read-only.** It never starts a scan or a cleanup. (`docs/features/01_dashboard.md`)
- **Every widget keeps its loading / empty / error / success states** via `StateView`. The mockup only shows success; the other three are non-negotiable.
- **Health copy must not claim hardware knowledge.** The mockup's "All sectors operating normally" is forbidden — Luman does not read SMART data.
- Test commands: `pnpm vitest run --project unit <path>` (single file), `pnpm test:unit`, `pnpm test:e2e`, `pnpm typecheck`, `pnpm lint`.

---

## File Structure

**`packages/ui`**
- `src/styles/tokens.css` — retheme (Task 1)
- `src/styles/tokens.test.ts` — **new**, automated WCAG contrast gate (Task 1)
- `src/components/Aurora.{tsx,css}` — animated blobs (Task 2)
- `src/components/Glass.{tsx,css}` — `variant` prop (Task 3)
- `src/components/{Card,DashboardCard,Panel}.css` — route through glass surface (Task 3)
- `src/components/StorageOrb.{tsx,css}` — **new** (Task 6)
- `src/components/MetricCard.{tsx,css}` — **new** (Task 7)
- `src/components/BreakdownList.{tsx,css}` — **new** (Task 8)
- `src/components/HeroBanner.{tsx,css}` — **new** (Task 9)

**`packages/domain`**
- `src/models/health.ts` + `health.test.ts` — **new** (Task 4)

**`packages/core`**
- `src/services/types.ts`, `src/services/storage-service.ts` — breakdown contract (Task 5)

**`apps/desktop`**
- `src/services/mocks/mock-storage-service.ts` — breakdown data (Task 5)
- `src/app/nav-items.ts`, `src/app/router.tsx`, `src/stores/navigation-store.ts`, `src/pages/{CleanupPage,DeveloperCenterPage}.tsx` — nav model (Task 10)
- `src/components/layout/Sidebar.{tsx,css}` (Task 11)
- `src/components/layout/Header.{tsx,css}`, `QuickActionMenu.tsx`, `AppLayout.{tsx,css}`, `Toolbar.{tsx,css}` deleted (Task 12)
- `src/components/layout/StatusBar.css` (Task 13)
- `src/components/dashboard/` — widget split (Tasks 14–17)
- `src/pages/{DashboardPage,SettingsPage}.tsx` (Tasks 17–18)
- `e2e/*.spec.ts` (Task 19)

**`docs/`** — design-system + feature docs reconciled (Task 20)

**Deviation from spec, deliberate:** the spec assigned breakdown category colors to `--aurora-purple` / `--aurora-blue`. Aurora hues are decorative background values and are not fit for data encoding. This plan introduces dedicated `--color-category-1..5` tokens instead. Everything else follows the spec as written.

---

## Task 1: Retheme design tokens

**Files:**
- Modify: `packages/ui/src/styles/tokens.css`
- Test: `packages/ui/src/styles/tokens.test.ts` (create)

**Interfaces:**
- Consumes: nothing.
- Produces: tokens every later task references — `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-bg`, `--color-bg-elevated`, `--color-surface`, `--color-sidebar`, `--color-text`, `--color-text-secondary`, `--color-text-muted`, `--color-border`, `--color-border-strong`, `--color-success`, `--glass-surface-bg`, `--glass-surface-border`, `--glass-surface-shadow`, `--glass-blur-chrome`, `--aurora-1`, `--aurora-2`, `--aurora-3`, `--aurora-opacity`, `--aurora-blur`, `--color-category-1`…`--color-category-5`, `--font-size-hero`, `--font-size-hero-sub`, `--content-max-width`. `--sidebar-width` becomes `240px`, `--header-height` becomes `56px`.

- [ ] **Step 1: Write the failing contrast test**

This test is the spec's "contrast is measured, not assumed" acceptance criterion, made automatic. It parses `tokens.css` and computes real WCAG ratios, compositing translucent values over their theme background.

Create `packages/ui/src/styles/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/**
 * Extract the declaration block opened by `selector`.
 *
 * Must match the selector only where it actually OPENS a block. A plain
 * `indexOf` is wrong: tokens.css names `[data-theme='dark']` in its header
 * comment, so indexOf finds the comment first and returns the light block —
 * silently making every dark-theme assertion a duplicate of the light ones.
 */
function blockFor(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^\\s*${escaped}[^{]*\\{`, 'm').exec(css);
  if (!match) throw new Error(`Selector not found in tokens.css: ${selector}`);
  const start = match.index + match[0].length;
  const end = css.indexOf('}', start);
  return css.slice(start, end);
}

function tokensOf(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(--[\w-]+):\s*([^;]+);/g)) out[m[1]!] = m[2]!.trim();
  return out;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

function parseColor(value: string): Rgb {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const fn = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (fn) {
    const p = fn[1]!.split(',').map((s) => parseFloat(s.trim()));
    return { r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] ?? 1 };
  }
  throw new Error(`Unparseable color: ${value}`);
}

/** Composite a translucent foreground over an opaque background. */
function over(fg: Rgb, bg: Rgb): Rgb {
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function luminance({ r, g, b }: Rgb): number {
  const chan = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrast(fgValue: string, bgValue: string, baseValue: string): number {
  const base = parseColor(baseValue);
  const bg = over(parseColor(bgValue), base);
  const fg = over(parseColor(fgValue), bg);
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const THEMES = [
  { name: 'light', tokens: tokensOf(blockFor(':root,')) },
  { name: 'dark', tokens: tokensOf(blockFor("[data-theme='dark']")) },
];

/**
 * Sentinels proving each theme's block was actually parsed. Without these, a
 * selector bug that returns the wrong block makes every assertion below pass
 * vacuously against a duplicate palette.
 */
const EXPECTED_BG: Record<string, string> = { light: '#f4f8f5', dark: '#021c0d' };

describe.each(THEMES)('$name theme contrast', ({ name, tokens }) => {
  const bg = () => tokens['--color-bg']!;

  it('parsed the block belonging to this theme', () => {
    expect(bg()).toBe(EXPECTED_BG[name]);
  });

  it('body text on the page background meets AA (4.5:1)', () => {
    expect(contrast(tokens['--color-text']!, bg(), bg())).toBeGreaterThanOrEqual(4.5);
  });

  it('secondary text on the page background meets AA (4.5:1)', () => {
    expect(contrast(tokens['--color-text-secondary']!, bg(), bg())).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent on the page background meets AA (4.5:1)', () => {
    expect(contrast(tokens['--color-accent']!, bg(), bg())).toBeGreaterThanOrEqual(4.5);
  });

  it('body text on a glass surface card meets AA (4.5:1)', () => {
    expect(
      contrast(tokens['--color-text']!, tokens['--glass-surface-bg']!, bg()),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('secondary text on a glass surface card meets AA (4.5:1)', () => {
    expect(
      contrast(tokens['--color-text-secondary']!, tokens['--glass-surface-bg']!, bg()),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('the accent on a glass surface card meets AA (4.5:1)', () => {
    expect(
      contrast(tokens['--color-accent']!, tokens['--glass-surface-bg']!, bg()),
    ).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/styles/tokens.test.ts`
Expected: FAIL — `Unparseable color` or an undefined `--glass-surface-bg`, because that token does not exist yet.

- [ ] **Step 3: Replace the light color block in `tokens.css`**

Replace the whole `:root,\n[data-theme='light'] { … }` block with:

```css
:root,
[data-theme='light'] {
  color-scheme: light;

  --color-bg: #f4f8f5;
  --color-bg-elevated: #ffffff;
  --color-sidebar: rgba(255, 255, 255, 0.55);
  --color-surface: #ffffff;
  --color-surface-hover: #eef4f0;
  --color-border: #d5dfd8;
  --color-border-strong: #bcc9c0;

  --color-text: #1c1c1e;
  --color-text-secondary: #5c6660;
  --color-text-muted: #7d877f;

  --color-accent: #0f7a35;
  --color-accent-hover: #0c6329;
  --color-accent-contrast: #ffffff;
  --color-accent-soft: rgba(15, 122, 53, 0.12);

  --color-success: #1a8f4c;
  --color-warning: #b25000;
  --color-danger: #d70015;
  --color-info: #0a6fd4;

  --color-success-soft: rgba(26, 143, 76, 0.14);
  --color-warning-soft: rgba(178, 80, 0, 0.14);
  --color-danger-soft: rgba(215, 0, 21, 0.12);
  --color-info-soft: rgba(10, 111, 212, 0.12);

  /* Category colors — data encoding for the storage breakdown. */
  --color-category-1: #1d4ed8;
  --color-category-2: #6d28d9;
  --color-category-3: #0f7a35;
  --color-category-4: #b45309;
  --color-category-5: #7d877f;

  /* Glass — chrome (sidebar, header, dialogs, popovers, toasts) */
  --glass-bg: rgba(255, 255, 255, 0.6);
  --glass-border: rgba(255, 255, 255, 0.5);
  --glass-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);

  /* Glass — content surfaces (cards) */
  --glass-surface-bg: rgba(255, 255, 255, 0.72);
  --glass-surface-border: rgba(255, 255, 255, 0.85);
  --glass-surface-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);

  /* Aurora background hues — light */
  --aurora-1: #86efac;
  --aurora-2: #fde68a;
  --aurora-3: #15803d;
  --aurora-opacity: 0.18;
  --aurora-blur: 120px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.16);
}
```

- [ ] **Step 4: Replace the dark color block in `tokens.css`**

Replace the whole `[data-theme='dark'] { … }` block with:

```css
[data-theme='dark'] {
  color-scheme: dark;

  --color-bg: #021c0d;
  --color-bg-elevated: #04240f;
  --color-sidebar: rgba(255, 255, 255, 0.03);
  --color-surface: #0a2a15;
  --color-surface-hover: #0f3a1e;
  --color-border: rgba(255, 255, 255, 0.1);
  --color-border-strong: rgba(255, 255, 255, 0.18);

  --color-text: #f2fbf4;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-muted: rgba(255, 255, 255, 0.5);

  --color-accent: #34c759;
  --color-accent-hover: #5ed77c;
  --color-accent-contrast: #04240f;
  --color-accent-soft: rgba(52, 199, 89, 0.18);

  --color-success: #4ade80;
  --color-warning: #ff9f0a;
  --color-danger: #ff453a;
  --color-info: #64d2ff;

  --color-success-soft: rgba(74, 222, 128, 0.18);
  --color-warning-soft: rgba(255, 159, 10, 0.18);
  --color-danger-soft: rgba(255, 69, 58, 0.18);
  --color-info-soft: rgba(100, 210, 255, 0.18);

  --color-category-1: #60a5fa;
  --color-category-2: #c084fc;
  --color-category-3: #34c759;
  --color-category-4: #fbbf24;
  --color-category-5: rgba(255, 255, 255, 0.5);

  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.05);
  --glass-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);

  --glass-surface-bg: rgba(255, 255, 255, 0.04);
  --glass-surface-border: rgba(255, 255, 255, 0.08);
  --glass-surface-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);

  --aurora-1: #86efac;
  --aurora-2: #fde68a;
  --aurora-3: #15803d;
  --aurora-opacity: 0.55;
  --aurora-blur: 120px;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.45);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
}
```

- [ ] **Step 5: Add the new non-color tokens**

In the `/* ==================== NON-COLOR TOKENS ==================== */` block:

Add after `--font-size-metric: 40px;`:

```css
  --font-size-hero: 44px;
  --font-size-hero-sub: 22px;
```

Add after `--glass-blur-strong: 32px;`:

```css
  --glass-blur-chrome: 64px;
```

Change the layout dimensions at the end of the block to:

```css
  /* Layout dimensions */
  --sidebar-width: 240px;
  --sidebar-width-collapsed: 60px;
  --header-height: 56px;
  --toolbar-height: 44px;
  --statusbar-height: 28px;
  --content-max-width: 1200px;
```

(`--toolbar-height` is removed in Task 12, when `Toolbar` is deleted.
`--statusbar-height` must be **kept** — `StatusBar.css` references it, and
dropping it silently collapses the status bar to auto height.)

- [ ] **Step 6: Run the contrast test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/styles/tokens.test.ts`
Expected: PASS — 14 tests (7 assertions × 2 themes, including the block-identity sentinel).

Sanity-check that the gate is real before moving on: temporarily change the dark `--color-bg` to `#ffffff` and re-run. The dark assertions **must** fail. Revert immediately. A contrast gate that cannot fail is worse than no gate.

- [ ] **Step 7: Run the full unit suite and typecheck for regressions**

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS. No component reads token *values* in tests, so nothing else should move.

- [ ] **Step 8: Visually verify the token change across existing components**

Run: `pnpm dev`, open `/playground`, and toggle the theme control through Light → Dark → System.
Expected: every existing component renders with the green accent and the new backgrounds; no invisible text, no white-on-white, no missing borders. This page is the regression surface for the whole redesign — do not skip it.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/styles/tokens.css packages/ui/src/styles/tokens.test.ts
git commit -m "feat(ui): retheme design tokens to the green aurora palette

Adds glass-surface, aurora, and category token groups, plus an automated
WCAG AA contrast gate over tokens.css for both themes."
```

---

## Task 2: Animated aurora background

**Files:**
- Modify: `packages/ui/src/components/Aurora.tsx`, `packages/ui/src/components/Aurora.css`
- Test: `packages/ui/src/components/Aurora.test.tsx` (create)

**Interfaces:**
- Consumes: `--aurora-1`, `--aurora-2`, `--aurora-3`, `--aurora-opacity`, `--aurora-blur` (Task 1).
- Produces: `<Aurora />` renders `div.lm-aurora[aria-hidden="true"]` containing three `div.lm-aurora__blob` children. Same import path and props (none) as today — `AppLayout` needs no change.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/Aurora.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Aurora } from './Aurora';

describe('Aurora', () => {
  it('is decorative and hidden from assistive technology', () => {
    const { container } = render(<Aurora />);
    const root = container.querySelector('.lm-aurora');
    expect(root).not.toBeNull();
    expect(root!.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders three drifting blobs', () => {
    const { container } = render(<Aurora />);
    expect(container.querySelectorAll('.lm-aurora__blob')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/Aurora.test.tsx`
Expected: FAIL on the second test — `expected 0 to have length 3`. `Aurora` currently renders an empty div.

- [ ] **Step 3: Implement the component**

Replace `packages/ui/src/components/Aurora.tsx`:

```tsx
import './Aurora.css';

/**
 * Aurora background. Three large, heavily blurred blobs that drift slowly
 * behind all content. Decorative only — never interactive, never announced.
 * Drift is disabled under `prefers-reduced-motion: reduce`; the blobs then
 * render static. Opacity is theme-driven: subtle in light, luminous in dark.
 */
export function Aurora() {
  return (
    <div className="lm-aurora" aria-hidden="true">
      <div className="lm-aurora__blob lm-aurora__blob--1" />
      <div className="lm-aurora__blob lm-aurora__blob--2" />
      <div className="lm-aurora__blob lm-aurora__blob--3" />
    </div>
  );
}
```

- [ ] **Step 4: Implement the styles**

Replace `packages/ui/src/components/Aurora.css`:

```css
.lm-aurora {
  position: fixed;
  inset: 0;
  z-index: var(--z-base);
  pointer-events: none;
  overflow: hidden;
  background: var(--color-bg);
}
.lm-aurora__blob {
  position: absolute;
  border-radius: var(--radius-full);
  filter: blur(var(--aurora-blur));
  opacity: var(--aurora-opacity);
}
.lm-aurora__blob--1 {
  width: 800px;
  height: 800px;
  top: -200px;
  left: -200px;
  background: var(--aurora-1);
  animation: lm-aurora-drift-1 20s infinite alternate ease-in-out;
}
.lm-aurora__blob--2 {
  width: 1000px;
  height: 1000px;
  right: -200px;
  bottom: -300px;
  background: var(--aurora-2);
  animation: lm-aurora-drift-2 25s infinite alternate ease-in-out;
}
.lm-aurora__blob--3 {
  width: 900px;
  height: 900px;
  top: 20%;
  left: 30%;
  background: var(--aurora-3);
  animation: lm-aurora-drift-3 30s infinite alternate ease-in-out;
}

@keyframes lm-aurora-drift-1 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(150px, 200px) scale(1.1);
  }
  100% {
    transform: translate(-50px, 100px) scale(0.9);
  }
}
@keyframes lm-aurora-drift-2 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-200px, -150px) scale(0.9);
  }
  100% {
    transform: translate(100px, -200px) scale(1.1);
  }
}
@keyframes lm-aurora-drift-3 {
  0% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(150px, -150px) scale(1.2);
  }
  100% {
    transform: translate(-150px, 150px) scale(0.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lm-aurora__blob {
    animation: none;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/Aurora.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 6: Verify visually, including reduced motion**

Run `pnpm dev` and open any page. Expected: slow green/amber drift behind the content in dark, a subtle wash in light.

Then enable macOS **System Settings → Accessibility → Display → Reduce motion**, reload, and confirm the blobs are frozen.

- [ ] **Step 7: Commit**

```bash
git add packages/ui/src/components/Aurora.tsx packages/ui/src/components/Aurora.css packages/ui/src/components/Aurora.test.tsx
git commit -m "feat(ui): animate the aurora background with drifting blobs

Honors prefers-reduced-motion by freezing all drift."
```

---

## Task 3: Glass surface variant for content cards

**Files:**
- Modify: `packages/ui/src/components/Glass.tsx`, `packages/ui/src/components/Glass.css`, `packages/ui/src/components/Card.css`, `packages/ui/src/components/DashboardCard.css`, `packages/ui/src/components/Panel.css`
- Modify: `docs/design-system/09_GLASS_SYSTEM.md`
- Test: `packages/ui/src/components/Glass.test.tsx` (create)

**Interfaces:**
- Consumes: `--glass-surface-bg`, `--glass-surface-border`, `--glass-surface-shadow`, `--glass-blur-chrome` (Task 1).
- Produces: `Glass` gains `variant?: 'chrome' | 'surface'` (default `'chrome'`). `variant="chrome"` → `.lm-glass .lm-glass--chrome`; `variant="surface"` → `.lm-glass .lm-glass--surface`. The existing `strong` prop is unchanged. `.lm-card`, `.lm-dcard`, and `.lm-panel` adopt the surface glass appearance directly in CSS — no JSX change to those three components.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/Glass.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Glass } from './Glass';

describe('Glass', () => {
  it('defaults to the chrome variant', () => {
    const { container } = render(<Glass>content</Glass>);
    const el = container.querySelector('.lm-glass')!;
    expect(el.classList.contains('lm-glass--chrome')).toBe(true);
    expect(el.classList.contains('lm-glass--surface')).toBe(false);
  });

  it('applies the surface variant for content cards', () => {
    const { container } = render(<Glass variant="surface">content</Glass>);
    const el = container.querySelector('.lm-glass')!;
    expect(el.classList.contains('lm-glass--surface')).toBe(true);
    expect(el.classList.contains('lm-glass--chrome')).toBe(false);
  });

  it('still supports the strong blur modifier', () => {
    const { container } = render(<Glass strong>content</Glass>);
    expect(container.querySelector('.lm-glass')!.classList.contains('lm-glass--strong')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/Glass.test.tsx`
Expected: FAIL — `expected false to be true` on the chrome class, and a TS error that `variant` is not a `GlassProps` member.

- [ ] **Step 3: Implement the component**

Replace `packages/ui/src/components/Glass.tsx`:

```tsx
import type { HTMLAttributes, ReactNode } from 'react';
import './Glass.css';

export type GlassVariant = 'chrome' | 'surface';

export interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `chrome` — window furniture: sidebar, header, dialog, popover, toast.
   * Heavy blur, strong presence.
   * `surface` — content cards. Lighter blur so text stays crisp over the aurora.
   */
  readonly variant?: GlassVariant;
  /** Stronger blur for larger chrome surfaces (dialogs). */
  readonly strong?: boolean;
  readonly children: ReactNode;
}

/**
 * Frosted-glass surface. Content cards are permitted via `variant="surface"` —
 * see docs/design-system/09_GLASS_SYSTEM.md. Text contrast over the aurora is
 * enforced by the automated gate in src/styles/tokens.test.ts.
 */
export function Glass({
  variant = 'chrome',
  strong = false,
  className,
  children,
  ...rest
}: GlassProps) {
  return (
    <div
      className={['lm-glass', `lm-glass--${variant}`, strong && 'lm-glass--strong', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Implement the styles**

Replace `packages/ui/src/components/Glass.css`:

```css
.lm-glass {
  border: var(--border-width) solid var(--glass-border);
}
.lm-glass--chrome {
  background: var(--glass-bg);
  border-color: var(--glass-border);
  box-shadow: var(--glass-shadow);
  -webkit-backdrop-filter: saturate(180%) blur(var(--glass-blur-chrome));
  backdrop-filter: saturate(180%) blur(var(--glass-blur-chrome));
}
.lm-glass--surface {
  background: var(--glass-surface-bg);
  border-color: var(--glass-surface-border);
  box-shadow: var(--glass-surface-shadow);
  -webkit-backdrop-filter: saturate(140%) blur(var(--glass-blur));
  backdrop-filter: saturate(140%) blur(var(--glass-blur));
}
.lm-glass--strong {
  -webkit-backdrop-filter: saturate(180%) blur(var(--glass-blur-strong));
  backdrop-filter: saturate(180%) blur(var(--glass-blur-strong));
}
/* Graceful fallback where backdrop-filter is unsupported. */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .lm-glass--chrome,
  .lm-glass--surface {
    background: var(--color-surface);
  }
}
```

- [ ] **Step 5: Route the three card surfaces through surface glass**

In `packages/ui/src/components/Card.css`, replace the `.lm-card` rule:

```css
.lm-card {
  background: var(--glass-surface-bg);
  border: 1px solid var(--glass-surface-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-surface-shadow);
  -webkit-backdrop-filter: saturate(140%) blur(var(--glass-blur));
  backdrop-filter: saturate(140%) blur(var(--glass-blur));
  overflow: hidden;
}
```

And in the same file replace the `.lm-card__title` border with the glass border:

```css
.lm-card__title {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--glass-surface-border);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-lg);
}
```

In `packages/ui/src/components/DashboardCard.css`, replace the `.lm-dcard` rule with the same treatment at the larger radius the mockup uses:

```css
.lm-dcard {
  background: var(--glass-surface-bg);
  border: 1px solid var(--glass-surface-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--glass-surface-shadow);
  -webkit-backdrop-filter: saturate(140%) blur(var(--glass-blur));
  backdrop-filter: saturate(140%) blur(var(--glass-blur));
  display: flex;
  flex-direction: column;
  min-width: 0;
}
```

The `display: flex; flex-direction: column; min-width: 0;` declarations are pre-existing layout that must be **preserved** — only the four appearance declarations change. Unlike `.lm-card`, `.lm-dcard` has never had `overflow: hidden`; do not add it.

In `packages/ui/src/components/Panel.css`, replace the `background` and `border` declarations of the `.lm-panel` rule with:

```css
  background: var(--glass-surface-bg);
  border: 1px solid var(--glass-surface-border);
```

Leave every other declaration in those files untouched.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/Glass.test.tsx`
Expected: PASS — 3 tests.

- [ ] **Step 7: Update the glass documentation**

Replace `docs/design-system/09_GLASS_SYSTEM.md`:

```markdown
# Glass System

Two variants, both from the `Glass` component.

## chrome
Window furniture: sidebar, header, dialog, popover, toast.
Heavy blur (`--glass-blur-chrome`, 64px). Strong presence.

## surface
Content cards: `Card`, `DashboardCard`, `Panel`.
Lighter blur (`--glass-blur`, 20px) so body text stays crisp over the aurora.

Content cards on glass are permitted. This reverses the earlier prohibition.

## Contrast
Text over glass must meet WCAG AA (4.5:1) in both themes, composited over the
page background. Enforced automatically by `packages/ui/src/styles/tokens.test.ts`
— that test is the gate, not a reviewer's judgement.

## Fallback
Where `backdrop-filter` is unsupported, both variants fall back to a solid
`--color-surface`.
```

- [ ] **Step 8: Verify the whole suite and the playground**

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS.

Then run `pnpm dev`, open `/playground`, and confirm in **both** themes that cards read as frosted panels and that body text over them is comfortably legible.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src/components/Glass.tsx packages/ui/src/components/Glass.css packages/ui/src/components/Glass.test.tsx packages/ui/src/components/Card.css packages/ui/src/components/DashboardCard.css packages/ui/src/components/Panel.css docs/design-system/09_GLASS_SYSTEM.md
git commit -m "feat(ui): add a glass surface variant and allow it on content cards

Reverses the previous prohibition on glass for cards; docs updated to match."
```

---

## Task 4: Storage health score

**Files:**
- Create: `packages/domain/src/models/health.ts`
- Create: `packages/domain/src/models/health.test.ts`
- Modify: `packages/domain/src/index.ts`

**Interfaces:**
- Consumes: nothing. `@luman/domain` depends only on `@luman/shared`.
- Produces:
  - `interface StorageHealthInput { readonly totalBytes: number; readonly freeBytes: number; readonly reclaimableBytes: number }`
  - `type HealthBand = 'healthy' | 'attention' | 'low'`
  - `interface StorageHealth { readonly score: number; readonly band: HealthBand; readonly description: string }`
  - `function computeHealthScore(input: StorageHealthInput): StorageHealth`

  `StorageHealthInput` is deliberately **not** an import of `StorageOverview`: that type lives in `@luman/core`, and core depends on domain, not the reverse. A `StorageOverview` satisfies this shape structurally, so callers pass one directly.

- [ ] **Step 1: Write the failing test**

Create `packages/domain/src/models/health.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeHealthScore } from './health';

const GB = 1024 ** 3;

/** Build an input with a given free fraction and reclaimable fraction. */
function input(freeFraction: number, reclaimableFraction = 0) {
  const totalBytes = 1000 * GB;
  return {
    totalBytes,
    freeBytes: totalBytes * freeFraction,
    reclaimableBytes: totalBytes * reclaimableFraction,
  };
}

describe('computeHealthScore', () => {
  it('scores a nearly empty disk at the top of the range', () => {
    expect(computeHealthScore(input(1)).score).toBe(100);
  });

  it('scores a full but clutter-free disk at the cleanliness floor', () => {
    // No free space at all still earns the full 20 cleanliness points.
    expect(computeHealthScore(input(0, 0)).score).toBe(20);
  });

  it('scores a full disk that is also full of clutter at zero', () => {
    expect(computeHealthScore(input(0, 1)).score).toBe(0);
  });

  it('weights free space at 80% and cleanliness at 20%', () => {
    // free 0.5, reclaimable 0 -> (0.5*100*0.8) + (1*100*0.2) = 40 + 20 = 60
    expect(computeHealthScore(input(0.5, 0)).score).toBe(60);
    // free 0.5, reclaimable 0.5 -> 40 + (0.5*100*0.2) = 40 + 10 = 50
    expect(computeHealthScore(input(0.5, 0.5)).score).toBe(50);
  });

  it('bands a score of 80 or more as healthy', () => {
    const result = computeHealthScore(input(0.75, 0));
    expect(result.score).toBe(80);
    expect(result.band).toBe('healthy');
  });

  it('bands a score just below 80 as attention', () => {
    const result = computeHealthScore(input(0.74, 0));
    expect(result.score).toBe(79);
    expect(result.band).toBe('attention');
  });

  it('bands a score of exactly 60 as attention', () => {
    expect(computeHealthScore(input(0.5, 0)).band).toBe('attention');
  });

  it('bands a score just below 60 as low', () => {
    const result = computeHealthScore(input(0.48, 0));
    expect(result.score).toBe(58);
    expect(result.band).toBe('low');
  });

  it('returns a zero low score rather than dividing by zero', () => {
    const result = computeHealthScore({ totalBytes: 0, freeBytes: 0, reclaimableBytes: 0 });
    expect(result.score).toBe(0);
    expect(result.band).toBe('low');
  });

  it('clamps nonsensical input into the 0-100 range', () => {
    const total = 100 * GB;
    const result = computeHealthScore({
      totalBytes: total,
      freeBytes: total * 2,
      reclaimableBytes: -total,
    });
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it('never claims hardware-level health it cannot observe', () => {
    for (const f of [0, 0.3, 0.6, 0.9, 1]) {
      expect(computeHealthScore(input(f)).description).not.toMatch(/sector/i);
    }
  });

  it('describes each band in plain language', () => {
    expect(computeHealthScore(input(0.9)).description).toBe('Plenty of free space.');
    expect(computeHealthScore(input(0.6)).description).toBe('Free space is getting tight.');
    expect(computeHealthScore(input(0.1)).description).toBe('Very little free space left.');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/domain/src/models/health.test.ts`
Expected: FAIL — `Failed to resolve import "./health"`.

- [ ] **Step 3: Write the implementation**

Create `packages/domain/src/models/health.ts`:

```ts
/**
 * Structural input for the health score. Deliberately NOT an import of
 * `StorageOverview`: that type lives in @luman/core, and core depends on
 * domain, not the reverse. A `StorageOverview` satisfies this shape
 * structurally, so callers pass one directly.
 */
export interface StorageHealthInput {
  readonly totalBytes: number;
  readonly freeBytes: number;
  readonly reclaimableBytes: number;
}

export type HealthBand = 'healthy' | 'attention' | 'low';

export interface StorageHealth {
  /** 0–100, where 100 is an empty, clutter-free disk. */
  readonly score: number;
  readonly band: HealthBand;
  /** One plain-language line. Never claims hardware-level knowledge. */
  readonly description: string;
}

const DESCRIPTIONS: Record<HealthBand, string> = {
  healthy: 'Plenty of free space.',
  attention: 'Free space is getting tight.',
  low: 'Very little free space left.',
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Free space dominates the score because it is what actually constrains the
 * user; reclaimable clutter penalises it mildly.
 *
 *   score = (freeRatio * 100 * 0.8) + ((1 - reclaimableRatio) * 100 * 0.2)
 *
 * A non-positive `totalBytes` means we know nothing, which is reported as the
 * worst case rather than as a division by zero.
 */
export function computeHealthScore(input: StorageHealthInput): StorageHealth {
  const { totalBytes, freeBytes, reclaimableBytes } = input;

  if (!Number.isFinite(totalBytes) || totalBytes <= 0) {
    return { score: 0, band: 'low', description: DESCRIPTIONS.low };
  }

  const freeRatio = clamp01(freeBytes / totalBytes);
  const reclaimableRatio = clamp01(reclaimableBytes / totalBytes);
  const raw = freeRatio * 100 * 0.8 + (1 - reclaimableRatio) * 100 * 0.2;
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  const band: HealthBand = score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'low';
  return { score, band, description: DESCRIPTIONS[band] };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/domain/src/models/health.test.ts`
Expected: PASS — 12 tests.

- [ ] **Step 5: Export it from the package barrel**

In `packages/domain/src/index.ts`, add after `export * from './models/recommendation';`:

```ts
export * from './models/health';
```

- [ ] **Step 6: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/models/health.ts packages/domain/src/models/health.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): add computeHealthScore for the storage health metric"
```

---

## Task 5: Storage breakdown service contract

**Files:**
- Modify: `packages/core/src/services/types.ts`
- Modify: `packages/core/src/services/storage-service.ts`
- Modify: `apps/desktop/src/services/mocks/mock-storage-service.ts`
- Test: `apps/desktop/src/services/mocks/mocks.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface StorageCategory { readonly key: string; readonly label: string; readonly bytes: number }`
  - `StorageService.getBreakdown(): Promise<readonly StorageCategory[] | null>`
  - `StubStorageService.getBreakdown()` resolves `null`.
  - `MockStorageService.getBreakdown()` resolves five categories whose `bytes` sum **exactly** to `DEFAULT_OVERVIEW.usedBytes`, and honours the existing `delayMs` / `failWith` options.
  - `MockStorageOptions` gains `readonly breakdown?: readonly StorageCategory[] | null`.

- [ ] **Step 1: Write the failing test**

Append to `apps/desktop/src/services/mocks/mocks.test.ts`:

```ts
describe('MockStorageService.getBreakdown', () => {
  it('returns categories that sum exactly to the overview used bytes', async () => {
    const service = new MockStorageService();
    const [overview, breakdown] = await Promise.all([
      service.getOverview(),
      service.getBreakdown(),
    ]);
    const total = breakdown!.reduce((sum, c) => sum + c.bytes, 0);
    expect(total).toBe(overview!.usedBytes);
  });

  it('returns categories with unique keys and positive sizes', async () => {
    const breakdown = (await new MockStorageService().getBreakdown())!;
    expect(breakdown.length).toBeGreaterThan(0);
    expect(new Set(breakdown.map((c) => c.key)).size).toBe(breakdown.length);
    for (const category of breakdown) {
      expect(category.bytes).toBeGreaterThan(0);
      expect(category.label.length).toBeGreaterThan(0);
    }
  });

  it('exercises the empty state when breakdown is explicitly null', async () => {
    expect(await new MockStorageService({ breakdown: null }).getBreakdown()).toBeNull();
  });

  it('propagates the configured failure', async () => {
    const boom = new Error('nope');
    await expect(new MockStorageService({ failWith: boom }).getBreakdown()).rejects.toThrow('nope');
  });
});
```

Add `MockStorageService` to the existing import at the top of the file if it is not already imported.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/services/mocks/mocks.test.ts`
Expected: FAIL — `service.getBreakdown is not a function`.

- [ ] **Step 3: Add the category type to the core contract**

In `packages/core/src/services/types.ts`, add after the `StorageOverview` interface:

```ts
/** One slice of used storage, for the dashboard breakdown. Display-only. */
export interface StorageCategory {
  /** Stable identifier, e.g. 'system' | 'apps' | 'documents'. */
  readonly key: string;
  readonly label: string;
  readonly bytes: number;
}
```

- [ ] **Step 4: Extend the service interface and the stub**

Replace `packages/core/src/services/storage-service.ts`:

```ts
import type { StorageOverview, StorageCategory } from './types';

/** Reports high-level storage figures for the dashboard. Read-only. */
export interface StorageService {
  /** Current overview, or null when it is not yet known (no scan / no data). */
  getOverview(): Promise<StorageOverview | null>;
  /**
   * Per-category usage for the breakdown, or null when unknown.
   * Categories sum to the overview's `usedBytes`.
   */
  getBreakdown(): Promise<readonly StorageCategory[] | null>;
}

/** Sprint 1 stub — no real figures yet, so the dashboard shows "No Scan". */
export class StubStorageService implements StorageService {
  async getOverview(): Promise<StorageOverview | null> {
    return null;
  }

  async getBreakdown(): Promise<readonly StorageCategory[] | null> {
    return null;
  }
}
```

- [ ] **Step 5: Implement the mock**

Replace `apps/desktop/src/services/mocks/mock-storage-service.ts`:

```ts
import type { StorageService, StorageOverview, StorageCategory } from '@luman/core';

export interface MockStorageOptions {
  /** Simulated latency in ms. */
  readonly delayMs?: number;
  /** Force an error to exercise the error state. */
  readonly failWith?: Error;
  /** Return null to exercise the empty/missing state. */
  readonly overview?: StorageOverview | null;
  /** Return null to exercise the breakdown's empty state. */
  readonly breakdown?: readonly StorageCategory[] | null;
}

const DEFAULT_OVERVIEW: StorageOverview = {
  volume: 'Macintosh HD',
  totalBytes: 494_384_795_648, // ~460 GB
  usedBytes: 356_241_000_000, // ~331 GB
  freeBytes: 138_143_795_648, // ~128 GB
  reclaimableBytes: 48_318_382_080, // ~45 GB
};

/**
 * Categories MUST sum to DEFAULT_OVERVIEW.usedBytes — the breakdown and the
 * Storage Used card are on screen together and must not contradict each other.
 * `other` absorbs the remainder so the invariant holds exactly; a unit test
 * enforces it.
 */
const NAMED_CATEGORIES: readonly StorageCategory[] = [
  { key: 'system', label: 'System', bytes: 48_530_000_000 },
  { key: 'apps', label: 'Apps', bytes: 129_400_000_000 },
  { key: 'documents', label: 'Documents', bytes: 86_010_000_000 },
  { key: 'media', label: 'Media', bytes: 61_200_000_000 },
];

const DEFAULT_BREAKDOWN: readonly StorageCategory[] = [
  ...NAMED_CATEGORIES,
  {
    key: 'other',
    label: 'Other',
    bytes: DEFAULT_OVERVIEW.usedBytes - NAMED_CATEGORIES.reduce((sum, c) => sum + c.bytes, 0),
  },
];

/**
 * Mock StorageService — returns realistic figures so the dashboard can be built
 * and reviewed before real storage introspection exists. Implements the
 * StorageService contract exactly.
 */
export class MockStorageService implements StorageService {
  constructor(private readonly options: MockStorageOptions = {}) {}

  async getOverview(): Promise<StorageOverview | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.overview === undefined ? DEFAULT_OVERVIEW : this.options.overview;
  }

  async getBreakdown(): Promise<readonly StorageCategory[] | null> {
    await delay(this.options.delayMs);
    if (this.options.failWith) throw this.options.failWith;
    return this.options.breakdown === undefined ? DEFAULT_BREAKDOWN : this.options.breakdown;
  }
}

function delay(ms?: number): Promise<void> {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/services/mocks/mocks.test.ts`
Expected: PASS, including the sum invariant.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS. If any other class implements `StorageService`, the typecheck will name it — add a `getBreakdown` returning `null` there.

- [ ] **Step 8: Commit**

```bash
git add packages/core/src/services/types.ts packages/core/src/services/storage-service.ts apps/desktop/src/services/mocks/mock-storage-service.ts apps/desktop/src/services/mocks/mocks.test.ts
git commit -m "feat(core): add StorageService.getBreakdown with a summing mock

Mock categories sum exactly to usedBytes so the breakdown and the storage
card cannot contradict each other on screen."
```

---

## Task 6: StorageOrb component

**Files:**
- Create: `packages/ui/src/components/StorageOrb.tsx`, `packages/ui/src/components/StorageOrb.css`
- Modify: `packages/ui/src/index.ts`, `apps/desktop/src/pages/PlaygroundPage.tsx`
- Test: `packages/ui/src/components/StorageOrb.test.tsx` (create)

**Interfaces:**
- Consumes: `--color-accent`, `--aurora-1`, `--color-bg-elevated` (Task 1).
- Produces: `<StorageOrb size?: number />` (default `320`). Renders `svg.lm-orb[aria-hidden="true"]`. Replaces the mockup's remote PNG. Decorative — it conveys nothing the hero copy does not.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/StorageOrb.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StorageOrb } from './StorageOrb';

describe('StorageOrb', () => {
  it('is decorative and hidden from assistive technology', () => {
    const { container } = render(<StorageOrb />);
    const svg = container.querySelector('svg.lm-orb')!;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to a 320px square and honours an explicit size', () => {
    const { container, rerender } = render(<StorageOrb />);
    expect(container.querySelector('svg.lm-orb')!.getAttribute('width')).toBe('320');
    rerender(<StorageOrb size={200} />);
    expect(container.querySelector('svg.lm-orb')!.getAttribute('width')).toBe('200');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/StorageOrb.test.tsx`
Expected: FAIL — `Failed to resolve import "./StorageOrb"`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/StorageOrb.tsx`:

```tsx
import './StorageOrb.css';

export interface StorageOrbProps {
  /** Rendered square size in px. */
  readonly size?: number;
}

/**
 * Decorative hero illustration: concentric rings with an aurora glow, standing
 * in for the mockup's remotely-hosted 3D render. Built from tokens so it themes
 * correctly in light and dark, and ships offline. The outer ring rotates slowly
 * unless the user prefers reduced motion.
 */
export function StorageOrb({ size = 320 }: StorageOrbProps) {
  return (
    <svg
      className="lm-orb"
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="lm-orb-core" cx="50%" cy="45%" r="55%">
          <stop offset="0%" className="lm-orb__stop-bright" />
          <stop offset="65%" className="lm-orb__stop-mid" />
          <stop offset="100%" className="lm-orb__stop-edge" />
        </radialGradient>
      </defs>

      <circle className="lm-orb__glow" cx="100" cy="100" r="76" />
      <circle className="lm-orb__body" cx="100" cy="100" r="60" fill="url(#lm-orb-core)" />
      <circle className="lm-orb__ring lm-orb__ring--inner" cx="100" cy="100" r="42" />
      <circle className="lm-orb__ring lm-orb__ring--mid" cx="100" cy="100" r="60" />
      <g className="lm-orb__spin">
        <circle className="lm-orb__ring lm-orb__ring--outer" cx="100" cy="100" r="78" />
        <circle className="lm-orb__tick" cx="100" cy="22" r="4" />
      </g>
      <circle className="lm-orb__hub" cx="100" cy="100" r="10" />
    </svg>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `packages/ui/src/components/StorageOrb.css`:

```css
.lm-orb {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.lm-orb__stop-bright {
  stop-color: var(--aurora-1);
  stop-opacity: 0.9;
}
.lm-orb__stop-mid {
  stop-color: var(--color-accent);
  stop-opacity: 0.55;
}
.lm-orb__stop-edge {
  stop-color: var(--color-bg-elevated);
  stop-opacity: 0.95;
}
.lm-orb__glow {
  fill: var(--color-accent);
  opacity: 0.22;
  filter: blur(18px);
}
.lm-orb__body {
  stroke: var(--glass-surface-border);
  stroke-width: 1;
}
.lm-orb__ring {
  fill: none;
  stroke: var(--color-accent);
}
.lm-orb__ring--inner {
  opacity: 0.35;
  stroke-width: 1;
}
.lm-orb__ring--mid {
  opacity: 0.55;
  stroke-width: 1.5;
}
.lm-orb__ring--outer {
  opacity: 0.4;
  stroke-width: 1;
  stroke-dasharray: 6 10;
}
.lm-orb__tick {
  fill: var(--color-accent);
}
.lm-orb__hub {
  fill: var(--color-bg-elevated);
  stroke: var(--color-accent);
  stroke-width: 1.5;
}
.lm-orb__spin {
  transform-origin: 100px 100px;
  animation: lm-orb-spin 48s linear infinite;
}
@keyframes lm-orb-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .lm-orb__spin {
    animation: none;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/StorageOrb.test.tsx`
Expected: PASS — 2 tests.

- [ ] **Step 6: Export it and add it to the Playground**

In `packages/ui/src/index.ts`, add under the `/* Foundations */` group after `export * from './components/Glass';`:

```ts
export * from './components/StorageOrb';
```

In `apps/desktop/src/pages/PlaygroundPage.tsx`, add `StorageOrb` to the existing `@luman/ui` import list, then add this section alongside the other component sections in the returned JSX:

```tsx
<Section title="Storage Orb">
  <StorageOrb size={220} />
</Section>
```

- [ ] **Step 7: Verify in both themes**

Run: `pnpm dev`, open `/playground`, toggle Light/Dark.
Expected: the orb reads as a glowing disc in both themes, rotating slowly. With **Reduce motion** on, it is static.

- [ ] **Step 8: Commit**

```bash
git add packages/ui/src/components/StorageOrb.tsx packages/ui/src/components/StorageOrb.css packages/ui/src/components/StorageOrb.test.tsx packages/ui/src/index.ts apps/desktop/src/pages/PlaygroundPage.tsx
git commit -m "feat(ui): add StorageOrb hero illustration

Token-driven inline SVG replacing the mockup's remote PNG, so it themes
correctly and ships offline."
```

---

## Task 7: MetricCard component

**Files:**
- Create: `packages/ui/src/components/MetricCard.tsx`, `packages/ui/src/components/MetricCard.css`
- Modify: `packages/ui/src/index.ts`, `apps/desktop/src/pages/PlaygroundPage.tsx`
- Test: `packages/ui/src/components/MetricCard.test.tsx` (create)

**Interfaces:**
- Consumes: `Icon`, `LucideIcon` from `./Icon`; glass surface tokens (Tasks 1, 3).
- Produces:

  ```ts
  type MetricTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';
  interface MetricCardProps {
    readonly label: string;
    readonly value: ReactNode;
    readonly unit?: ReactNode;
    readonly secondary?: ReactNode;
    readonly caption?: ReactNode;
    readonly icon?: LucideIcon;
    readonly tone?: MetricTone;
    readonly children?: ReactNode; // slot beneath, e.g. a ProgressBar
  }
  ```

  This is the mockup's large metric tile (big value + unit + optional `/ total` + optional bar). It is distinct from the existing `StatCard`, which stays as the small tile used inside Recent Activity.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/MetricCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HardDrive } from 'lucide-react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders the label, value, unit and secondary text', () => {
    render(<MetricCard label="Storage Used" value="256" unit="GB" secondary="/ 512 GB" />);
    expect(screen.getByText('Storage Used')).toBeInTheDocument();
    expect(screen.getByText('256')).toBeInTheDocument();
    expect(screen.getByText('GB')).toBeInTheDocument();
    expect(screen.getByText('/ 512 GB')).toBeInTheDocument();
  });

  it('renders a caption when given', () => {
    render(<MetricCard label="Health" value="98%" caption="Plenty of free space." />);
    expect(screen.getByText('Plenty of free space.')).toBeInTheDocument();
  });

  it('renders children in the slot beneath the value', () => {
    render(
      <MetricCard label="Storage Used" value="256">
        <div data-testid="bar" />
      </MetricCard>,
    );
    expect(screen.getByTestId('bar')).toBeInTheDocument();
  });

  it('applies the tone modifier class', () => {
    const { container } = render(<MetricCard label="Health" value="98%" tone="success" />);
    expect(container.querySelector('.lm-metric--success')).not.toBeNull();
  });

  it('marks the icon as decorative', () => {
    const { container } = render(<MetricCard label="Storage Used" value="256" icon={HardDrive} />);
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/MetricCard.test.tsx`
Expected: FAIL — `Failed to resolve import "./MetricCard"`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/MetricCard.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Icon, type LucideIcon } from './Icon';
import './MetricCard.css';

export type MetricTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export interface MetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  /** Rendered smaller, immediately after the value (e.g. "GB"). */
  readonly unit?: ReactNode;
  /** Rendered muted, after the unit (e.g. "/ 512 GB"). */
  readonly secondary?: ReactNode;
  /** One supporting line beneath the value. */
  readonly caption?: ReactNode;
  /** Decorative icon in the top-right corner. */
  readonly icon?: LucideIcon;
  readonly tone?: MetricTone;
  /** Slot beneath the value — typically a ProgressBar. */
  readonly children?: ReactNode;
}

/** A large headline metric tile, as used in the dashboard's metrics row. */
export function MetricCard({
  label,
  value,
  unit,
  secondary,
  caption,
  icon,
  tone = 'default',
  children,
}: MetricCardProps) {
  return (
    <section className={`lm-metric lm-metric--${tone}`}>
      <header className="lm-metric__head">
        <h3 className="lm-metric__label">{label}</h3>
        {icon != null && (
          <span className="lm-metric__icon">
            <Icon icon={icon} size="md" />
          </span>
        )}
      </header>

      <p className="lm-metric__value">
        {value}
        {unit != null && <span className="lm-metric__unit">{unit}</span>}
        {secondary != null && <span className="lm-metric__secondary">{secondary}</span>}
      </p>

      {caption != null && <p className="lm-metric__caption">{caption}</p>}
      {children != null && <div className="lm-metric__slot">{children}</div>}
    </section>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `packages/ui/src/components/MetricCard.css`:

```css
.lm-metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-5);
  border-radius: var(--radius-xl);
  background: var(--glass-surface-bg);
  border: var(--border-width) solid var(--glass-surface-border);
  box-shadow: var(--glass-surface-shadow);
  -webkit-backdrop-filter: saturate(140%) blur(var(--glass-blur));
  backdrop-filter: saturate(140%) blur(var(--glass-blur));
}
.lm-metric__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}
.lm-metric__label {
  margin: 0;
  font-size: var(--font-size-headline);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}
.lm-metric__icon {
  color: var(--color-text-muted);
  line-height: 0;
}
.lm-metric__value {
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: var(--font-size-metric);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-tight);
  line-height: var(--line-height-tight);
  color: var(--color-text);
}
.lm-metric__unit {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-secondary);
}
.lm-metric__secondary {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  color: var(--color-text-secondary);
}
.lm-metric__caption {
  margin: 0;
  font-size: var(--font-size-body);
  color: var(--color-text-secondary);
}
.lm-metric__slot {
  margin-top: var(--space-2);
}

.lm-metric--accent .lm-metric__value {
  color: var(--color-accent);
}
.lm-metric--success .lm-metric__value {
  color: var(--color-success);
}
.lm-metric--warning .lm-metric__value {
  color: var(--color-warning);
}
.lm-metric--danger .lm-metric__value {
  color: var(--color-danger);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/MetricCard.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Export it and add it to the Playground**

In `packages/ui/src/index.ts`, add under `/* Dashboard-oriented */` after `export * from './components/StatCard';`:

```ts
export * from './components/MetricCard';
```

In `apps/desktop/src/pages/PlaygroundPage.tsx`, add `MetricCard` and `ProgressBar` (already imported) usage, plus `HardDrive` to the `lucide-react` import, and add this section:

```tsx
<Section title="Metric Card">
  <Grid columns={2}>
    <MetricCard
      label="Storage Used"
      value="256"
      unit="GB"
      secondary="/ 512 GB"
      icon={HardDrive}
    >
      <ProgressBar value={0.5} ariaLabel="Storage utilization" />
    </MetricCard>
    <MetricCard label="Health" value="98%" tone="success" caption="Plenty of free space." />
  </Grid>
</Section>
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm test:unit && pnpm typecheck`, then check `/playground` in both themes.
Expected: PASS; both tiles read as frosted cards with large values.

```bash
git add packages/ui/src/components/MetricCard.tsx packages/ui/src/components/MetricCard.css packages/ui/src/components/MetricCard.test.tsx packages/ui/src/index.ts apps/desktop/src/pages/PlaygroundPage.tsx
git commit -m "feat(ui): add MetricCard for the dashboard metrics row"
```

---

## Task 8: BreakdownList component

**Files:**
- Create: `packages/ui/src/components/BreakdownList.tsx`, `packages/ui/src/components/BreakdownList.css`
- Modify: `packages/ui/src/index.ts`, `apps/desktop/src/pages/PlaygroundPage.tsx`
- Test: `packages/ui/src/components/BreakdownList.test.tsx` (create)

**Interfaces:**
- Consumes: `--color-category-1`…`--color-category-5` (Task 1).
- Produces:

  ```ts
  interface BreakdownRow {
    readonly key: string;
    readonly label: string;
    readonly value: string;   // preformatted, e.g. "45.2 GB"
    readonly colorIndex: number; // 1..5, wraps
  }
  interface BreakdownListProps {
    readonly rows: readonly BreakdownRow[];
    readonly ariaLabel?: string;
  }
  ```

  Presentational only — it never formats bytes. The widget does that with `formatBytes` before passing rows in.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/BreakdownList.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BreakdownList } from './BreakdownList';

const rows = [
  { key: 'system', label: 'System', value: '45.2 GB', colorIndex: 1 },
  { key: 'apps', label: 'Apps', value: '120.5 GB', colorIndex: 2 },
];

describe('BreakdownList', () => {
  it('renders a labelled list with one item per row', () => {
    render(<BreakdownList rows={rows} ariaLabel="Storage by category" />);
    const list = screen.getByRole('list', { name: 'Storage by category' });
    expect(list).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('renders each row label and value', () => {
    render(<BreakdownList rows={rows} />);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('45.2 GB')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText('120.5 GB')).toBeInTheDocument();
  });

  it('assigns a category color class per row and wraps past five', () => {
    const { container } = render(
      <BreakdownList rows={[{ key: 'x', label: 'X', value: '1 GB', colorIndex: 6 }]} />,
    );
    expect(container.querySelector('.lm-breakdown__dot--1')).not.toBeNull();
  });

  it('hides the color dots from assistive technology', () => {
    const { container } = render(<BreakdownList rows={rows} />);
    for (const dot of container.querySelectorAll('.lm-breakdown__dot')) {
      expect(dot.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/BreakdownList.test.tsx`
Expected: FAIL — `Failed to resolve import "./BreakdownList"`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/BreakdownList.tsx`:

```tsx
import './BreakdownList.css';

export interface BreakdownRow {
  readonly key: string;
  readonly label: string;
  /** Preformatted display value, e.g. "45.2 GB". This component never formats. */
  readonly value: string;
  /** 1-based category color slot; values above 5 wrap. */
  readonly colorIndex: number;
}

export interface BreakdownListProps {
  readonly rows: readonly BreakdownRow[];
  readonly ariaLabel?: string;
}

const CATEGORY_SLOTS = 5;

/** Legend-style list of categories: color dot, label, and size. */
export function BreakdownList({ rows, ariaLabel }: BreakdownListProps) {
  return (
    <ul className="lm-breakdown" aria-label={ariaLabel}>
      {rows.map((row) => {
        const slot = ((row.colorIndex - 1) % CATEGORY_SLOTS) + 1;
        return (
          <li className="lm-breakdown__row" key={row.key}>
            <span className={`lm-breakdown__dot lm-breakdown__dot--${slot}`} aria-hidden="true" />
            <span className="lm-breakdown__label">{row.label}</span>
            <span className="lm-breakdown__value">{row.value}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `packages/ui/src/components/BreakdownList.css`:

```css
.lm-breakdown {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.lm-breakdown__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.lm-breakdown__dot {
  width: 14px;
  height: 14px;
  flex: none;
  border-radius: var(--radius-full);
  border: var(--border-width) solid var(--glass-surface-border);
}
.lm-breakdown__label {
  color: var(--color-text);
  font-size: var(--font-size-lg);
}
.lm-breakdown__value {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-size: var(--font-size-lg);
  font-variant-numeric: tabular-nums;
}
.lm-breakdown__dot--1 {
  background: var(--color-category-1);
}
.lm-breakdown__dot--2 {
  background: var(--color-category-2);
}
.lm-breakdown__dot--3 {
  background: var(--color-category-3);
}
.lm-breakdown__dot--4 {
  background: var(--color-category-4);
}
.lm-breakdown__dot--5 {
  background: var(--color-category-5);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/BreakdownList.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 6: Export it and add it to the Playground**

In `packages/ui/src/index.ts`, add after the `MetricCard` export:

```ts
export * from './components/BreakdownList';
```

In `apps/desktop/src/pages/PlaygroundPage.tsx`, add `BreakdownList` to the `@luman/ui` import and add:

```tsx
<Section title="Breakdown List">
  <BreakdownList
    ariaLabel="Storage by category"
    rows={[
      { key: 'system', label: 'System', value: '45.2 GB', colorIndex: 1 },
      { key: 'apps', label: 'Apps', value: '120.5 GB', colorIndex: 2 },
      { key: 'documents', label: 'Documents', value: '80.1 GB', colorIndex: 3 },
    ]}
  />
</Section>
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm test:unit && pnpm typecheck`, then check `/playground` in both themes — the three dots must be clearly distinguishable from each other.

```bash
git add packages/ui/src/components/BreakdownList.tsx packages/ui/src/components/BreakdownList.css packages/ui/src/components/BreakdownList.test.tsx packages/ui/src/index.ts apps/desktop/src/pages/PlaygroundPage.tsx
git commit -m "feat(ui): add BreakdownList for storage categories"
```

---

## Task 9: HeroBanner component

**Files:**
- Create: `packages/ui/src/components/HeroBanner.tsx`, `packages/ui/src/components/HeroBanner.css`
- Modify: `packages/ui/src/index.ts`, `apps/desktop/src/pages/PlaygroundPage.tsx`
- Test: `packages/ui/src/components/HeroBanner.test.tsx` (create)

**Interfaces:**
- Consumes: `--font-size-hero`, `--font-size-hero-sub` (Task 1); `StorageOrb` (Task 6) is passed in by the caller as `visual`, not imported here.
- Produces:

  ```ts
  interface HeroBannerProps {
    readonly headline: string;
    readonly subhead?: ReactNode;
    readonly action?: ReactNode;
    readonly visual?: ReactNode;
  }
  ```

  Renders the headline as the page's `<h1>`. Purely presentational — it derives nothing.

- [ ] **Step 1: Write the failing test**

Create `packages/ui/src/components/HeroBanner.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroBanner } from './HeroBanner';

describe('HeroBanner', () => {
  it('renders the headline as a level-1 heading', () => {
    render(<HeroBanner headline="Storage is healthy" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Storage is healthy' })).toBeInTheDocument();
  });

  it('renders the subhead and action when given', () => {
    render(
      <HeroBanner
        headline="Storage is healthy"
        subhead="42.5 GB can be safely reclaimed."
        action={<button type="button">Smart Scan</button>}
      />,
    );
    expect(screen.getByText('42.5 GB can be safely reclaimed.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Smart Scan' })).toBeInTheDocument();
  });

  it('omits the visual container when no visual is given', () => {
    const { container } = render(<HeroBanner headline="Storage is healthy" />);
    expect(container.querySelector('.lm-hero__visual')).toBeNull();
  });

  it('renders the visual when given', () => {
    const { container } = render(
      <HeroBanner headline="Storage is healthy" visual={<div data-testid="orb" />} />,
    );
    expect(container.querySelector('.lm-hero__visual')).not.toBeNull();
    expect(screen.getByTestId('orb')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit packages/ui/src/components/HeroBanner.test.tsx`
Expected: FAIL — `Failed to resolve import "./HeroBanner"`.

- [ ] **Step 3: Write the component**

Create `packages/ui/src/components/HeroBanner.tsx`:

```tsx
import type { ReactNode } from 'react';
import './HeroBanner.css';

export interface HeroBannerProps {
  /** The page's primary heading. Rendered as <h1>. */
  readonly headline: string;
  readonly subhead?: ReactNode;
  /** Primary call to action, e.g. a Button. */
  readonly action?: ReactNode;
  /** Decorative illustration, e.g. <StorageOrb />. */
  readonly visual?: ReactNode;
}

/**
 * Hero band: headline, supporting line, one call to action, and an optional
 * decorative visual. Purely presentational — callers derive the copy.
 */
export function HeroBanner({ headline, subhead, action, visual }: HeroBannerProps) {
  return (
    <section className="lm-hero">
      <div className="lm-hero__copy">
        <h1 className="lm-hero__headline">{headline}</h1>
        {subhead != null && <p className="lm-hero__subhead">{subhead}</p>}
        {action != null && <div className="lm-hero__action">{action}</div>}
      </div>
      {visual != null && <div className="lm-hero__visual">{visual}</div>}
    </section>
  );
}
```

- [ ] **Step 4: Write the styles**

Create `packages/ui/src/components/HeroBanner.css`:

```css
.lm-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-6);
  margin-bottom: var(--space-7);
}
.lm-hero__copy {
  flex: 1;
  min-width: 0;
}
.lm-hero__headline {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-hero);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-text);
}
.lm-hero__subhead {
  margin: 0 0 var(--space-5);
  font-size: var(--font-size-hero-sub);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-normal);
  color: var(--color-text-secondary);
}
.lm-hero__action {
  display: flex;
  gap: var(--space-3);
}
.lm-hero__visual {
  flex: none;
  line-height: 0;
}

/* Stack the hero below the bento breakpoint, visual first. */
@media (max-width: 900px) {
  .lm-hero {
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: var(--space-5);
  }
  .lm-hero__headline {
    font-size: var(--font-size-large-title);
  }
  .lm-hero__subhead {
    font-size: var(--font-size-xl);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit packages/ui/src/components/HeroBanner.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 6: Export it and add it to the Playground**

In `packages/ui/src/index.ts`, add after the `BreakdownList` export:

```ts
export * from './components/HeroBanner';
```

In `apps/desktop/src/pages/PlaygroundPage.tsx`, add `HeroBanner` to the `@luman/ui` import and add:

```tsx
<Section title="Hero Banner">
  <HeroBanner
    headline="Storage is healthy"
    subhead="Your Mac is optimized. 45.0 GB can be safely reclaimed."
    action={<Button variant="primary">Smart Scan</Button>}
    visual={<StorageOrb size={200} />}
  />
</Section>
```

- [ ] **Step 7: Verify and commit**

Run: `pnpm test:unit && pnpm typecheck`, then check `/playground` in both themes and narrow the window below 900px to confirm the hero stacks with the orb above the copy.

```bash
git add packages/ui/src/components/HeroBanner.tsx packages/ui/src/components/HeroBanner.css packages/ui/src/components/HeroBanner.test.tsx packages/ui/src/index.ts apps/desktop/src/pages/PlaygroundPage.tsx
git commit -m "feat(ui): add HeroBanner for the dashboard hero band"
```

---

## Task 10: Navigation model and placeholder pages

**Files:**
- Create: `apps/desktop/src/pages/CleanupPage.tsx`, `apps/desktop/src/pages/DeveloperCenterPage.tsx`
- Modify: `apps/desktop/src/stores/navigation-store.ts`, `apps/desktop/src/app/nav-items.ts`, `apps/desktop/src/app/router.tsx`, `apps/desktop/src/pages/index.ts`
- Test: `apps/desktop/src/app/nav-items.test.ts` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `NavKey` gains `'cleanup'`, `'applications'`, `'developer-center'`.
  - `NavItem` gains `readonly group: 'primary' | 'secondary'`.
  - `NAV_ITEMS` — 9 entries; `primary` group in mockup order, `secondary` group holds Playground and Settings.
  - Routes `/cleanup` and `/developer-center`.
  - `CleanupPage`, `DeveloperCenterPage` exported from `apps/desktop/src/pages/index.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/app/nav-items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NAV_ITEMS } from './nav-items';
import { router } from './router';

describe('NAV_ITEMS', () => {
  it('lists the primary destinations in the redesign order', () => {
    const primary = NAV_ITEMS.filter((i) => i.group === 'primary').map((i) => i.label);
    expect(primary).toEqual([
      'Dashboard',
      'Smart Scan',
      'Cleanup',
      'Space Lens',
      'Applications',
      'Developer Center',
      'History',
    ]);
  });

  it('puts Playground and Settings in the secondary group', () => {
    const secondary = NAV_ITEMS.filter((i) => i.group === 'secondary').map((i) => i.label);
    expect(secondary).toEqual(['Playground', 'Settings']);
  });

  it('uses unique keys and paths', () => {
    expect(new Set(NAV_ITEMS.map((i) => i.key)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((i) => i.path)).size).toBe(NAV_ITEMS.length);
  });

  it('has a real route behind every nav item', () => {
    const paths = new Set(
      (router.routes[0]!.children ?? []).map((child) =>
        child.index ? '/' : `/${child.path ?? ''}`,
      ),
    );
    for (const item of NAV_ITEMS) {
      expect(paths.has(item.path)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/app/nav-items.test.ts`
Expected: FAIL — `i.group` is undefined, so the primary list comes back empty.

- [ ] **Step 3: Widen `NavKey`**

In `apps/desktop/src/stores/navigation-store.ts`, replace the `NavKey` type:

```ts
/** Ids of the primary navigation destinations. */
export type NavKey =
  | 'dashboard'
  | 'smart-scan'
  | 'cleanup'
  | 'space-lens'
  | 'applications'
  | 'developer-center'
  | 'history'
  | 'playground'
  | 'settings';
```

- [ ] **Step 4: Create the two placeholder pages**

Create `apps/desktop/src/pages/CleanupPage.tsx`:

```tsx
import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for guided cleanup (implemented in a later sprint). */
export function CleanupPage() {
  return (
    <Page title="Cleanup" description="Review and reclaim space safely.">
      <EmptyState
        icon="🧹"
        title="Cleanup is coming soon"
        description="Guided cleanup depends on the scanning engine, which arrives in a later sprint. Nothing is ever deleted without your explicit confirmation."
      />
    </Page>
  );
}
```

Create `apps/desktop/src/pages/DeveloperCenterPage.tsx`:

```tsx
import { EmptyState } from '@luman/ui';
import { Page } from '../components/common';

/** Placeholder for developer tooling caches (implemented in a later sprint). */
export function DeveloperCenterPage() {
  return (
    <Page title="Developer Center" description="Reclaim space from developer tooling.">
      <EmptyState
        icon="⌘"
        title="Developer Center is coming soon"
        description="Caches from Xcode, npm, and other toolchains will be listed here once the scanning engine lands."
      />
    </Page>
  );
}
```

- [ ] **Step 5: Rewrite the nav items**

Replace `apps/desktop/src/app/nav-items.ts`:

```tsx
import {
  LayoutDashboard,
  ScanSearch,
  Sparkles,
  PieChart,
  LayoutGrid,
  Terminal,
  Clock,
  Settings,
  Palette,
  type LucideIcon,
} from 'lucide-react';
import type { NavKey } from '../stores';

/** `primary` renders in the main list; `secondary` pins to the sidebar footer. */
export type NavGroup = 'primary' | 'secondary';

export interface NavItem {
  readonly key: NavKey;
  readonly label: string;
  readonly path: string;
  readonly icon: LucideIcon;
  readonly group: NavGroup;
}

/** Primary navigation destinations, in redesign order. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard, group: 'primary' },
  { key: 'smart-scan', label: 'Smart Scan', path: '/smart-scan', icon: ScanSearch, group: 'primary' },
  { key: 'cleanup', label: 'Cleanup', path: '/cleanup', icon: Sparkles, group: 'primary' },
  { key: 'space-lens', label: 'Space Lens', path: '/space-lens', icon: PieChart, group: 'primary' },
  {
    key: 'applications',
    label: 'Applications',
    path: '/applications',
    icon: LayoutGrid,
    group: 'primary',
  },
  {
    key: 'developer-center',
    label: 'Developer Center',
    path: '/developer-center',
    icon: Terminal,
    group: 'primary',
  },
  { key: 'history', label: 'History', path: '/history', icon: Clock, group: 'primary' },
  { key: 'playground', label: 'Playground', path: '/playground', icon: Palette, group: 'secondary' },
  { key: 'settings', label: 'Settings', path: '/settings', icon: Settings, group: 'secondary' },
];
```

- [ ] **Step 6: Register the routes and exports**

In `apps/desktop/src/pages/index.ts`, add:

```ts
export * from './CleanupPage';
export * from './DeveloperCenterPage';
```

In `apps/desktop/src/app/router.tsx`, add `CleanupPage` and `DeveloperCenterPage` to the `../pages` import, then add these two children after the `smart-scan` route:

```tsx
      { path: 'cleanup', element: withTransition(<CleanupPage />) },
      { path: 'developer-center', element: withTransition(<DeveloperCenterPage />) },
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/app/nav-items.test.ts`
Expected: PASS — 4 tests, including the route-existence check.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS. `Sidebar` still renders every item in one flat list — the grouping is used in Task 11.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/stores/navigation-store.ts apps/desktop/src/app/nav-items.ts apps/desktop/src/app/nav-items.test.ts apps/desktop/src/app/router.tsx apps/desktop/src/pages/CleanupPage.tsx apps/desktop/src/pages/DeveloperCenterPage.tsx apps/desktop/src/pages/index.ts
git commit -m "feat(desktop): add Cleanup and Developer Center destinations

Nav items gain a primary/secondary group; a test asserts every nav item
has a real route behind it."
```

---

## Task 11: Sidebar redesign

**Files:**
- Modify: `apps/desktop/src/components/layout/Sidebar.tsx`, `apps/desktop/src/components/layout/Sidebar.css`
- Test: `apps/desktop/src/components/layout/Sidebar.test.tsx` (create)

**Interfaces:**
- Consumes: `NAV_ITEMS` with `group` (Task 10); `Glass` `variant="chrome"` (Task 3); `--sidebar-width: 240px` (Task 1).
- Produces: sidebar with a brand block (logo tile, "Luman", "Storage Intelligence" caption), a primary nav list, and a footer holding the secondary group above the collapse toggle. Keeps `aria-label="Primary"`, collapse behavior, and roving arrow-key navigation across **all** links including the secondary group.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/components/layout/Sidebar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useNavigationStore } from '../../stores';

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar />
    </MemoryRouter>,
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    useNavigationStore.setState({ sidebarCollapsed: false, active: 'dashboard' });
  });

  it('shows the brand with its subtitle when expanded', () => {
    renderSidebar();
    expect(screen.getByText('Luman')).toBeInTheDocument();
    expect(screen.getByText('Storage Intelligence')).toBeInTheDocument();
  });

  it('hides the brand subtitle when collapsed', () => {
    useNavigationStore.setState({ sidebarCollapsed: true });
    renderSidebar();
    expect(screen.queryByText('Storage Intelligence')).toBeNull();
  });

  it('renders every destination, including the new ones', () => {
    renderSidebar();
    for (const label of ['Dashboard', 'Cleanup', 'Developer Center', 'Applications', 'Settings']) {
      expect(screen.getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('separates the secondary group into the footer', () => {
    const { container } = renderSidebar();
    const footerLinks = container.querySelectorAll('.lm-sidebar__footer-nav a');
    expect(Array.from(footerLinks).map((a) => a.textContent)).toEqual(['Playground', 'Settings']);
  });

  it('moves focus between links with the arrow keys', async () => {
    renderSidebar();
    screen.getByRole('link', { name: /Dashboard/ }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(screen.getByRole('link', { name: /Smart Scan/ }));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/Sidebar.test.tsx`
Expected: FAIL — "Storage Intelligence" is not in the document.

- [ ] **Step 3: Rewrite the component**

Replace `apps/desktop/src/components/layout/Sidebar.tsx`:

```tsx
import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { Glass, Icon, IconButton } from '@luman/ui';
import { HardDrive, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '../../app/nav-items';
import { useNavigationStore } from '../../stores';
import './Sidebar.css';

const PRIMARY = NAV_ITEMS.filter((i) => i.group === 'primary');
const SECONDARY = NAV_ITEMS.filter((i) => i.group === 'secondary');

/**
 * Left navigation rail on frosted chrome glass. Brand block, primary
 * destinations, then a pinned footer group. Supports active highlight,
 * collapse, and roving arrow-key navigation across every link.
 */
export function Sidebar() {
  const setActive = useNavigationStore((s) => s.setActive);
  const collapsed = useNavigationStore((s) => s.sidebarCollapsed);
  const toggle = useNavigationStore((s) => s.toggleSidebar);
  const navRef = useRef<HTMLElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const links = Array.from(navRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    const idx = links.findIndex((l) => l === document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    const next =
      e.key === 'ArrowDown' ? (idx + 1) % links.length : (idx - 1 + links.length) % links.length;
    links[next]?.focus();
  };

  const renderLink = (item: NavItem) => (
    <li key={item.key}>
      <NavLink
        to={item.path}
        end={item.path === '/'}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          ['lm-sidebar__link', isActive && 'lm-sidebar__link--active'].filter(Boolean).join(' ')
        }
        onClick={() => setActive(item.key)}
      >
        <Icon icon={item.icon} size="sm" />
        {!collapsed && <span>{item.label}</span>}
      </NavLink>
    </li>
  );

  return (
    <Glass
      variant="chrome"
      className={['lm-sidebar', collapsed && 'lm-sidebar--collapsed'].filter(Boolean).join(' ')}
    >
      <nav aria-label="Primary" className="lm-sidebar__nav" ref={navRef} onKeyDown={onKeyDown}>
        <div className="lm-sidebar__brand" data-tauri-drag-region>
          <span className="lm-sidebar__logo" aria-hidden="true">
            <Icon icon={HardDrive} size="md" />
          </span>
          {!collapsed && (
            <span className="lm-sidebar__brand-text">
              <span className="lm-sidebar__name">Luman</span>
              <span className="lm-sidebar__tagline">Storage Intelligence</span>
            </span>
          )}
        </div>

        <ul className="lm-sidebar__list">{PRIMARY.map(renderLink)}</ul>

        <div className="lm-sidebar__footer">
          <ul className="lm-sidebar__footer-nav">{SECONDARY.map(renderLink)}</ul>
          <div className="lm-sidebar__toggle">
            <IconButton
              icon={collapsed ? PanelLeftOpen : PanelLeftClose}
              label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggle}
            />
          </div>
        </div>
      </nav>
    </Glass>
  );
}
```

- [ ] **Step 4: Rewrite the styles**

Replace `apps/desktop/src/components/layout/Sidebar.css`:

```css
.lm-sidebar {
  width: var(--sidebar-width);
  height: 100%;
  border-radius: 0;
  border-top: none;
  border-bottom: none;
  border-left: none;
  transition: width var(--motion-page) var(--easing-standard);
  z-index: var(--z-sidebar);
}
.lm-sidebar--collapsed {
  width: var(--sidebar-width-collapsed);
}
.lm-sidebar__nav {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-3);
  gap: var(--space-2);
}
.lm-sidebar__brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--header-height);
  padding: var(--space-2);
  margin-bottom: var(--space-4);
}
.lm-sidebar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  border: var(--border-width) solid var(--glass-surface-border);
  color: var(--color-accent);
}
.lm-sidebar__brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.lm-sidebar__name {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  color: var(--color-text);
}
.lm-sidebar__tagline {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.lm-sidebar__list,
.lm-sidebar__footer-nav {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.lm-sidebar__list {
  flex: 1;
}
.lm-sidebar__link {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-medium);
  border: var(--border-width) solid transparent;
  transition:
    background var(--transition-fast),
    color var(--transition-fast);
}
.lm-sidebar__link:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}
.lm-sidebar__link--active {
  background: var(--color-accent-soft);
  border-color: var(--glass-surface-border);
  color: var(--color-accent);
  font-weight: var(--font-weight-semibold);
}
.lm-sidebar__footer {
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: var(--border-width) solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.lm-sidebar__toggle {
  display: flex;
  justify-content: flex-end;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/Sidebar.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 6: Verify visually, then run the suite**

Run: `pnpm dev`. Expected: 240px frosted rail, brand block at top, seven primary items, Playground + Settings pinned above the collapse toggle. Collapse hides labels and the tagline while keeping icons.

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/components/layout/Sidebar.tsx apps/desktop/src/components/layout/Sidebar.css apps/desktop/src/components/layout/Sidebar.test.tsx
git commit -m "feat(desktop): redesign the sidebar with a brand block and pinned footer group"
```

---

## Task 12: Header redesign, Quick Action menu, Toolbar removal

**Files:**
- Create: `apps/desktop/src/app/quick-actions.ts` (moved from `components/dashboard/quick-actions.ts`)
- Create: `apps/desktop/src/components/layout/QuickActionMenu.tsx`
- Modify: `apps/desktop/src/components/layout/Header.tsx`, `Header.css`, `AppLayout.tsx`
- Delete: `apps/desktop/src/components/layout/Toolbar.tsx`, `Toolbar.css`, `apps/desktop/src/components/dashboard/quick-actions.ts`
- Modify: `packages/ui/src/styles/tokens.css` (drop `--toolbar-height`)
- Test: `apps/desktop/src/components/layout/Header.test.tsx` (create)

**Interfaces:**
- Consumes: `NAV_ITEMS` (Task 10), `Popover`, `Glass`, `Icon`, `IconButton`, `Button` from `@luman/ui`.
- Produces:
  - `apps/desktop/src/app/quick-actions.ts` exports `interface QuickAction { readonly key: string; readonly label: string; readonly description: string; readonly icon: LucideIcon; readonly path: string }` and `QUICK_ACTIONS` — glyph strings replaced by Lucide components.
  - `QuickActionMenu` — a `Popover` whose trigger is the primary "Quick Action" button and whose panel lists `QUICK_ACTIONS` as buttons that navigate.
  - `Header` renders the page title, breadcrumb, a **disabled** search input, `QuickActionMenu`, the theme toggle, and a settings shortcut.
  - `Toolbar` no longer exists; `AppLayout` renders `Sidebar → Header → content → StatusBar`.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/components/layout/Header.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Header } from './Header';
import { LocationProbe } from '../../test/render-with-services';

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
      <LocationProbe />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('shows the title for the current route', () => {
    renderHeader('/smart-scan');
    expect(screen.getByText('Smart Scan')).toBeInTheDocument();
  });

  it('shows search as unavailable rather than shipping a dead input', () => {
    renderHeader();
    const search = screen.getByRole('searchbox', { name: /search/i });
    expect(search).toBeDisabled();
  });

  it('opens the Quick Action menu and lists the actions', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: 'Quick Action' }));
    expect(screen.getByRole('button', { name: /Smart Scan/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Large Files/ })).toBeInTheDocument();
  });

  it('routes to Large Files from the Quick Action menu', async () => {
    renderHeader();
    await userEvent.click(screen.getByRole('button', { name: 'Quick Action' }));
    await userEvent.click(screen.getByRole('button', { name: /Large Files/ }));
    expect(screen.getByTestId('location').textContent).toBe('/large-files');
  });

  it('exposes the theme toggle', () => {
    renderHeader();
    expect(screen.getByRole('button', { name: /Switch theme/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/Header.test.tsx`
Expected: FAIL — no searchbox role; the header renders only a title and breadcrumb.

- [ ] **Step 3: Move quick actions to the app layer with Lucide icons**

Create `apps/desktop/src/app/quick-actions.ts`:

```ts
import { ScanSearch, PieChart, FileStack, LayoutGrid, Settings, type LucideIcon } from 'lucide-react';

export interface QuickAction {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly path: string;
}

/**
 * Actions offered by the header's Quick Action menu. Large Files has no sidebar
 * entry in the redesigned nav, so this menu is its only in-app route.
 */
export const QUICK_ACTIONS: readonly QuickAction[] = [
  {
    key: 'smart-scan',
    label: 'Smart Scan',
    description: 'Analyze storage',
    icon: ScanSearch,
    path: '/smart-scan',
  },
  {
    key: 'space-lens',
    label: 'Space Lens',
    description: 'Visualize usage',
    icon: PieChart,
    path: '/space-lens',
  },
  {
    key: 'large-files',
    label: 'Large Files',
    description: 'Find big files',
    icon: FileStack,
    path: '/large-files',
  },
  {
    key: 'applications',
    label: 'Applications',
    description: 'Manage apps',
    icon: LayoutGrid,
    path: '/applications',
  },
  {
    key: 'settings',
    label: 'Settings',
    description: 'Preferences',
    icon: Settings,
    path: '/settings',
  },
];
```

Delete `apps/desktop/src/components/dashboard/quick-actions.ts`.

- [ ] **Step 4: Write the Quick Action menu**

Create `apps/desktop/src/components/layout/QuickActionMenu.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { Popover, Icon } from '@luman/ui';
import { QUICK_ACTIONS } from '../../app/quick-actions';

/**
 * The header's primary action. A menu rather than a single button so that
 * Large Files stays reachable — it has no sidebar entry in the redesigned nav.
 */
export function QuickActionMenu() {
  const navigate = useNavigate();

  return (
    <Popover
      align="end"
      trigger={(props) => (
        <button type="button" className="lm-button lm-button--primary" {...props}>
          Quick Action
        </button>
      )}
    >
      <ul className="lm-quickmenu">
        {QUICK_ACTIONS.map((action) => (
          <li key={action.key}>
            <button
              type="button"
              className="lm-quickmenu__item"
              onClick={() => navigate(action.path)}
            >
              <Icon icon={action.icon} size="sm" />
              <span className="lm-quickmenu__text">
                <span className="lm-quickmenu__label">{action.label}</span>
                <span className="lm-quickmenu__desc">{action.description}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Popover>
  );
}
```

- [ ] **Step 5: Rewrite the Header**

Replace `apps/desktop/src/components/layout/Header.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { Glass, Icon, IconButton, type ThemeMode } from '@luman/ui';
import { Search, Sun, Moon, Monitor, Settings } from 'lucide-react';
import { NAV_ITEMS } from '../../app/nav-items';
import { useThemeStore } from '../../theme';
import { Breadcrumb } from './Breadcrumb';
import { QuickActionMenu } from './QuickActionMenu';
import './Header.css';

const EXTRA_TITLES: Record<string, string> = {
  '/large-files': 'Large Files',
};

const NEXT_MODE: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const MODE_ICON = { light: Sun, dark: Moon, system: Monitor } as const;

function titleForPath(pathname: string): string {
  const navMatch = NAV_ITEMS.find((i) =>
    i.path === '/' ? pathname === '/' : pathname.startsWith(i.path),
  );
  if (navMatch) return navMatch.label;
  const extra = Object.keys(EXTRA_TITLES).find((p) => pathname.startsWith(p));
  return extra ? EXTRA_TITLES[extra]! : 'Luman';
}

/**
 * Top bar: section title + breadcrumb, a search affordance, the Quick Action
 * menu, and the icon cluster (theme toggle, settings). Search is deliberately
 * disabled — an enabled box that does nothing is worse than one marked pending.
 */
export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <Glass variant="chrome" className="lm-header" data-tauri-drag-region>
      {/*
        Deliberately not a heading element. The page content owns the document's
        single <h1> — on the dashboard that is the hero. A heading here would
        duplicate it and break the heading hierarchy.
      */}
      <div className="lm-header__titles">
        <div className="lm-header__title">{titleForPath(pathname)}</div>
        <Breadcrumb />
      </div>

      {/*
        Not wrapped in <Tooltip>: it renders a <span>, and a <div> inside a
        <span> is invalid nesting that would also break this element's `flex: 1`.
        The disabled state plus the label and title carry the message instead.
      */}
      <div className="lm-header__search" title="Search is coming soon">
        <span className="lm-header__search-icon" aria-hidden="true">
          <Icon icon={Search} size="sm" />
        </span>
        <input
          type="search"
          className="lm-header__search-input"
          placeholder="Search files, apps…"
          aria-label="Search (coming soon)"
          disabled
        />
      </div>

      <div className="lm-header__actions">
        <QuickActionMenu />
        <IconButton
          icon={MODE_ICON[mode]}
          label={`Switch theme (current: ${mode})`}
          onClick={() => setMode(NEXT_MODE[mode])}
        />
        <IconButton icon={Settings} label="Open settings" onClick={() => navigate('/settings')} />
      </div>
    </Glass>
  );
}
```

- [ ] **Step 6: Write the Header styles**

Replace `apps/desktop/src/components/layout/Header.css`:

```css
.lm-header {
  height: var(--header-height);
  border-radius: 0;
  border-top: none;
  border-left: none;
  border-right: none;
  display: flex;
  align-items: center;
  gap: var(--space-5);
  padding: 0 var(--space-5);
  z-index: var(--z-sticky);
}
.lm-header__titles {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
  flex: none;
}
.lm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  color: var(--color-text);
}
.lm-header__search {
  position: relative;
  flex: 1;
  max-width: 380px;
}
.lm-header__search-icon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  line-height: 0;
  pointer-events: none;
}
.lm-header__search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-6);
  border-radius: var(--radius-md);
  border: var(--border-width) solid var(--color-border);
  background: var(--glass-surface-bg);
  color: var(--color-text);
  font-size: var(--font-size-body);
  font-family: inherit;
}
.lm-header__search-input::placeholder {
  color: var(--color-text-muted);
}
.lm-header__search-input:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
.lm-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

/* Quick Action menu */
.lm-quickmenu {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 220px;
}
.lm-quickmenu__item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.lm-quickmenu__item:hover {
  background: var(--color-surface-hover);
}
.lm-quickmenu__text {
  display: flex;
  flex-direction: column;
}
.lm-quickmenu__label {
  font-weight: var(--font-weight-medium);
}
.lm-quickmenu__desc {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}

@media (max-width: 900px) {
  .lm-header__search {
    display: none;
  }
}
```

- [ ] **Step 7: Remove the Toolbar**

Delete `apps/desktop/src/components/layout/Toolbar.tsx` and `apps/desktop/src/components/layout/Toolbar.css`.

Replace `apps/desktop/src/components/layout/AppLayout.tsx`:

```tsx
import { Outlet } from 'react-router-dom';
import { Aurora, ScrollableArea } from '@luman/ui';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import './AppLayout.css';

/** The application shell: aurora + sidebar + header + content + status. */
export function AppLayout() {
  return (
    <>
      <Aurora />
      <div className="lm-shell">
        <Sidebar />
        <div className="lm-shell__main">
          <Header />
          <ScrollableArea className="lm-shell__content">
            <div className="lm-shell__container">
              <Outlet />
            </div>
          </ScrollableArea>
          <StatusBar />
        </div>
      </div>
    </>
  );
}
```

Add the content container to `apps/desktop/src/components/layout/AppLayout.css`, replacing the `.lm-shell__content` rule:

```css
.lm-shell__content {
  flex: 1;
  padding: var(--space-6) var(--space-5);
}
.lm-shell__container {
  max-width: var(--content-max-width);
  margin: 0 auto;
  width: 100%;
}
```

In `packages/ui/src/styles/tokens.css`, delete the line `--toolbar-height: 44px;`.

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/Header.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 9: Run the full suite and typecheck**

Run: `pnpm test:unit && pnpm typecheck`
Expected: The `QuickActionsWidget` still imports the deleted `./quick-actions`, so typecheck fails there. Fix it now by pointing that import at `../../app/quick-actions` — the widget itself is removed in Task 17, and this keeps the tree green in the meantime. `QuickActionButton` takes a `ReactNode` icon, so pass `<Icon icon={action.icon} size="sm" />`.

Re-run until both commands pass.

- [ ] **Step 10: Verify visually**

Run: `pnpm dev`. Expected: 56px frosted top bar; title at the left, dimmed search, "Quick Action" opening a five-item menu, theme toggle cycling Light → Dark → System, and the settings icon routing to `/settings`. No toolbar strip.

- [ ] **Step 11: Commit**

```bash
git add -A apps/desktop/src/components/layout apps/desktop/src/app/quick-actions.ts apps/desktop/src/components/dashboard/quick-actions.ts packages/ui/src/styles/tokens.css
git commit -m "feat(desktop): redesign the header and remove the toolbar

Quick Action becomes a menu so Large Files stays reachable without a
sidebar entry; the theme toggle moves into the header icon cluster."
```

---

## Task 13: StatusBar restyle

**Files:**
- Modify: `apps/desktop/src/components/layout/StatusBar.css`
- Test: `apps/desktop/src/components/layout/StatusBar.test.tsx` (create)

**Interfaces:**
- Consumes: tokens from Task 1. No JSX or props change — `StatusBar.tsx` is untouched.
- Produces: a status strip that reads as part of the aurora shell rather than a solid bar.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/components/layout/StatusBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from './StatusBar';
import { useApplicationStore } from '../../stores';

describe('StatusBar', () => {
  beforeEach(() => {
    useApplicationStore.setState({ ready: false, initError: null });
  });

  it('reports the starting state before the app is ready', () => {
    render(<StatusBar />);
    expect(screen.getByText('Starting…')).toBeInTheDocument();
  });

  it('reports readiness once the app is ready', () => {
    useApplicationStore.setState({ ready: true });
    render(<StatusBar />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders inside a contentinfo landmark', () => {
    const { container } = render(<StatusBar />);
    expect(container.querySelector('footer.lm-statusbar')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it passes or fails honestly**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/StatusBar.test.tsx`
Expected: PASS. This task is a pure restyle, so the test is characterization — it locks in behavior that must survive the CSS change. If `useApplicationStore`'s initial state differs, adjust the `beforeEach` to match reality rather than changing the store.

- [ ] **Step 3: Restyle**

Replace `apps/desktop/src/components/layout/StatusBar.css`:

```css
.lm-statusbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--statusbar-height);
  flex: none;
  padding: 0 var(--space-5);
  border-top: var(--border-width) solid var(--color-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: saturate(180%) blur(var(--glass-blur-chrome));
  backdrop-filter: saturate(180%) blur(var(--glass-blur-chrome));
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
}
.lm-statusbar__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-warning);
}
.lm-statusbar__dot--ready {
  background: var(--color-success);
}
.lm-statusbar__spacer {
  flex: 1;
}
.lm-statusbar__muted {
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: Re-run the test and verify visually**

Run: `pnpm vitest run --project unit apps/desktop/src/components/layout/StatusBar.test.tsx`
Expected: PASS — same 3 tests.

Run `pnpm dev`. Expected: a thin frosted strip at the bottom; the dot is green once ready, amber while starting.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/components/layout/StatusBar.css apps/desktop/src/components/layout/StatusBar.test.tsx
git commit -m "feat(desktop): restyle the status bar for the aurora shell"
```

---

## Task 14: Storage Used and Health widgets

**Files:**
- Create: `apps/desktop/src/components/dashboard/use-storage-overview.ts`
- Create: `apps/desktop/src/components/dashboard/StorageUsedWidget.tsx`
- Create: `apps/desktop/src/components/dashboard/HealthWidget.tsx`
- Create: `apps/desktop/src/components/dashboard/StorageUsedWidget.test.tsx`, `HealthWidget.test.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**Interfaces:**
- Consumes: `MetricCard` (Task 7), `computeHealthScore` (Task 4), `StorageService.getOverview` (Task 5), the existing `useAsync` hook and `StateView`.
- Produces:
  - `useStorageOverview(): { status: 'loading' | 'success' | 'error'; data: StorageOverview | null; reload: () => void }` — a thin shared wrapper over `useAsync(() => storage.getOverview(), [])`, so the three overview-driven pieces share one call shape.
  - `<StorageUsedWidget />` — used / total with a two-segment `ProgressBar`.
  - `<HealthWidget />` — score percent plus the band description.

- [ ] **Step 1: Write the failing tests**

Create `apps/desktop/src/components/dashboard/StorageUsedWidget.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../../test/render-with-services';
import { MockStorageService } from '../../services/mocks';
import { StorageUsedWidget } from './StorageUsedWidget';

describe('StorageUsedWidget', () => {
  it('shows used and total storage once loaded', async () => {
    renderWithServices(<StorageUsedWidget />, {
      services: { storage: new MockStorageService() },
    });
    expect(await screen.findByText('331.8 GB')).toBeInTheDocument();
    expect(screen.getByText('/ 460.4 GB')).toBeInTheDocument();
  });

  it('shows the empty state when there is no overview', async () => {
    renderWithServices(<StorageUsedWidget />, {
      services: { storage: new MockStorageService({ overview: null }) },
    });
    expect(await screen.findByText('Storage information unavailable')).toBeInTheDocument();
  });

  it('shows the error state when the service fails', async () => {
    renderWithServices(<StorageUsedWidget />, {
      services: { storage: new MockStorageService({ failWith: new Error('nope') }) },
    });
    expect(await screen.findByText('Could not read storage')).toBeInTheDocument();
  });
});
```

Create `apps/desktop/src/components/dashboard/HealthWidget.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../../test/render-with-services';
import { MockStorageService } from '../../services/mocks';
import { HealthWidget } from './HealthWidget';

const GB = 1024 ** 3;

describe('HealthWidget', () => {
  it('renders the score and its description', async () => {
    renderWithServices(<HealthWidget />, {
      services: {
        storage: new MockStorageService({
          overview: {
            volume: 'Macintosh HD',
            totalBytes: 1000 * GB,
            usedBytes: 100 * GB,
            freeBytes: 900 * GB,
            reclaimableBytes: 0,
          },
        }),
      },
    });
    expect(await screen.findByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Plenty of free space.')).toBeInTheDocument();
  });

  it('never claims hardware-level health', async () => {
    const { container } = renderWithServices(<HealthWidget />, {
      services: { storage: new MockStorageService() },
    });
    await screen.findByText('Health');
    expect(container.textContent).not.toMatch(/sector/i);
  });

  it('shows the empty state when there is no overview', async () => {
    renderWithServices(<HealthWidget />, {
      services: { storage: new MockStorageService({ overview: null }) },
    });
    expect(await screen.findByText('Health is unknown')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/StorageUsedWidget.test.tsx apps/desktop/src/components/dashboard/HealthWidget.test.tsx`
Expected: FAIL — `Failed to resolve import "./StorageUsedWidget"`.

- [ ] **Step 3: Write the shared overview hook**

Create `apps/desktop/src/components/dashboard/use-storage-overview.ts`:

```ts
import type { StorageOverview } from '@luman/core';
import { useServices } from '../../services';
import { useAsync } from './use-async';

/**
 * Shared accessor for the storage overview. The hero, the Storage Used card and
 * the Health card all read the same figures; funnelling them through one hook
 * keeps their loading and error handling identical.
 */
export function useStorageOverview() {
  const { storage } = useServices();
  return useAsync<StorageOverview | null>(() => storage.getOverview(), []);
}
```

- [ ] **Step 4: Write the Storage Used widget**

Create `apps/desktop/src/components/dashboard/StorageUsedWidget.tsx`:

```tsx
import { MetricCard, ProgressBar, StateView, type ProgressSegment, type ViewStatus } from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { HardDrive } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';

/** Metrics-row card: used vs total storage, with a utilization bar. */
export function StorageUsedWidget() {
  const { status, data, reload } = useStorageOverview();

  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'success' : 'empty';

  const segments: ProgressSegment[] = data
    ? [
        {
          fraction: (data.usedBytes - data.reclaimableBytes) / data.totalBytes,
          tone: 'accent',
          label: 'In use',
        },
        { fraction: data.reclaimableBytes / data.totalBytes, tone: 'warning', label: 'Reclaimable' },
      ]
    : [];

  if (viewStatus !== 'success' || !data) {
    return (
      <MetricCard label="Storage Used" value="—" icon={HardDrive}>
        <StateView
          status={viewStatus}
          loadingLabel="Reading storage…"
          emptyTitle="Storage information unavailable"
          emptyDescription="We couldn't determine your storage usage. Try refreshing."
          error={{
            title: 'Could not read storage',
            description: 'Something went wrong while reading storage usage.',
            onRetry: reload,
          }}
        />
      </MetricCard>
    );
  }

  return (
    <MetricCard
      label="Storage Used"
      value={formatBytes(data.usedBytes)}
      secondary={`/ ${formatBytes(data.totalBytes)}`}
      icon={HardDrive}
    >
      <ProgressBar segments={segments} ariaLabel="Storage utilization" />
    </MetricCard>
  );
}
```

- [ ] **Step 5: Write the Health widget**

Create `apps/desktop/src/components/dashboard/HealthWidget.tsx`:

```tsx
import { MetricCard, StateView, type MetricTone, type ViewStatus } from '@luman/ui';
import { computeHealthScore, type HealthBand } from '@luman/domain';
import { HeartPulse } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';

const TONE_FOR_BAND: Record<HealthBand, MetricTone> = {
  healthy: 'success',
  attention: 'warning',
  low: 'danger',
};

/** Metrics-row card: a derived storage health score. Never reads SMART data. */
export function HealthWidget() {
  const { status, data, reload } = useStorageOverview();

  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'success' : 'empty';

  if (viewStatus !== 'success' || !data) {
    return (
      <MetricCard label="Health" value="—" icon={HeartPulse}>
        <StateView
          status={viewStatus}
          loadingLabel="Assessing…"
          emptyTitle="Health is unknown"
          emptyDescription="Run a Smart Scan so Luman can assess your storage."
          error={{ title: 'Could not assess health', onRetry: reload }}
        />
      </MetricCard>
    );
  }

  const health = computeHealthScore(data);

  return (
    <MetricCard
      label="Health"
      value={`${health.score}%`}
      caption={health.description}
      icon={HeartPulse}
      tone={TONE_FOR_BAND[health.band]}
    />
  );
}
```

- [ ] **Step 6: Export both widgets**

In `apps/desktop/src/components/dashboard/index.ts`, add:

```ts
export * from './StorageUsedWidget';
export * from './HealthWidget';
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/StorageUsedWidget.test.tsx apps/desktop/src/components/dashboard/HealthWidget.test.tsx`
Expected: PASS — 6 tests.

If the byte strings in the Storage Used test do not match, run `node -e "…"` against `formatBytes` rather than loosening the assertion — the exact figures are `356_241_000_000` and `494_384_795_648` from the mock.

- [ ] **Step 8: Typecheck and commit**

Run: `pnpm typecheck`
Expected: PASS.

```bash
git add apps/desktop/src/components/dashboard/use-storage-overview.ts apps/desktop/src/components/dashboard/StorageUsedWidget.tsx apps/desktop/src/components/dashboard/HealthWidget.tsx apps/desktop/src/components/dashboard/StorageUsedWidget.test.tsx apps/desktop/src/components/dashboard/HealthWidget.test.tsx apps/desktop/src/components/dashboard/index.ts
git commit -m "feat(desktop): add Storage Used and Health metric widgets"
```

---

## Task 15: Storage Breakdown widget

**Files:**
- Create: `apps/desktop/src/components/dashboard/StorageBreakdownWidget.tsx`
- Create: `apps/desktop/src/components/dashboard/StorageBreakdownWidget.test.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**Interfaces:**
- Consumes: `BreakdownList` + `BreakdownRow` (Task 8), `storage.getBreakdown()` (Task 5), `DashboardCard`, `StateView`, `useAsync`, `formatBytes`.
- Produces: `<StorageBreakdownWidget />` — a `DashboardCard` titled "Storage Breakdown" with a "Details" action routing to `/space-lens`.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/components/dashboard/StorageBreakdownWidget.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithServices, LocationProbe } from '../../test/render-with-services';
import { MockStorageService } from '../../services/mocks';
import { StorageBreakdownWidget } from './StorageBreakdownWidget';

describe('StorageBreakdownWidget', () => {
  it('lists each category with a formatted size', async () => {
    renderWithServices(<StorageBreakdownWidget />, {
      services: { storage: new MockStorageService() },
    });
    expect(await screen.findByText('System')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('prompts for a scan when there is no breakdown', async () => {
    renderWithServices(<StorageBreakdownWidget />, {
      services: { storage: new MockStorageService({ breakdown: null }) },
    });
    expect(await screen.findByText('No breakdown yet')).toBeInTheDocument();
  });

  it('shows the error state when the service fails', async () => {
    renderWithServices(<StorageBreakdownWidget />, {
      services: { storage: new MockStorageService({ failWith: new Error('nope') }) },
    });
    expect(await screen.findByText('Could not read the breakdown')).toBeInTheDocument();
  });

  it('routes to Space Lens from the Details action', async () => {
    renderWithServices(
      <>
        <StorageBreakdownWidget />
        <LocationProbe />
      </>,
      { services: { storage: new MockStorageService() } },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Details' }));
    expect(screen.getByTestId('location').textContent).toBe('/space-lens');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/StorageBreakdownWidget.test.tsx`
Expected: FAIL — `Failed to resolve import "./StorageBreakdownWidget"`.

- [ ] **Step 3: Write the widget**

Create `apps/desktop/src/components/dashboard/StorageBreakdownWidget.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import {
  Button,
  BreakdownList,
  DashboardCard,
  StateView,
  type BreakdownRow,
  type ViewStatus,
} from '@luman/ui';
import { formatBytes } from '@luman/shared';
import { useServices } from '../../services';
import { useAsync } from './use-async';

/** Bento card: used storage split by category. Read-only. */
export function StorageBreakdownWidget() {
  const { storage } = useServices();
  const navigate = useNavigate();
  const { status, data, reload } = useAsync(() => storage.getBreakdown(), []);

  const hasRows = !!data && data.length > 0;
  const viewStatus: ViewStatus =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : hasRows ? 'success' : 'empty';

  const rows: BreakdownRow[] = (data ?? []).map((category, index) => ({
    key: category.key,
    label: category.label,
    value: formatBytes(category.bytes),
    colorIndex: index + 1,
  }));

  return (
    <DashboardCard
      title="Storage Breakdown"
      actions={
        <Button variant="ghost" onClick={() => navigate('/space-lens')}>
          Details
        </Button>
      }
    >
      <StateView
        status={viewStatus}
        loadingLabel="Reading categories…"
        emptyTitle="No breakdown yet"
        emptyDescription="Run a Smart Scan to see how your storage is used."
        error={{ title: 'Could not read the breakdown', onRetry: reload }}
      >
        <BreakdownList rows={rows} ariaLabel="Storage by category" />
      </StateView>
    </DashboardCard>
  );
}
```

- [ ] **Step 4: Export it**

In `apps/desktop/src/components/dashboard/index.ts`, add:

```ts
export * from './StorageBreakdownWidget';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/StorageBreakdownWidget.test.tsx`
Expected: PASS — 4 tests.

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm typecheck`
Expected: PASS.

```bash
git add apps/desktop/src/components/dashboard/StorageBreakdownWidget.tsx apps/desktop/src/components/dashboard/StorageBreakdownWidget.test.tsx apps/desktop/src/components/dashboard/index.ts
git commit -m "feat(desktop): add the storage breakdown widget"
```

---

## Task 16: Dashboard hero

**Files:**
- Create: `apps/desktop/src/components/dashboard/hero-copy.ts`, `hero-copy.test.ts`
- Create: `apps/desktop/src/components/dashboard/DashboardHero.tsx`, `DashboardHero.test.tsx`
- Modify: `apps/desktop/src/components/dashboard/index.ts`

**Interfaces:**
- Consumes: `HeroBanner` (Task 9), `StorageOrb` (Task 6), `computeHealthScore` (Task 4), `useStorageOverview` (Task 14).
- Produces:
  - `type HeroState = 'loading' | 'error' | 'no-data' | 'ready'`
  - `interface HeroCopy { readonly headline: string; readonly subhead: string }`
  - `function heroCopy(state: HeroState, overview: StorageHealthInput | null): HeroCopy` — pure, no React, fully unit-tested.
  - `<DashboardHero />` — wires the copy to `HeroBanner` and routes the CTA to `/smart-scan`. It never starts a scan.

- [ ] **Step 1: Write the failing copy test**

Create `apps/desktop/src/components/dashboard/hero-copy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { heroCopy } from './hero-copy';

const GB = 1024 ** 3;

const overview = (freeFraction: number, reclaimableGb: number) => ({
  totalBytes: 1000 * GB,
  freeBytes: 1000 * GB * freeFraction,
  reclaimableBytes: reclaimableGb * GB,
});

describe('heroCopy', () => {
  it('describes the loading state without claiming a result', () => {
    const copy = heroCopy('loading', null);
    expect(copy.headline).toBe('Checking your storage…');
    expect(copy.subhead).toBe('One moment while we read the latest figures.');
  });

  it('describes the error state and invites a retry', () => {
    const copy = heroCopy('error', null);
    expect(copy.headline).toBe('Storage status unavailable');
    expect(copy.subhead).toBe("We couldn't read your storage. Try again.");
  });

  it('invites a first scan when there is no data', () => {
    const copy = heroCopy('no-data', null);
    expect(copy.headline).toBe('Ready when you are');
    expect(copy.subhead).toBe('Run a Smart Scan to see what you can safely reclaim.');
  });

  it('celebrates a healthy disk and names the reclaimable amount', () => {
    const copy = heroCopy('ready', overview(0.9, 42.5));
    expect(copy.headline).toBe('Storage is healthy');
    expect(copy.subhead).toBe('Your Mac is optimized. 42.5 GB can be safely reclaimed.');
  });

  it('flags a disk that needs attention', () => {
    const copy = heroCopy('ready', overview(0.6, 20));
    expect(copy.headline).toBe('Storage needs attention');
    expect(copy.subhead).toBe('20.0 GB can be reclaimed. A Smart Scan will find more.');
  });

  it('warns when space is running low and names the free amount', () => {
    const copy = heroCopy('ready', overview(0.1, 5));
    expect(copy.headline).toBe('Storage is running low');
    expect(copy.subhead).toBe('Only 100.0 GB free. Reclaim 5.0 GB now.');
  });

  it('falls back to the no-data copy when ready without an overview', () => {
    expect(heroCopy('ready', null).headline).toBe('Ready when you are');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/hero-copy.test.ts`
Expected: FAIL — `Failed to resolve import "./hero-copy"`.

- [ ] **Step 3: Write the copy function**

Create `apps/desktop/src/components/dashboard/hero-copy.ts`:

```ts
import { computeHealthScore, type StorageHealthInput } from '@luman/domain';
import { formatBytes } from '@luman/shared';

export type HeroState = 'loading' | 'error' | 'no-data' | 'ready';

export interface HeroCopy {
  readonly headline: string;
  readonly subhead: string;
}

/**
 * Derives the hero's copy from live figures. The mockup hardcoded a single
 * healthy message; the real dashboard must speak for every state it can be in.
 */
export function heroCopy(state: HeroState, overview: StorageHealthInput | null): HeroCopy {
  if (state === 'loading') {
    return {
      headline: 'Checking your storage…',
      subhead: 'One moment while we read the latest figures.',
    };
  }
  if (state === 'error') {
    return {
      headline: 'Storage status unavailable',
      subhead: "We couldn't read your storage. Try again.",
    };
  }
  if (state === 'no-data' || overview == null) {
    return {
      headline: 'Ready when you are',
      subhead: 'Run a Smart Scan to see what you can safely reclaim.',
    };
  }

  const reclaimable = formatBytes(overview.reclaimableBytes);
  const { band } = computeHealthScore(overview);

  if (band === 'healthy') {
    return {
      headline: 'Storage is healthy',
      subhead: `Your Mac is optimized. ${reclaimable} can be safely reclaimed.`,
    };
  }
  if (band === 'attention') {
    return {
      headline: 'Storage needs attention',
      subhead: `${reclaimable} can be reclaimed. A Smart Scan will find more.`,
    };
  }
  return {
    headline: 'Storage is running low',
    subhead: `Only ${formatBytes(overview.freeBytes)} free. Reclaim ${reclaimable} now.`,
  };
}
```

- [ ] **Step 4: Run the copy test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/hero-copy.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Write the failing hero component test**

Create `apps/desktop/src/components/dashboard/DashboardHero.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithServices, LocationProbe } from '../../test/render-with-services';
import { MockStorageService } from '../../services/mocks';
import { DashboardHero } from './DashboardHero';

describe('DashboardHero', () => {
  it('renders derived copy as the page heading', async () => {
    renderWithServices(<DashboardHero />, { services: { storage: new MockStorageService() } });
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('invites a first scan when there is no overview', async () => {
    renderWithServices(<DashboardHero />, {
      services: { storage: new MockStorageService({ overview: null }) },
    });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ready when you are' }),
    ).toBeInTheDocument();
  });

  it('routes to Smart Scan without starting one', async () => {
    renderWithServices(
      <>
        <DashboardHero />
        <LocationProbe />
      </>,
      { services: { storage: new MockStorageService() } },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Smart Scan' }));
    expect(screen.getByTestId('location').textContent).toBe('/smart-scan');
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/DashboardHero.test.tsx`
Expected: FAIL — `Failed to resolve import "./DashboardHero"`.

- [ ] **Step 7: Write the hero component**

Create `apps/desktop/src/components/dashboard/DashboardHero.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { Button, HeroBanner, Icon, StorageOrb } from '@luman/ui';
import { Zap } from 'lucide-react';
import { useStorageOverview } from './use-storage-overview';
import { heroCopy, type HeroState } from './hero-copy';

/**
 * The dashboard's hero band. Copy is derived from live figures. The CTA routes
 * to Smart Scan — it never starts a scan, per the dashboard's read-only rule.
 */
export function DashboardHero() {
  const navigate = useNavigate();
  const { status, data } = useStorageOverview();

  const state: HeroState =
    status === 'loading' ? 'loading' : status === 'error' ? 'error' : data ? 'ready' : 'no-data';
  const { headline, subhead } = heroCopy(state, data);

  return (
    <HeroBanner
      headline={headline}
      subhead={subhead}
      action={
        <Button variant="primary" onClick={() => navigate('/smart-scan')}>
          <Icon icon={Zap} size="sm" />
          Smart Scan
        </Button>
      }
      visual={<StorageOrb size={300} />}
    />
  );
}
```

- [ ] **Step 8: Export and verify**

In `apps/desktop/src/components/dashboard/index.ts`, add:

```ts
export * from './DashboardHero';
```

Run: `pnpm vitest run --project unit apps/desktop/src/components/dashboard/DashboardHero.test.tsx && pnpm typecheck`
Expected: PASS — 3 tests, clean typecheck.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/components/dashboard/hero-copy.ts apps/desktop/src/components/dashboard/hero-copy.test.ts apps/desktop/src/components/dashboard/DashboardHero.tsx apps/desktop/src/components/dashboard/DashboardHero.test.tsx apps/desktop/src/components/dashboard/index.ts
git commit -m "feat(desktop): add the dashboard hero with data-derived copy

Covers healthy, attention, low, no-data, loading and error states rather
than the mockup's single hardcoded message."
```

---

## Task 17: Dashboard page recomposition

**Files:**
- Modify: `apps/desktop/src/pages/DashboardPage.tsx`, `apps/desktop/src/pages/DashboardPage.test.tsx`
- Modify: `apps/desktop/src/components/dashboard/Dashboard.css`, `apps/desktop/src/components/dashboard/index.ts`
- Modify: `apps/desktop/src/components/common/Page.tsx`, `apps/desktop/src/components/common/Page.css`
- Delete: `apps/desktop/src/components/dashboard/StorageOverviewWidget.tsx` + `.test.tsx`, `RecoverableSpaceWidget.tsx` + `.test.tsx`, `QuickActionsWidget.tsx` + `.test.tsx`

**Interfaces:**
- Consumes: `DashboardHero` (Task 16), `StorageUsedWidget` + `HealthWidget` (Task 14), `StorageBreakdownWidget` (Task 15), and the surviving `RecommendationsWidget` / `RecentActivityWidget`.
- Produces:
  - `Page`'s `title` prop becomes **optional**; when omitted the heading block is not rendered. The title, when present, is now an `<h1>` so each page has exactly one — the header's title is not a heading (Task 12).
  - `DashboardPage` renders hero → metrics row → bento grid, with no `Page` title (the hero is the page's heading).
  - Three widgets are deleted; `SystemStatusWidget` still exists here and moves in Task 18.

- [ ] **Step 1: Rewrite the dashboard page test**

Replace `apps/desktop/src/pages/DashboardPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../test/render-with-services';
import {
  MockStorageService,
  MockRecommendationService,
  MockHistoryService,
} from '../services/mocks';
import { DashboardPage } from './DashboardPage';

function renderDashboard() {
  return renderWithServices(<DashboardPage />, {
    services: {
      storage: new MockStorageService(),
      recommendations: new MockRecommendationService(),
      history: new MockHistoryService(),
    },
  });
}

describe('DashboardPage', () => {
  it('leads with the hero as the page heading', async () => {
    renderDashboard();
    const heading = await screen.findByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
  });

  it('has exactly one level-1 heading', async () => {
    renderDashboard();
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders every dashboard section', async () => {
    renderDashboard();
    expect(await screen.findByText('Storage Used')).toBeInTheDocument();
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Storage Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('no longer renders the widgets that moved off the dashboard', async () => {
    renderDashboard();
    await screen.findByText('Storage Used');
    expect(screen.queryByText('Quick Actions')).toBeNull();
    expect(screen.queryByText('System Status')).toBeNull();
    expect(screen.queryByText('Recoverable Space')).toBeNull();
  });

  it('resolves data from the mock services', async () => {
    renderDashboard();
    expect(await screen.findByText('System')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/pages/DashboardPage.test.tsx`
Expected: FAIL — no level-1 heading; "Quick Actions" is still present.

- [ ] **Step 3: Make the Page title optional and promote it to `h1`**

Replace `apps/desktop/src/components/common/Page.tsx`:

```tsx
import type { ReactNode } from 'react';
import './Page.css';

export interface PageProps {
  /**
   * Optional. Omit when the page supplies its own heading — the dashboard's
   * hero is its <h1>, so a second heading block here would duplicate it.
   */
  readonly title?: string;
  readonly description?: string;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
}

/** Consistent page frame with an optional heading block. */
export function Page({ title, description, actions, children }: PageProps) {
  const hasHead = title != null || actions != null;
  return (
    <div className="lm-page">
      {hasHead && (
        <div className="lm-page__head">
          <div>
            {title != null && <h1 className="lm-page__title">{title}</h1>}
            {description != null && <p className="lm-page__desc">{description}</p>}
          </div>
          {actions != null && <div className="lm-page__actions">{actions}</div>}
        </div>
      )}
      <div className="lm-page__body">{children}</div>
    </div>
  );
}
```

In `apps/desktop/src/components/common/Page.css`, update the `.lm-page__title` rule so the promoted `h1` keeps its current visual size rather than inheriting the browser default:

```css
.lm-page__title {
  margin: 0;
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-text);
}
```

- [ ] **Step 4: Rewrite the dashboard page**

Replace `apps/desktop/src/pages/DashboardPage.tsx`:

```tsx
import { Page } from '../components/common';
import {
  DashboardHero,
  StorageUsedWidget,
  HealthWidget,
  StorageBreakdownWidget,
  RecommendationsWidget,
  RecentActivityWidget,
} from '../components/dashboard';
import '../components/dashboard/Dashboard.css';

/**
 * Home screen. Hero, then a two-up metrics row, then the bento grid. All data
 * flows through service interfaces; this page contains no business logic and
 * never starts a scan or cleanup. The hero supplies the page's <h1>, so no
 * Page title is passed.
 */
export function DashboardPage() {
  return (
    <Page>
      <DashboardHero />

      <section className="lm-dashboard__metrics">
        <StorageUsedWidget />
        <HealthWidget />
      </section>

      <section className="lm-dashboard">
        <div className="lm-dashboard__wide">
          <StorageBreakdownWidget />
        </div>
        <RecommendationsWidget />
        <div className="lm-dashboard__full">
          <RecentActivityWidget />
        </div>
      </section>
    </Page>
  );
}
```

- [ ] **Step 5: Update the dashboard styles**

In `apps/desktop/src/components/dashboard/Dashboard.css`, add the metrics row above the existing `.lm-dashboard` rule:

```css
/* Two-up metrics row above the bento grid. */
.lm-dashboard__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  margin-bottom: var(--space-5);
}
@media (max-width: 900px) {
  .lm-dashboard__metrics {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

Change the `.lm-dashboard` gap from `var(--space-4)` to `var(--space-5)` to match the mockup's roomier bento spacing.

Delete the now-unused `.lm-storage`, `.lm-storage__legend`, `.lm-storage__stats`, `.lm-recoverable`, `.lm-recoverable__value`, `.lm-recoverable__meta`, and `.lm-quickactions` rules. Keep `.lm-dot*`, `.lm-recommendations`, `.lm-activity`, and `.lm-sysstatus` — they are still used by the surviving widgets and by `SystemStatusWidget` until Task 18.

- [ ] **Step 6: Delete the three replaced widgets**

Delete these six files:

```
apps/desktop/src/components/dashboard/StorageOverviewWidget.tsx
apps/desktop/src/components/dashboard/StorageOverviewWidget.test.tsx
apps/desktop/src/components/dashboard/RecoverableSpaceWidget.tsx
apps/desktop/src/components/dashboard/RecoverableSpaceWidget.test.tsx
apps/desktop/src/components/dashboard/QuickActionsWidget.tsx
apps/desktop/src/components/dashboard/QuickActionsWidget.test.tsx
```

Remove their three lines from `apps/desktop/src/components/dashboard/index.ts`, leaving:

```ts
export * from './RecommendationsWidget';
export * from './RecentActivityWidget';
export * from './SystemStatusWidget';
export * from './StorageUsedWidget';
export * from './HealthWidget';
export * from './StorageBreakdownWidget';
export * from './DashboardHero';
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm vitest run --project unit apps/desktop/src/pages/DashboardPage.test.tsx`
Expected: PASS — 5 tests.

- [ ] **Step 8: Run the full suite and typecheck**

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS. `App.test.tsx` may assert an old dashboard heading level — if it fails, update its assertion to match the hero, not the other way round.

- [ ] **Step 9: Verify visually in both themes**

Run: `pnpm dev`. Expected: hero with orb, two metric cards, breakdown + recommendations side by side, recent activity full width. Narrow the window past 900px and confirm both grids collapse to one column.

- [ ] **Step 10: Commit**

```bash
git add -A apps/desktop/src/pages/DashboardPage.tsx apps/desktop/src/pages/DashboardPage.test.tsx apps/desktop/src/components/dashboard apps/desktop/src/components/common
git commit -m "feat(desktop): recompose the dashboard around the hero and bento grid

Replaces the storage overview, recoverable space and quick actions widgets;
Page titles become an optional h1 so each page has exactly one."
```

---

## Task 18: Move System Status to Settings

**Files:**
- Move: `apps/desktop/src/components/dashboard/SystemStatusWidget.tsx` → `apps/desktop/src/components/settings/SystemStatusCard.tsx`
- Create: `apps/desktop/src/components/settings/index.ts`, `apps/desktop/src/components/settings/SystemStatus.css`
- Modify: `apps/desktop/src/pages/SettingsPage.tsx`, `apps/desktop/src/components/dashboard/index.ts`, `apps/desktop/src/components/dashboard/Dashboard.css`
- Test: `apps/desktop/src/pages/SettingsPage.test.tsx` (create)

**Interfaces:**
- Consumes: the existing `useApplicationStore`, `useThemeStore`, and `plugins` service reads — unchanged.
- Produces: `<SystemStatusCard />` exported from `apps/desktop/src/components/settings`, rendered as a "System" `Card` on the Settings page. No longer exported from the dashboard barrel.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/pages/SettingsPage.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithServices } from '../test/render-with-services';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('keeps the appearance and safety sections', () => {
    renderWithServices(<SettingsPage />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Safety')).toBeInTheDocument();
  });

  it('hosts the relocated system status rows', () => {
    renderWithServices(<SettingsPage />);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Database')).toBeInTheDocument();
    expect(screen.getByText('Plugins')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm vitest run --project unit apps/desktop/src/pages/SettingsPage.test.tsx`
Expected: FAIL — "System" is not in the document.

- [ ] **Step 3: Move the widget**

Create `apps/desktop/src/components/settings/SystemStatusCard.tsx`:

```tsx
import { Card } from '@luman/ui';
import { useServices } from '../../services';
import { useApplicationStore } from '../../stores';
import { useThemeStore } from '../../theme';
import './SystemStatus.css';

interface StatusRow {
  readonly label: string;
  readonly value: string;
  readonly ok: boolean;
}

/**
 * Diagnostics: readiness, database, plugins, appearance, version. This lives in
 * Settings rather than on the dashboard — it reports on the app, not on storage.
 */
export function SystemStatusCard() {
  const { plugins } = useServices();
  const ready = useApplicationStore((s) => s.ready);
  const initError = useApplicationStore((s) => s.initError);
  const resolved = useThemeStore((s) => s.resolved);

  const rows: StatusRow[] = [
    { label: 'Application', value: ready ? 'Ready' : 'Starting…', ok: ready },
    { label: 'Database', value: initError ? 'Error' : 'Initialized', ok: !initError },
    { label: 'Plugins', value: `${plugins.list().length} registered`, ok: true },
    { label: 'Appearance', value: resolved === 'dark' ? 'Dark' : 'Light', ok: true },
    { label: 'Version', value: '0.1.0', ok: true },
  ];

  return (
    <Card title="System">
      <ul className="lm-sysstatus">
        {rows.map((row) => (
          <li key={row.label} className="lm-sysstatus__row">
            <span
              className={['lm-dot', row.ok ? 'lm-dot--success' : 'lm-dot--danger'].join(' ')}
              aria-hidden="true"
            />
            <span className="lm-sysstatus__label">{row.label}</span>
            <span className="lm-sysstatus__value">{row.value}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

Create `apps/desktop/src/components/settings/index.ts`:

```ts
export * from './SystemStatusCard';
```

Delete `apps/desktop/src/components/dashboard/SystemStatusWidget.tsx` and remove its line from `apps/desktop/src/components/dashboard/index.ts`.

- [ ] **Step 4: Move the styles with it**

Create `apps/desktop/src/components/settings/SystemStatus.css`. After Task 17 deleted the storage-legend markup, `SystemStatusCard` is the only remaining consumer of `.lm-dot*`, so those rules move here too rather than being left behind in a stylesheet this component does not import:

```css
.lm-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-border-strong);
}
.lm-dot--success {
  background: var(--color-success);
}
.lm-dot--danger {
  background: var(--color-danger);
}

.lm-sysstatus {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-2) var(--space-5);
}
.lm-sysstatus__row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.lm-sysstatus__label {
  color: var(--color-text-secondary);
}
.lm-sysstatus__value {
  margin-left: auto;
  font-weight: var(--font-weight-semibold);
}
```

Delete the `.lm-sysstatus*` **and** `.lm-dot*` rules from `Dashboard.css` — nothing on the dashboard uses them any more. Grep to confirm before deleting:

Run: `grep -rn "lm-dot" apps/desktop/src`
Expected: hits only in `components/settings/`. If anything else still references `.lm-dot`, keep the rules in `Dashboard.css` as well and note why.

- [ ] **Step 5: Render it on the Settings page**

In `apps/desktop/src/pages/SettingsPage.tsx`, add the import:

```tsx
import { SystemStatusCard } from '../components/settings';
```

and add `<SystemStatusCard />` as the last child inside `<Page>`, after the Safety card.

- [ ] **Step 6: Run the test and the full suite**

Run: `pnpm vitest run --project unit apps/desktop/src/pages/SettingsPage.test.tsx`
Expected: PASS — 2 tests.

Run: `pnpm test:unit && pnpm typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A apps/desktop/src/components/settings apps/desktop/src/components/dashboard apps/desktop/src/pages/SettingsPage.tsx apps/desktop/src/pages/SettingsPage.test.tsx
git commit -m "refactor(desktop): move System Status from the dashboard to Settings

It reports on the app, not on storage, and the redesigned dashboard has no
place for it."
```

---

## Task 19: End-to-end test updates

**Files:**
- Modify: `apps/desktop/e2e/dashboard.spec.ts`, `apps/desktop/e2e/navigation.spec.ts`
- Modify: `apps/desktop/e2e/playground.spec.ts` (only if it asserts a heading level)

**Interfaces:**
- Consumes: everything from Tasks 10–18.
- Produces: e2e coverage matching the redesigned shell and dashboard. Page headings are now `h1` (Task 17); the header's title is not a heading; quick actions live behind the header menu.

- [ ] **Step 1: Rewrite the dashboard e2e spec**

Replace `apps/desktop/e2e/dashboard.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('the dashboard leads with the hero and shows every section', async ({ page }) => {
  await page.goto('/');

  // The hero is the page's single h1.
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible();
  await expect(h1).toHaveCount(1);

  await expect(page.getByText('Storage Used')).toBeVisible();
  await expect(page.getByText('Health', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Storage Breakdown' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recommendations' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Activity' })).toBeVisible();

  // Mock breakdown data resolves.
  await expect(page.getByText('System', { exact: true })).toBeVisible();
});

test('the hero routes to Smart Scan without starting one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Smart Scan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Smart Scan' })).toBeVisible();
});

test('the quick action menu reaches Large Files', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Quick Action' }).click();
  await page.getByRole('button', { name: /Large Files/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Large Files' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Large Files');
});

test('search is present but marked unavailable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('searchbox', { name: /search/i })).toBeDisabled();
});

test('theme switching still works from the dashboard flow', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Theme', { exact: true }).selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
```

- [ ] **Step 2: Rewrite the navigation e2e spec**

Replace `apps/desktop/e2e/navigation.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

/**
 * E2E happy path: the shell loads and the user can navigate between every
 * primary destination. Page headings are h1; the header's section title is
 * deliberately not a heading, so it is not asserted here.
 */
test('navigates across all primary destinations', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const destinations = [
    { link: 'Smart Scan', heading: 'Smart Scan' },
    { link: 'Cleanup', heading: 'Cleanup' },
    { link: 'Space Lens', heading: 'Space Lens' },
    { link: 'Applications', heading: 'Applications' },
    { link: 'Developer Center', heading: 'Developer Center' },
    { link: 'History', heading: 'History' },
    { link: 'Settings', heading: 'Settings' },
  ];

  for (const { link, heading } of destinations) {
    await page.getByRole('link', { name: new RegExp(link) }).click();
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  }

  // Back to the dashboard, whose h1 is the hero rather than a fixed title.
  await page.getByRole('link', { name: /Dashboard/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('the sidebar pins Playground and Settings to its footer', async ({ page }) => {
  await page.goto('/');
  const footerLinks = page.locator('.lm-sidebar__footer-nav a');
  await expect(footerLinks).toHaveText(['Playground', 'Settings']);
});

test('theme selection changes the applied appearance', async ({ page }) => {
  await page.goto('/settings');
  const select = page.getByLabel('Theme', { exact: true });
  await select.selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await select.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
```

- [ ] **Step 3: Fix the playground spec if it asserts a heading level**

Open `apps/desktop/e2e/playground.spec.ts`. If it asserts `{ level: 2, name: 'Playground' }`, change the level to `1` — `Page` titles are now `h1`. If it asserts no heading level, leave it alone.

- [ ] **Step 4: Run the e2e suite**

Run: `pnpm test:e2e`
Expected: PASS. If a locator is ambiguous — for example "Smart Scan" matching both the sidebar link and the hero button — narrow it with a role rather than relaxing the assertion.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/e2e
git commit -m "test(desktop): update e2e specs for the redesigned shell and dashboard"
```

---

## Task 20: Reconcile documentation and verify the whole redesign

**Files:**
- Modify: `docs/design-system/04_COLORS.md`, `08_LAYOUT.md`, `10_AURORA_SYSTEM.md`, `14_ICONOGRAPHY.md`
- Modify: `docs/features/01_dashboard.md`

**Interfaces:**
- Consumes: everything. This is the closing task.
- Produces: documentation that describes what the code actually does, plus a recorded verification pass.

- [ ] **Step 1: Update the aurora doc**

Replace `docs/design-system/10_AURORA_SYSTEM.md`:

```markdown
# Aurora System

Background only. Never interactive, never announced (`aria-hidden`).

Three large radial blobs, heavily blurred (`--aurora-blur`, 120px), drifting on
20–30s alternating loops.

## Opacity
Driven by `--aurora-opacity`:
- Light: 0.18 — a subtle wash.
- Dark: 0.55 — luminous, as in the redesign mockup.

This supersedes the earlier 5–8% rule, which predates the dark-green surface.

## Motion
`prefers-reduced-motion: reduce` freezes all drift. Blobs then render static.

## Colors
`--aurora-1`, `--aurora-2`, `--aurora-3`. These are decorative hues and must
never encode data — use `--color-category-*` for that.
```

- [ ] **Step 2: Update the colors doc**

Append to `docs/design-system/04_COLORS.md`:

```markdown
## Accent

Green. The accent is theme-split because the mockup's `#34c759` measures ~2.3:1
on white and cannot carry text in light mode:

- Light: `#0f7a35`
- Dark: `#34c759`

`--color-success` is deliberately a different green from the accent so that
"primary action" and "healthy" stay distinguishable. Where they could still be
confused, iconography carries the distinction — never color alone.

## Category colors

`--color-category-1` … `--color-category-5` encode data (the storage
breakdown). Aurora hues are decorative and must not be used for this.

## Contrast

Enforced automatically by `packages/ui/src/styles/tokens.test.ts`, which parses
this token file and asserts WCAG AA (4.5:1) for text and accent over both the
page background and glass surfaces, in both themes. Changing a color without
running that test is not permitted.
```

- [ ] **Step 3: Update the layout and iconography docs**

Append to `docs/design-system/08_LAYOUT.md`:

```markdown
## Shell

- Sidebar: `--sidebar-width` 240px, `--sidebar-width-collapsed` 60px.
- Header: `--header-height` 56px. There is no toolbar; the theme toggle lives in
  the header's icon cluster.
- Status bar: 28px, pinned to the bottom of the shell.
- Content is centered at `--content-max-width` (1200px).
```

Append to `docs/design-system/14_ICONOGRAPHY.md`:

```markdown
Lucide only, always via the `Icon` component from `@luman/ui` — never a raw
Lucide import in JSX. Material Symbols and other icon fonts are not used: they
require a network fetch and the app ships offline.
```

- [ ] **Step 4: Update the dashboard feature doc**

Replace the `## Widgets` and `## Quick Actions` sections of `docs/features/01_dashboard.md` with:

```markdown
## Layout
- Hero (headline, subhead, Smart Scan CTA, decorative orb)
- Metrics row: Storage Used, Health
- Bento grid: Storage Breakdown, Recommendations, Recent Activity

## Hero copy
Derived from live figures, never hardcoded. Covers healthy, needs-attention,
running-low, no-data, loading and error. The health description never claims
hardware-level knowledge — Luman does not read SMART data.

## Quick Actions
Moved to the header's Quick Action menu: Smart Scan, Space Lens, Large Files,
Applications, Settings. It is the only in-app route to Large Files.

## System Status
Moved to Settings. It reports on the app, not on storage.
```

- [ ] **Step 5: Verify reduced motion end to end**

Enable macOS **System Settings → Accessibility → Display → Reduce motion**, run `pnpm dev`, and confirm on the dashboard that the aurora blobs are frozen **and** the storage orb's outer ring is not rotating. Turn it back off and confirm both resume.

- [ ] **Step 6: Verify both themes across every page**

Run `pnpm dev` and visit all nine destinations in **both** themes: `/`, `/smart-scan`, `/cleanup`, `/space-lens`, `/applications`, `/developer-center`, `/history`, `/playground`, `/settings`.

Check each for: no invisible or low-contrast text, no missing borders, no element that kept the old blue accent, and cards that read as frosted panels rather than flat boxes.

- [ ] **Step 7: Verify responsive behavior**

Resize the window below 900px. Expected: the hero stacks with the orb above the copy, the metrics row becomes one column, the bento grid collapses, and the header search hides. The page must never scroll horizontally.

- [ ] **Step 8: Run the full CI gate**

Run: `pnpm ci`
Expected: PASS — lint, format check, typecheck, unit + integration tests, and build all green. Fix anything it reports before committing.

- [ ] **Step 9: Commit**

```bash
git add docs
git commit -m "docs: reconcile design-system and dashboard docs with the redesign

Aurora opacity, green accent, category colors, shell dimensions, Lucide-only
iconography, and the new dashboard layout now match the implementation."
```

---

## Verification Summary

The redesign is complete when all of the following hold:

| Check | Command / method |
|---|---|
| Contrast AA in both themes, over background and glass | `pnpm vitest run --project unit packages/ui/src/styles/tokens.test.ts` |
| Health score correct at every band boundary | `pnpm vitest run --project unit packages/domain/src/models/health.test.ts` |
| Breakdown never contradicts Storage Used | `pnpm vitest run --project unit apps/desktop/src/services/mocks/mocks.test.ts` |
| Every nav item has a real route | `pnpm vitest run --project unit apps/desktop/src/app/nav-items.test.ts` |
| Exactly one `h1` per page | `DashboardPage.test.tsx` + e2e |
| Large Files still reachable | `Header.test.tsx` + `dashboard.spec.ts` |
| Reduced motion stops aurora and orb | Manual, Task 20 Step 5 |
| Full gate | `pnpm ci` and `pnpm test:e2e` |

