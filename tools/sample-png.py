"""Sample pixel colours from a PNG without third-party libraries."""

import struct
import sys
import zlib


def load(path):
    data = open(path, "rb").read()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "not a png"
    pos, idat, ihdr = 8, [], None
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        ctype = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if ctype == b"IHDR":
            ihdr = struct.unpack(">IIBBBBB", body)
        elif ctype == b"IDAT":
            idat.append(body)
        elif ctype == b"IEND":
            break
        pos += 12 + length

    w, h, depth, color_type = ihdr[0], ihdr[1], ihdr[2], ihdr[3]
    assert depth == 8, f"unsupported bit depth {depth}"
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color_type]
    raw = zlib.decompress(b"".join(idat))

    stride = w * channels
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = prev[i]
            c = prev[i - channels] if i >= channels else 0
            x = line[i]
            if f == 1:
                x += a
            elif f == 2:
                x += b
            elif f == 3:
                x += (a + b) // 2
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                x += a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
            line[i] = x & 0xFF
        out[y * stride : (y + 1) * stride] = line
        prev = line
    return w, h, channels, out


def px(w, channels, buf, x, y):
    o = (y * w + x) * channels
    return buf[o], buf[o + 1], buf[o + 2]


if __name__ == "__main__":
    path = sys.argv[1]
    w, h, ch, buf = load(path)
    print(f"# {path.split('/')[-1]}  {w}x{h}")
    # Sample a grid of relative positions.
    for label, fx, fy in [
        ("sidebar-top", 0.06, 0.12),
        ("sidebar-mid", 0.06, 0.50),
        ("sidebar-bottom", 0.06, 0.88),
        ("bg-top-left", 0.30, 0.08),
        ("bg-center", 0.50, 0.45),
        ("bg-top-right", 0.92, 0.10),
        ("bg-bottom-right", 0.92, 0.92),
        ("bg-bottom-left", 0.30, 0.95),
        ("content-mid", 0.72, 0.55),
    ]:
        x, y = int(w * fx), int(h * fy)
        r, g, b = px(w, ch, buf, x, y)
        print(f"{label:18} ({fx:.2f},{fy:.2f}) #{r:02x}{g:02x}{b:02x}  rgb({r},{g},{b})")
