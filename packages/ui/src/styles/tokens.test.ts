import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// Aliased to NodeURL: Vite's import-analysis statically pattern-matches the
// literal source text `new URL('...', import.meta.url)` and rewrites it into
// a dev-server asset URL, regardless of which module `URL` is imported from.
// Aliasing avoids that rewrite so this resolves to a real file:// path.
const css = readFileSync(fileURLToPath(new NodeURL('./tokens.css', import.meta.url)), 'utf8');

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

/* ==================================================================
 * Route backgrounds.
 *
 * The rendered background is not --color-bg: it is the per-route surface
 * from routes.css, and that surface MOVES — two opaque lights orbit a static
 * base sheet. Checking one sampled point would gate a single frame of an
 * animation, so every value the surface can resolve to is checked instead.
 *
 * That enumeration is only sound because the lights are opaque and composite
 * with plain alpha: overlapping two opaque fills yields the top fill, never
 * something brighter. So the reachable set is exactly the four declared
 * colours, and testing all four bounds every frame of the loop. If Aurora.css
 * ever gains a `mix-blend-mode`, this reasoning breaks and the gate with it.
 * ================================================================== */

const routesCss = readFileSync(fileURLToPath(new NodeURL('./routes.css', import.meta.url)), 'utf8');

const SURFACE_TOKENS = [
  '--route-base',
  '--route-deep',
  '--route-light-a',
  '--route-light-b',
] as const;

/** Every `[data-route='x']` block under the given theme prefix. */
function routeBlocks(
  themePrefix: string,
): Array<{ route: string; tokens: Record<string, string> }> {
  const escaped = themePrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}\\s*\\[data-route='([\\w-]+)'\\]\\s*\\{([^}]*)\\}`, 'gm');
  const out: Array<{ route: string; tokens: Record<string, string> }> = [];
  for (const m of routesCss.matchAll(re)) {
    const tokens: Record<string, string> = {};
    for (const d of m[2]!.matchAll(/(--[\w-]+):\s*([^;]+);/g)) tokens[d[1]!] = d[2]!.trim();
    out.push({ route: m[1]!, tokens });
  }
  return out;
}

function contrastRgb(fg: Rgb, bg: Rgb): number {
  const a = luminance(over(fg, bg));
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

const ROUTE_THEMES = [
  {
    name: 'dark',
    routes: routeBlocks("[data-theme='dark']"),
    text: tokensOf(blockFor("[data-theme='dark']"))['--color-text']!,
  },
  {
    name: 'light',
    routes: routeBlocks(":root:not([data-theme='dark'])"),
    text: tokensOf(blockFor(':root,'))['--color-text']!,
  },
];

describe.each(ROUTE_THEMES)('$name route backgrounds', ({ routes, text }) => {
  it('defines a block for every destination', () => {
    expect(routes.length).toBeGreaterThanOrEqual(9);
  });

  it.each(routes)('$route: declares the full surface palette', ({ tokens }) => {
    for (const token of SURFACE_TOKENS) expect(tokens[token]).toBeDefined();
  });

  it.each(routes)('$route: body text meets AA against every reachable value', ({ tokens }) => {
    for (const token of SURFACE_TOKENS) {
      const ratio = contrastRgb(parseColor(text), parseColor(tokens[token]!));
      expect(ratio, `${token} = ${tokens[token]}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

/*
 * The two lights are generated at equal relative luminance, so as they orbit
 * past each other the surface changes hue without pulsing in brightness.
 *
 * The 10% tolerance is sized to the failure this catches, not to the current
 * data: hand-editing one light instead of regenerating the palette. The bug
 * that motivated it — rotating hue at fixed HLS lightness, which sent
 * developer-center's warm tint to #2e87a3 — was a 36% luminance jump. Rounding
 * to 8-bit alone costs up to ~3% on the darkest routes, where one channel step
 * is proportionally large, so anything tighter would fail on arithmetic noise.
 */
describe.each(ROUTE_THEMES)('$name route light pairs', ({ routes }) => {
  it.each(routes)('$route: both lights carry matching luminance', ({ tokens }) => {
    const a = luminance(parseColor(tokens['--route-light-a']!));
    const b = luminance(parseColor(tokens['--route-light-b']!));
    expect(Math.abs(a - b) / Math.max(a, b)).toBeLessThan(0.1);
  });
});
