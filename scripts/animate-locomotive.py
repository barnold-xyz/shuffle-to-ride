#!/usr/bin/env python3
"""Create an animated GIF of the locomotive with a slow color shimmer.

Takes the static locomotive PNG and creates frames by rotating the hue
of the colored body while keeping the neutral wheels/undercarriage stable.

Usage:
    python3 animate-locomotive.py input.png output.gif [--frames 60] [--duration 100]
"""

import sys
from PIL import Image
import numpy as np
import colorsys


def rgb_to_hsv_array(rgb):
    """Convert RGB numpy array to HSV."""
    r, g, b = rgb[:, :, 0] / 255.0, rgb[:, :, 1] / 255.0, rgb[:, :, 2] / 255.0

    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    v = maxc
    s = np.where(maxc != 0, (maxc - minc) / maxc, 0)

    delta = maxc - minc
    # Avoid division by zero
    delta = np.where(delta == 0, 1, delta)

    h = np.zeros_like(r)
    mask_r = (maxc == r) & (s > 0)
    mask_g = (maxc == g) & (s > 0)
    mask_b = (maxc == b) & (s > 0)

    h[mask_r] = ((g[mask_r] - b[mask_r]) / delta[mask_r]) % 6
    h[mask_g] = ((b[mask_g] - r[mask_g]) / delta[mask_g]) + 2
    h[mask_b] = ((r[mask_b] - g[mask_b]) / delta[mask_b]) + 4

    h = h / 6.0  # Normalize to 0-1

    return np.stack([h, s, v], axis=2)


def hsv_to_rgb_array(hsv):
    """Convert HSV numpy array back to RGB."""
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

    i = (h * 6.0).astype(int) % 6
    f = (h * 6.0) - i.astype(float)
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))

    rgb = np.zeros((*h.shape, 3))

    for idx in range(6):
        mask = i == idx
        if idx == 0:
            rgb[mask] = np.stack([v[mask], t[mask], p[mask]], axis=1)
        elif idx == 1:
            rgb[mask] = np.stack([q[mask], v[mask], p[mask]], axis=1)
        elif idx == 2:
            rgb[mask] = np.stack([p[mask], v[mask], t[mask]], axis=1)
        elif idx == 3:
            rgb[mask] = np.stack([p[mask], q[mask], v[mask]], axis=1)
        elif idx == 4:
            rgb[mask] = np.stack([t[mask], p[mask], v[mask]], axis=1)
        elif idx == 5:
            rgb[mask] = np.stack([v[mask], p[mask], q[mask]], axis=1)

    return (rgb * 255).astype(np.uint8)


def create_shimmer_frame(data, hsv, alpha, saturation_mask, hue_shift):
    """Create a single frame with hue shifted on saturated pixels only."""
    shifted_hsv = hsv.copy()
    shifted_hsv[:, :, 0] = (hsv[:, :, 0] + hue_shift) % 1.0

    # Only shift pixels that have enough saturation (the colorful body)
    # Leave low-saturation pixels alone (dark wheels, neutral tones)
    new_rgb = hsv_to_rgb_array(shifted_hsv)

    result = data.copy()
    result[:, :, 0] = np.where(saturation_mask, new_rgb[:, :, 0], data[:, :, 0])
    result[:, :, 1] = np.where(saturation_mask, new_rgb[:, :, 1], data[:, :, 1])
    result[:, :, 2] = np.where(saturation_mask, new_rgb[:, :, 2], data[:, :, 2])

    return result


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 animate-locomotive.py input.png output.gif [--frames 60] [--duration 100]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    # Parse optional args
    num_frames = 48
    frame_duration = 120  # ms per frame

    if "--frames" in sys.argv:
        num_frames = int(sys.argv[sys.argv.index("--frames") + 1])
    if "--duration" in sys.argv:
        frame_duration = int(sys.argv[sys.argv.index("--duration") + 1])

    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    alpha = data[:, :, 3]
    rgb = data[:, :, :3]

    print(f"Input: {img.size}, {num_frames} frames at {frame_duration}ms each")
    print(f"Total loop duration: {num_frames * frame_duration / 1000:.1f}s")

    # Convert to HSV for hue manipulation
    hsv = rgb_to_hsv_array(rgb)

    # Create mask: only shift hue on pixels that are both visible and colorful
    # Saturation threshold separates the colorful body from neutral dark wheels
    saturation_mask = (hsv[:, :, 1] > 0.15) & (alpha > 128)

    print(f"Colorful pixels: {saturation_mask.sum()} / {(alpha > 128).sum()} opaque pixels")

    frames = []
    for i in range(num_frames):
        hue_shift = i / num_frames  # Full rotation over all frames
        frame_data = create_shimmer_frame(data, hsv, alpha, saturation_mask, hue_shift)

        # GIF only supports binary transparency (no semi-transparent pixels).
        # Threshold alpha to 0 or 255 to avoid black-fringe artifacts.
        frame_data[:, :, 3] = np.where(frame_data[:, :, 3] > 128, 255, 0)

        frame_img = Image.fromarray(frame_data)
        frames.append(frame_img)

        if (i + 1) % 10 == 0:
            print(f"  Frame {i + 1}/{num_frames}")

    print("Assembling GIF...")

    # Convert RGBA frames to palette mode with proper transparency handling.
    # Pillow's default RGBA->GIF conversion composites against black, causing
    # the black background issue. We handle it explicitly.
    gif_frames = []
    for frame in frames:
        # Create a new palette image with a designated transparent color
        p_frame = frame.convert("P", palette=Image.ADAPTIVE, colors=255)
        # Map fully transparent pixels to index 0
        mask = frame.split()[3].point(lambda x: 255 if x < 128 else 0)
        p_frame.paste(0, mask=mask)
        gif_frames.append(p_frame)

    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration,
        loop=0,  # Loop forever
        disposal=2,  # Clear frame before drawing next
        transparency=0,
    )

    import os
    size_kb = os.path.getsize(output_path) / 1024
    print(f"Saved to: {output_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
