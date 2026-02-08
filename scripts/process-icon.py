#!/usr/bin/env python3
"""Post-process app icon: crop to content, pad to square, resize to 1024x1024."""
import sys
from PIL import Image
import numpy as np

def main():
    if len(sys.argv) < 3:
        print("Usage: python process-icon.py input.png output.png [--bg-color R,G,B] [--padding PERCENT]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Parse optional args
    bg_color = (45, 38, 34)  # #2D2622 dark wood
    padding_pct = 5  # percent padding around content

    if "--bg-color" in sys.argv:
        idx = sys.argv.index("--bg-color") + 1
        bg_color = tuple(int(x) for x in sys.argv[idx].split(","))
    if "--padding" in sys.argv:
        idx = sys.argv.index("--padding") + 1
        padding_pct = int(sys.argv[idx])

    img = Image.open(input_path).convert("RGB")
    data = np.array(img)
    print(f"Input: {img.size}")

    # Find content bounds - pixels that differ significantly from the background
    # Sample background color from corners
    corners = [data[0, 0], data[0, -1], data[-1, 0], data[-1, -1]]
    avg_bg = np.mean(corners, axis=0)
    print(f"Detected background: RGB({avg_bg[0]:.0f}, {avg_bg[1]:.0f}, {avg_bg[2]:.0f})")

    # Mask of content pixels (differ from background by more than threshold)
    diff = np.abs(data.astype(float) - avg_bg).max(axis=2)
    content_mask = diff > 20

    # Find bounding box of content
    rows = np.any(content_mask, axis=1)
    cols = np.any(content_mask, axis=0)
    y_min, y_max = np.where(rows)[0][[0, -1]]
    x_min, x_max = np.where(cols)[0][[0, -1]]
    print(f"Content bounds: ({x_min}, {y_min}) to ({x_max}, {y_max})")

    # Crop to content
    cropped = img.crop((x_min, y_min, x_max + 1, y_max + 1))
    cw, ch = cropped.size
    print(f"Cropped: {cw}x{ch}")

    # Pad to square
    side = max(cw, ch)
    padding = int(side * padding_pct / 100)
    canvas_size = side + 2 * padding

    canvas = Image.new("RGB", (canvas_size, canvas_size), bg_color)
    paste_x = (canvas_size - cw) // 2
    paste_y = (canvas_size - ch) // 2
    canvas.paste(cropped, (paste_x, paste_y))
    print(f"Padded to: {canvas_size}x{canvas_size}")

    # Resize to 1024x1024
    final = canvas.resize((1024, 1024), Image.LANCZOS)
    final.save(output_path)
    print(f"Saved: {output_path} (1024x1024)")


if __name__ == "__main__":
    main()
