#!/usr/bin/env python3
"""Resize an image to favicon size (48x48)."""
import sys
from PIL import Image

img = Image.open(sys.argv[1])
favicon = img.resize((48, 48), Image.LANCZOS)
favicon.save(sys.argv[2])
print(f"Saved {sys.argv[2]} ({favicon.size})")
