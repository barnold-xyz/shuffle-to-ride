#!/usr/bin/env python3
"""Quick image info check."""
import sys
from PIL import Image

img = Image.open(sys.argv[1])
print(f"Size: {img.size}, Mode: {img.mode}")
