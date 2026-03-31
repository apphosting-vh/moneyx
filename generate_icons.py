#!/usr/bin/env python3
"""
generate_icons.py — finsight icon generator
Produces all PNG icon sizes required for:
  • Web PWA (manifest.json)
  • Android launcher (TWA / Chrome)
  • iOS Safari (apple-touch-icon)
  • Windows / Edge (browserconfig.xml)
  • Google Play Store screenshots placeholder sizes

Usage:
    pip install cairosvg Pillow
    python3 generate_icons.py
"""

import os
import sys

try:
    import cairosvg
    from PIL import Image
    import io
except ImportError:
    print("ERROR: Missing dependencies. Run:")
    print("  pip install cairosvg Pillow")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR = os.path.join(BASE_DIR, "icons")
os.makedirs(ICONS_DIR, exist_ok=True)

MASTER_SVG    = os.path.join(BASE_DIR, "icon-master.svg")
MASKABLE_SVG  = os.path.join(BASE_DIR, "icon-maskable.svg")

# ── All required sizes ─────────────────────────────────────────────────────
# Format: (size, filename, use_maskable)
ICON_SPECS = [
    # Favicon
    (16,   "favicon-16x16.png",          False),
    (32,   "favicon-32x32.png",          False),
    (48,   "favicon-48x48.png",          False),

    # iOS / Safari
    (57,   "apple-touch-icon-57x57.png", False),
    (60,   "apple-touch-icon-60x60.png", False),
    (72,   "apple-touch-icon-72x72.png", False),
    (76,   "apple-touch-icon-76x76.png", False),
    (114,  "apple-touch-icon-114x114.png", False),
    (120,  "apple-touch-icon-120x120.png", False),
    (144,  "apple-touch-icon-144x144.png", False),
    (152,  "apple-touch-icon-152x152.png", False),
    (167,  "apple-touch-icon-167x167.png", False),
    (180,  "apple-touch-icon-180x180.png", False),  # Primary apple-touch-icon
    (1024, "apple-touch-icon-1024x1024.png", False), # App Store

    # Standard PWA / manifest icons
    (72,   "icon-72x72.png",   False),
    (96,   "icon-96x96.png",   False),
    (128,  "icon-128x128.png", False),
    (144,  "icon-144x144.png", False),
    (152,  "icon-152x152.png", False),
    (192,  "icon-192x192.png", False),  # Primary Android
    (384,  "icon-384x384.png", False),
    (512,  "icon-512x512.png", False),  # Primary Play Store

    # Maskable variants (Android adaptive icons — safe zone aware)
    (192,  "icon-192x192-maskable.png", True),
    (512,  "icon-512x512-maskable.png", True),

    # Windows / Edge tiles
    (70,   "mstile-70x70.png",   False),
    (150,  "mstile-150x150.png", False),
    (310,  "mstile-310x310.png", False),
    (150,  "mstile-310x150.png", False),  # Wide tile — generated square, referenced as wide
]

def svg_to_png(svg_path: str, size: int) -> bytes:
    """Render SVG to PNG bytes at the given square size."""
    return cairosvg.svg2png(
        url=svg_path,
        output_width=size,
        output_height=size,
    )

def save_icon(svg_path: str, size: int, out_path: str):
    png_bytes = svg_to_png(svg_path, size)
    with open(out_path, "wb") as f:
        f.write(png_bytes)
    kb = len(png_bytes) / 1024
    print(f"  ✓  {os.path.basename(out_path):45s}  ({size}×{size}px, {kb:.1f} KB)")

def generate_favicon_ico():
    """Bundle 16, 32, 48px into a single favicon.ico"""
    images = []
    for size in [16, 32, 48]:
        png_bytes = svg_to_png(MASTER_SVG, size)
        img = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
        images.append(img)
    ico_path = os.path.join(BASE_DIR, "favicon.ico")
    images[0].save(
        ico_path,
        format="ICO",
        sizes=[(16,16), (32,32), (48,48)],
        append_images=images[1:],
    )
    print(f"  ✓  {'favicon.ico':45s}  (multi-size: 16, 32, 48px)")

# ── Main ───────────────────────────────────────────────────────────────────
print("finsight — Icon Generator")
print("=" * 60)
print(f"  Master SVG   : {MASTER_SVG}")
print(f"  Maskable SVG : {MASKABLE_SVG}")
print(f"  Output dir   : {ICONS_DIR}")
print()

seen = set()
for size, filename, use_maskable in ICON_SPECS:
    key = filename
    if key in seen:
        continue
    seen.add(key)

    svg = MASKABLE_SVG if use_maskable else MASTER_SVG
    out = os.path.join(ICONS_DIR, filename)
    try:
        save_icon(svg, size, out)
    except Exception as e:
        print(f"  ✗  {filename}: {e}")

print()
print("  Generating favicon.ico ...")
try:
    generate_favicon_ico()
except Exception as e:
    print(f"  ✗  favicon.ico: {e}")

print()
print("=" * 60)
print(f"  Done — icons written to: {ICONS_DIR}/")
print()
print("  Next steps:")
print("  1. Copy all files to your web root (alongside index.html)")
print("  2. The manifest.json references icon-192x192.png and icon-512x512.png")
print("  3. For TWA: use icon-512x512.png as the Play Store listing icon")
print("  4. Maskable icons are listed separately in manifest.json")
