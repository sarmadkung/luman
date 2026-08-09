"""Derive the four-token route palette from the measured lit/deep pairs.

Model (see docs/design-system/21_REFERENCE_ANALYSIS.md):
  --route-base       mid sheet, near end of the static base gradient
  --route-deep       far end of the base gradient (darkest reachable)
  --route-light-a    warm orbiting light  (opaque)
  --route-light-b    cool orbiting light  (opaque)

The lights are OPAQUE and drawn with plain alpha compositing, so the
brightest colour the surface can ever reach is max(light-a, light-b) and the
darkest is deep. Both ends are therefore testable constants.
"""

import colorsys


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(c))):02x}" for c in rgb)


def rotate_hue(h, degrees):
    """Rotate hue while holding WCAG relative luminance constant.

    Rotating at fixed HLS lightness is NOT luminance-preserving: green and
    cyan carry far more luminance than blue at the same L. Left uncorrected,
    developer-center's warm tint landed on #2e87a3 and dropped white text to
    3.89:1. Re-solving L for the original luminance makes every light in a
    route exactly as bright as the measured lit value, so each route's
    contrast is a single known number rather than four separate ones.
    """
    target = luminance(h)
    r, g, b = [c / 255 for c in hex_to_rgb(h)]
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    hh = (hh + degrees / 360.0) % 1.0

    lo, hi = 0.0, 1.0
    for _ in range(60):
        mid = (lo + hi) / 2
        candidate = rgb_to_hex([c * 255 for c in colorsys.hls_to_rgb(hh, mid, ss)])
        if luminance(candidate) < target:
            lo = mid
        else:
            hi = mid
    return rgb_to_hex([c * 255 for c in colorsys.hls_to_rgb(hh, (lo + hi) / 2, ss)])


def lerp(a, b, t):
    ra, rb = hex_to_rgb(a), hex_to_rgb(b)
    return rgb_to_hex([ra[i] + (rb[i] - ra[i]) * t for i in range(3)])


def luminance(h):
    def chan(c):
        s = c / 255
        return s / 12.92 if s <= 0.03928 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = hex_to_rgb(h)
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# Measured / derived lit+deep pairs from 21_REFERENCE_ANALYSIS.md.
DARK = {
    "dashboard": ("#2d672a", "#0f2d10"),
    "smart-scan": ("#1f6b66", "#0b2b2a"),
    "cleanup": ("#35772f", "#123513"),
    "space-lens": ("#341079", "#110a31"),
    "applications": ("#7a5215", "#2b1c05"),
    "developer-center": ("#2e6ca3", "#0f2d65"),
    "history": ("#2f2a80", "#100e33"),
    "playground": ("#7a1f4d", "#2c0a1b"),
    "settings": ("#3a4654", "#141a20"),
}

# Light theme keeps its existing near-white tints as the lit/deep pair.
LIGHT = {
    "dashboard": ("#e8f5ec", "#d3e7da"),
    "smart-scan": ("#e4f4f3", "#cde7e5"),
    "cleanup": ("#e7f6ea", "#d1e8d8"),
    "space-lens": ("#efe9fb", "#ddd2f2"),
    "applications": ("#fbf1e2", "#efdec4"),
    "developer-center": ("#e7effc", "#d2e0f5"),
    "history": ("#eaeafb", "#d5d6f3"),
    "playground": ("#fbeaf3", "#f0d5e5"),
    "settings": ("#edf0f3", "#dde2e8"),
}

HUE_SPREAD = 14  # degrees either side of the route hue
TEXT = {"dark": "#f2fbf4", "light": "#1c1c1e"}


def emit(theme, table):
    print(f"/* ---------- {theme} ---------- */")
    worst = (99, None)
    for route, (lit, deep) in table.items():
        light_a = rotate_hue(lit, -HUE_SPREAD)  # warm side
        light_b = rotate_hue(lit, +HUE_SPREAD)  # cool side
        base = lerp(deep, lit, 0.5)
        print(f"[data-route='{route}'] {{")
        print(f"  --route-base: {base};")
        print(f"  --route-deep: {deep};")
        print(f"  --route-light-a: {light_a};")
        print(f"  --route-light-b: {light_b};")
        print("}")
        for name, value in (
            ("base", base),
            ("deep", deep),
            ("light-a", light_a),
            ("light-b", light_b),
        ):
            ratio = contrast(TEXT[theme], value)
            flag = "  <-- FAIL" if ratio < 4.5 else ""
            print(f"    /* {name:8} {value}  {ratio:5.2f}:1{flag} */")
            if ratio < worst[0]:
                worst = (ratio, f"{route}/{name} {value}")
    print(f"/* worst: {worst[1]} at {worst[0]:.2f}:1 */\n")


emit("dark", DARK)
emit("light", LIGHT)
