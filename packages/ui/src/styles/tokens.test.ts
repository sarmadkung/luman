import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL as NodeURL } from 'node:url';

// Aliased to NodeURL: Vite's import-analysis statically pattern-matches the
// literal source text `new URL('...', import.meta.url)` and rewrites it into
// a dev-server asset URL, regardless of which module `URL` is imported from.
// Aliasing avoids that rewrite so this resolves to a real file:// path.
const css = readFileSync(fileURLToPath(new NodeURL('./tokens.css', import.meta.url)), 'utf8');

/** Extract the declaration block that follows the first occurrence of `selector`. */
function blockFor(selector: string): string {
  const at = css.indexOf(selector);
  if (at === -1) throw new Error(`Selector not found in tokens.css: ${selector}`);
  const start = css.indexOf('{', at);
  const end = css.indexOf('}', start);
  return css.slice(start + 1, end);
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

describe.each(THEMES)('$name theme contrast', ({ tokens }) => {
  const bg = () => tokens['--color-bg']!;

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
