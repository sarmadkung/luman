# Reference Analysis — CleanMyMac Surface Model

**Date:** 2026-08-09
**Status:** Proposed. Not yet implemented.
**Method:** Pixel sampling of three CleanMyMac screenshots, not visual estimation.

## Why this document exists

Three attempts at matching the reference by eye all missed, because the gap was
in measurable values (lightness, saturation, light direction) that eyeballing
does not surface. This records the measurements so the target is a number, not
an impression.

MacPaw does not publish a design system. The only useful public statement is
that CleanMyMac "uses different gradient backgrounds for each module for better
navigation" and that its glass icons "stand for its transparency." Everything
below is measured from screenshots.

## Method

`tools/sample-png.py` decodes a PNG with the standard library only (no Pillow)
and prints colours at relative coordinates. A 7×7 grid was sampled per
screenshot. Cells covered by the illustration, the "Unlock Full Version" button
and the active sidebar pill were discarded as contaminated.

Reproduce with:

```bash
python3 tools/sample-png.py <screenshot.png>
```

## Raw measurements

### Cleanup (green) — 2408×1448

```
       x=0.03     x=0.15     x=0.30     x=0.45     x=0.60     x=0.75     x=0.92
y=0.05  #20501e  #275c24  #2d672a  #2c672b  #285c24  #234e1b  [button]
y=0.20  [pill]   #33682f  #336e35  #367239  #2f5f28  #2c511d  #30531b
y=0.35  #183e18  #215024  [illus]  [illus]  #3b6c33  #3a5f1f  #426720
y=0.50  #123113  #1c4421  [illus]  [illus]  #4a873f  #446a23  #4d7324
y=0.65  #102e11  #183d1c  [illus]  [illus]  #3f6c30  #456b23  #4f7524
y=0.80  #0f2d11  #133314  #204823  #2b572a  #315620  #3d601f  #466c21
y=0.95  #0f2d10  #102f10  #133314  #173916  #3e6133  #2c4e19  #36581c
```

### Cloud Cleanup (blue) — 2446×1574

```
sidebar-top     (0.06,0.12)  #3374ac    <- brightest pixel on screen
sidebar-mid     (0.06,0.50)  #296098
sidebar-bottom  (0.06,0.88)  #1c467f
bg-top-left     (0.30,0.08)  #2e6ca3
bg-top-right    (0.92,0.10)  #0f2d65    <- darkest
bg-bottom-right (0.92,0.92)  #15386a
content-mid     (0.72,0.55)  #284476
```

### Space Lens (purple) — 2464×1490

```
sidebar-top     (0.06,0.12)  #210c4f
sidebar-mid     (0.06,0.50)  #330c72
sidebar-bottom  (0.06,0.88)  #2e0c68
bg-top-left     (0.30,0.08)  #341079    <- brightest
bg-top-right    (0.92,0.10)  #30106f
bg-bottom-right (0.92,0.92)  #110a31    <- darkest
bg-bottom-left  (0.30,0.95)  #220a52
```

## Five rules derived from the numbers

### 1. The light source is upper-left, and the sidebar sits inside it

In the blue screenshot the brightest pixel on the entire screen is *inside the
sidebar* (`#3374ac`). The sidebar is not a darker panel — it is the most lit
region. Purple agrees (brightest `#341079` upper-left). Green is more central
but still darkens hard toward the bottom-left.

Our implementation does the opposite: the glow sits at `66% 30%` (upper-right),
leaving the sidebar in shadow.

### 2. One smooth gradient, not stacked blobs

The falloff is a single large transition across the whole window. Ours composes
three radial gradients plus two animated blobs, which reads as busy rather than
as one lit sheet.

### 3. Lighter and less saturated than ours — the main gap

| | Lightness | Saturation |
|---|---|---|
| Reference green `#2d672a` | 28% | 42% |
| Our green `#14532d` | 20% | 61% |

Darker *and* more saturated reads as "neon on black". The reference reads as a
lit surface. This single difference explains most of the mismatch.

### 4. Hue drifts across the canvas

Green runs cool on the left (`#123113`, blue-green) to warm on the right
(`#4d7324`, olive). A single hue everywhere flattens the surface.

### 5. No additive glow — the brightest point IS the base

The gradient only ever darkens from the base colour. Our model adds a glow on
top of a base, which is why it keeps colliding with the contrast ceiling and
why `--route-glow-strength` had to be capped at 34%.

## Proposed model

Invert it: **base = brightest lit value; the gradient only darkens toward the
far corner.** Light from upper-left. Contrast is then guaranteed by the base
alone, with no cap to fight.

| Route | Lit (upper-left) | Deep (far corner) | Source |
|---|---|---|---|
| Dashboard | `#2d672a` | `#0f2d10` | measured |
| Cleanup | `#35772f` | `#123513` | derived |
| Smart Scan | `#1f6b66` | `#0b2b2a` | derived |
| Space Lens | `#341079` | `#110a31` | measured |
| Applications | `#7a5215` | `#2b1c05` | derived |
| Developer Center | `#2e6ca3` | `#0f2d65` | measured |
| History | `#2f2a80` | `#100e33` | derived |
| Playground | `#7a1f4d` | `#2c0a1b` | derived |
| Settings | `#3a4654` | `#141a20` | derived |

Derived rows match the measured ones on lightness and saturation.

White body text against each base: lowest is Developer Center at **5.28:1**;
all clear WCAG AA. Because nothing brightens the base, these ratios are the
worst case rather than a best case.

## Open decision: background motion

CleanMyMac's background is **static**. The motion in the product is parallax on
the illustration, not on the background. Our drifting aurora blobs are part of
why the surface does not match, and removing them is recommended.

This contradicts the earlier decision (`docs/superpowers/specs/2026-08-09-luman-visual-redesign-design.md`,
Section 1) to animate the aurora. That spec section should be amended if this
model is adopted.

## Sources

- <https://macpaw.com/cleanmymac/whats-new>
- <https://www.red-dot.org/project/cleanmymac-x-55187>
- <https://www.macrumors.com/2024/10/16/macpaw-releases-redesigned-cleanmymac/>
