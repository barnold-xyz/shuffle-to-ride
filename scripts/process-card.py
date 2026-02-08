#!/usr/bin/env python3
"""Post-process generated card images.

Takes a 1024x1024 RGB image from Gemini, removes the background with
proper alpha-aware edge handling, crops, and resizes to 600x420.

Usage:
    python3 process-card.py input.png output.png
    python3 process-card.py input.png output.png --fuzz 30
"""

import sys
from PIL import Image, ImageFilter
import numpy as np
from collections import deque


def flood_fill_mask(img_array, tolerance=25):
    """Create a background mask using flood fill from all edges.

    Unlike a global color threshold, this only marks pixels that are
    reachable from the image border -- so internal light-colored areas
    (like window panes) are preserved.
    """
    h, w = img_array.shape[:2]
    bg_color = img_array[0, 0, :3].astype(np.float64)
    visited = np.zeros((h, w), dtype=bool)
    is_background = np.zeros((h, w), dtype=bool)

    # Pre-compute color distance from background for every pixel
    rgb = img_array[:, :, :3].astype(np.float64)
    diff = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))

    # Seed from all border pixels that are close to background color
    queue = deque()
    for x in range(w):
        for y in [0, h - 1]:
            if diff[y, x] <= tolerance:
                queue.append((y, x))
                visited[y, x] = True
                is_background[y, x] = True
    for y in range(h):
        for x in [0, w - 1]:
            if diff[y, x] <= tolerance and not visited[y, x]:
                queue.append((y, x))
                visited[y, x] = True
                is_background[y, x] = True

    # BFS flood fill
    while queue:
        cy, cx = queue.popleft()
        for dy, dx in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                if diff[ny, nx] <= tolerance:
                    is_background[ny, nx] = True
                    queue.append((ny, nx))

    return is_background


def remove_background(img, fuzz=30):
    """Remove background using flood fill with soft alpha edges."""
    rgba = img.convert("RGBA")
    data = np.array(rgba)

    print("  Flood filling from edges...")
    bg_mask = flood_fill_mask(data, tolerance=fuzz)

    # For pixels right at the boundary between bg and subject,
    # compute a soft alpha based on color distance from background.
    # This handles anti-aliased edges gracefully.
    bg_color = data[0, 0, :3].astype(np.float64)
    rgb = data[:, :, :3].astype(np.float64)
    color_dist = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))

    # Create alpha channel:
    # - Background pixels (flood-filled): fully transparent
    # - Subject pixels far from bg color: fully opaque
    # - Edge pixels near bg color but not flood-filled: partial alpha
    alpha = np.full(data.shape[:2], 255, dtype=np.uint8)
    alpha[bg_mask] = 0

    # Soft edge: for non-background pixels within 2x the fuzz range,
    # scale alpha by how far they are from the background color
    edge_zone = (~bg_mask) & (color_dist < fuzz * 2)
    edge_alpha = np.clip((color_dist[edge_zone] - fuzz * 0.5) / (fuzz * 1.5) * 255, 0, 255)
    alpha[edge_zone] = edge_alpha.astype(np.uint8)

    data[:, :, 3] = alpha
    return Image.fromarray(data)


def crop_to_content(img, padding=2):
    """Crop to bounding box of non-transparent pixels with small padding."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    # Add padding
    x1 = max(0, bbox[0] - padding)
    y1 = max(0, bbox[1] - padding)
    x2 = min(img.width, bbox[2] + padding)
    y2 = min(img.height, bbox[3] + padding)
    return img.crop((x1, y1, x2, y2))


def fit_to_canvas(img, width=600, height=420):
    """Resize to fit within canvas and center with transparent padding."""
    margin = 0.03  # 3% margin on each side
    target_w = int(width * (1 - 2 * margin))
    target_h = int(height * (1 - 2 * margin))

    ratio = min(target_w / img.width, target_h / img.height)
    new_w = int(img.width * ratio)
    new_h = int(img.height * ratio)
    resized = img.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    x = (width - new_w) // 2
    y = (height - new_h) // 2
    canvas.paste(resized, (x, y), resized)

    return canvas


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 process-card.py input.png output.png [--fuzz N]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    fuzz = 30

    if "--fuzz" in sys.argv:
        idx = sys.argv.index("--fuzz")
        fuzz = int(sys.argv[idx + 1])

    img = Image.open(input_path)
    print(f"Input: {img.size}, mode={img.mode}")

    img = remove_background(img, fuzz=fuzz)
    print("  Background removed")

    img = crop_to_content(img)
    print(f"  Cropped to content: {img.size}")

    img = fit_to_canvas(img)
    print(f"  Final: {img.size}")

    img.save(output_path)
    print(f"  Saved to: {output_path}")


if __name__ == "__main__":
    main()
