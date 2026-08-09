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

## The model (implemented)

Invert rule 5: **the lit value is the ceiling; nothing ever adds on top of
it.** Light from upper-left. Contrast is then guaranteed by enumeration, with
no cap to fight.

Measured lit/deep pairs, the input to everything below:

| Route | Lit | Deep | Source |
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

### Correction to rule 5: the background does move

Stills cannot show motion, so "their background is static" was a conclusion
the screenshots could not actually support — and it was wrong. In the product
the highlight drifts continuously around the window while the base hue stays
put. Rule 5 still holds for the *composition* (nothing brightens past the lit
value); it was only wrong about motion.

The earlier decision in
`docs/superpowers/specs/2026-08-09-luman-visual-redesign-design.md` Section 1
to animate the aurora therefore stands. What changed is the form: not drifting
blobs parked at the window edges, but two soft lights orbiting inside it.

### Structure

Each route resolves to four values (`packages/ui/src/styles/routes.css`):

| Token | Role |
|---|---|
| `--route-base` | near end of the static base sheet, upper-left |
| `--route-deep` | far end of the base sheet, lower-right — darkest value |
| `--route-light-a` | warm orbiting light, hue −14° |
| `--route-light-b` | cool orbiting light, hue +14° |

`--route-base` is the midpoint of deep→lit. The two lights are opaque and
composite with plain alpha — no blend mode — so overlapping them yields the
top fill and never something brighter. The set of colours the surface can
resolve to is therefore exactly these four, which is what makes a moving
background testable: `tokens.test.ts` checks all four rather than sampling one
frame. A `mix-blend-mode` anywhere in `Aurora.css` would invalidate that.

Both lights are generated at the same relative luminance as the route's lit
value, so the pair shifts the surface's temperature without pulsing its
brightness — which is also where rule 4's cool-to-warm drift comes from.

Generate with `tools/route-palette.py`. Hue rotation there re-solves lightness
to hit a target luminance rather than holding HLS lightness constant; the
naive version is not luminance-preserving and sent Developer Center's warm
tint to `#2e87a3`, dropping white text to 3.89:1.

Worst white-text contrast is Cleanup at **5.14:1** (dark) and Space Lens at
**11.81:1** (light). All clear WCAG AA, at every point in the loop.

### Motion

Four co-prime periods: orbit A 71s, breathe A 59s, orbit B 48s, breathe B 37s.
Equal or harmonically related durations re-sync visibly and read as a looping
GIF; co-prime periods put the combined cycle in the hours. A orbits clockwise
from the upper-left, B counter-clockwise from the lower-right on a slightly
tighter rectangle, so they meet and separate rather than tracking each other.
Centres stay within roughly the 20–80% band on both axes.

Only `transform` and `opacity` animate, so the layers stay on the compositor.
Softness comes from a static radial mask, not `filter: blur()`, which would
re-run on every composite. Colour sits on `background-color` behind that mask
so route changes cross-fade — a gradient fill would snap instead.

Under `prefers-reduced-motion: reduce` the lights hold a chosen pose rather
than `animation: none`, which snaps to the 0% keyframe.

### Known cost

The background now changes every frame, so every `backdrop-filter` surface
above it — sidebar, header, status bar, each card — recomputes its blur
continuously. This is the real performance exposure, not the aurora itself,
and it has not been measured yet. If frame time becomes a problem, the levers
are fewer live-blur regions or slower motion, in that order.

## Sources

- <https://macpaw.com/cleanmymac/whats-new>
- <https://www.red-dot.org/project/cleanmymac-x-55187>
- <https://www.macrumors.com/2024/10/16/macpaw-releases-redesigned-cleanmymac/>
