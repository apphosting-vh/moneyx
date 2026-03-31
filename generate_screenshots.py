#!/usr/bin/env python3
"""
generate_screenshots.py — finsight Play Store screenshot placeholders
Creates correctly-sized PNG placeholders for the manifest.json screenshots array.

For your actual Play Store submission, replace these with real device screenshots.
Required sizes:
  • Mobile (narrow): 390×844  (or any 9:19.5 ratio, min 320px wide)
  • Tablet (wide):   1280×800 (or any 16:10 ratio)

Usage:
    pip install Pillow
    python3 generate_screenshots.py
"""

import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
SHOTS_DIR   = os.path.join(BASE_DIR, "screenshots")
os.makedirs(SHOTS_DIR, exist_ok=True)

# (width, height, filename, label, form_factor)
SPECS = [
    (390,  844,  "screenshot-mobile-dashboard.png",     "Dashboard",     "narrow"),
    (390,  844,  "screenshot-mobile-transactions.png",  "Transactions",  "narrow"),
    (390,  844,  "screenshot-mobile-investments.png",   "Investments",   "narrow"),
    (1280, 800,  "screenshot-desktop-dashboard.png",    "Desktop View",  "wide"),
]

BG      = (5,   8,  15)       # #05080f
ACCENT  = (2, 132, 199)       # #0284c7
TEXT_HI = (224, 242, 254)     # #e0f2fe
TEXT_LO = (100, 130, 160)

def draw_placeholder(w, h, label, form_factor):
    img = Image.new("RGB", (w, h), BG)
    d   = ImageDraw.Draw(img)

    # Border
    d.rectangle([0, 0, w-1, h-1], outline=ACCENT, width=2)

    # Accent corner lines
    for corner in [(0,0), (w-60,0), (0,h-40), (w-60,h-40)]:
        x, y = corner
        d.rectangle([x, y, x+60, y+40], outline=(*ACCENT, 60), width=1)

    # Diagonal grid lines (subtle)
    for i in range(-h, w + h, 60):
        d.line([(i, 0), (i + h, h)], fill=(*ACCENT, 18), width=1)

    # Centre box
    cx, cy = w // 2, h // 2
    box_w, box_h = min(w - 80, 500), min(h - 120, 260)
    d.rectangle(
        [cx - box_w//2, cy - box_h//2, cx + box_w//2, cy + box_h//2],
        fill=(10, 22, 40), outline=(*ACCENT, 120), width=1,
    )

    # App name
    d.text((cx, cy - box_h//2 + 28), "₹ finsight",
           fill=TEXT_HI, anchor="mm")

    # Screen label
    d.text((cx, cy), label,
           fill=ACCENT, anchor="mm")

    # Form factor tag
    tag = f"{w}×{h}  {form_factor}"
    d.text((cx, cy + box_h//2 - 24), tag,
           fill=TEXT_LO, anchor="mm")

    # Instruction text
    note = "Replace with a real device screenshot before Play Store submission"
    d.text((cx, h - 24), note, fill=TEXT_LO, anchor="mm")

    return img

print("finsight — Screenshot Placeholder Generator")
print("=" * 60)
for w, h, fname, label, ff in SPECS:
    img  = draw_placeholder(w, h, label, ff)
    path = os.path.join(SHOTS_DIR, fname)
    img.save(path, "PNG", optimize=True)
    kb = os.path.getsize(path) / 1024
    print(f"  ✓  {fname:50s}  ({w}×{h}, {kb:.1f} KB)")

print()
print("=" * 60)
print(f"  Screenshots written to: {SHOTS_DIR}/")
print()
print("  ⚠  These are PLACEHOLDERS.")
print("     Replace each file with a real screenshot before submitting")
print("     to the Google Play Store. Minimum requirements:")
print("     • At least 2 phone screenshots (16:9 or 9:16 ratio)")
print("     • File size: under 8 MB per screenshot")
print("     • Format: PNG or JPEG")
