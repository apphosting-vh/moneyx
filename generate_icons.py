#!/usr/bin/env python3
"""
generate_icons.py — Money Manager PWA Icon Generator
-----------------------------------------------------
Resizes a single source image into all required PWA icon sizes.

Requirements:
    pip install Pillow

Usage:
    python generate_icons.py source_icon.png
    python generate_icons.py source_icon.svg   (requires cairosvg: pip install cairosvg)

The source image should be:
  • At least 512×512 px
  • Square (1:1 ratio)
  • PNG with transparent background recommended
  • The icon should have ~10% padding so it looks good as a maskable icon

Output:  icons/  folder with all sizes ready for deployment.
"""

import sys
import os
from pathlib import Path

SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

def generate(source_path: str):
    src = Path(source_path)
    if not src.exists():
        print(f"Error: file not found: {source_path}")
        sys.exit(1)

    # Handle SVG input
    if src.suffix.lower() == '.svg':
        try:
            import cairosvg
            png_data = cairosvg.svg2png(url=str(src), output_width=512, output_height=512)
            from PIL import Image
            import io
            img = Image.open(io.BytesIO(png_data)).convert("RGBA")
        except ImportError:
            print("SVG input requires cairosvg: pip install cairosvg")
            sys.exit(1)
    else:
        from PIL import Image
        img = Image.open(src).convert("RGBA")

    # Check size
    w, h = img.size
    if w < 512 or h < 512:
        print(f"Warning: source image is {w}×{h}. Recommend at least 512×512 for best quality.")
    if w != h:
        print(f"Warning: source image is not square ({w}×{h}). Cropping to centre square.")
        side = min(w, h)
        left = (w - side) // 2
        top  = (h - side) // 2
        img  = img.crop((left, top, left + side, top + side))

    out_dir = Path("icons")
    out_dir.mkdir(exist_ok=True)

    for size in SIZES:
        resized = img.resize((size, size), Image.LANCZOS)
        out_path = out_dir / f"icon-{size}.png"
        resized.save(out_path, "PNG", optimize=True)
        print(f"  ✓ icons/icon-{size}.png  ({size}×{size})")

    print(f"\nDone! {len(SIZES)} icons written to icons/")
    print("\nTip: For a maskable icon (Android adaptive icon), ensure your design")
    print("     has ~10% safe-zone padding on all sides (the 'important content'")
    print("     should be within the inner 80% of the image area).")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate_icons.py <source_image.png>")
        print("       source image should be square, 512×512 px or larger")
        sys.exit(1)
    generate(sys.argv[1])
