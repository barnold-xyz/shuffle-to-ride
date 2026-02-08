#!/usr/bin/env python3
"""Create an animated GIF of the locomotive with glint/sparkle effects.

Small bright glints appear and fade across the locomotive body,
like light catching on polished metal.

Usage:
    python3 animate-locomotive-glints.py input.png output.gif [--frames 60] [--duration 100] [--glints 8]
"""

import sys
import random
import math
from PIL import Image, ImageDraw
import numpy as np


def draw_glint(draw, cx, cy, size, brightness):
    """Draw a 4-pointed star glint at (cx, cy).

    brightness: 0.0 to 1.0 controls opacity/intensity
    size: radius of the glint arms
    """
    if brightness <= 0:
        return

    alpha = int(255 * brightness)

    # Outer glow -- thick fading lines
    glow_size = int(size * 1.5)
    for t in np.linspace(0, 1, max(glow_size, 4)):
        d = int(glow_size * t)
        a = int(alpha * 0.35 * (1 - t))
        w = max(1, int(3 * (1 - t)))  # Thicker near center
        c = (255, 230, 180, a)
        draw.line((cx - d, cy, cx + d, cy), fill=c, width=w)
        draw.line((cx, cy - d, cx, cy + d), fill=c, width=w)

    # Bright core arms -- solid lines that taper
    core_size = max(int(size * 0.7), 2)
    for t in np.linspace(0, 1, max(core_size, 3)):
        d = int(core_size * t)
        a = int(alpha * (1 - t * 0.4))
        w = max(1, int(2 * (1 - t)))
        c = (255, 248, 220, a)
        draw.line((cx - d, cy, cx + d, cy), fill=c, width=w)
        draw.line((cx, cy - d, cx, cy + d), fill=c, width=w)

    # Bright center dot
    r = max(2, int(size * 0.15))
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 250, 230, alpha))

    # Diagonal arms (shorter, fainter)
    diag_size = max(int(size * 0.5), 2)
    for t in np.linspace(0, 1, max(diag_size, 3)):
        d = int(diag_size * t)
        a = int(alpha * 0.5 * (1 - t))
        c = (255, 248, 220, a)
        draw.line((cx - d, cy - d, cx + d, cy + d), fill=c, width=1)
        draw.line((cx + d, cy - d, cx - d, cy + d), fill=c, width=1)


class Glint:
    """A single glint that fades in, peaks, and fades out."""

    def __init__(self, x, y, start_frame, duration_frames, size):
        self.x = x
        self.y = y
        self.start = start_frame
        self.duration = duration_frames
        self.size = size

    def brightness_at(self, frame):
        """Return brightness 0-1 at given frame."""
        t = frame - self.start
        if t < 0 or t >= self.duration:
            return 0.0
        # Quick fade in, slow fade out
        progress = t / self.duration
        if progress < 0.2:
            return progress / 0.2
        else:
            return 1.0 - ((progress - 0.2) / 0.8)


def find_glint_positions(img_array, alpha, num_positions=200):
    """Find candidate positions for glints on the colorful body of the locomotive."""
    h, w = alpha.shape
    hsv_data = img_array[:, :, :3].astype(np.float64) / 255.0

    candidates = []
    for _ in range(num_positions * 10):
        y = random.randint(0, h - 1)
        x = random.randint(0, w - 1)
        if alpha[y, x] > 128:
            # Prefer lighter/more colorful areas (the body, not dark wheels)
            r, g, b = img_array[y, x, :3]
            luminance = 0.299 * r + 0.587 * g + 0.114 * b
            if luminance > 60:  # Not too dark
                candidates.append((x, y))
                if len(candidates) >= num_positions:
                    break

    return candidates


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 animate-locomotive-glints.py input.png output.gif [--frames 60] [--duration 100] [--glints 8]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    num_frames = 60
    frame_duration = 100  # ms per frame
    num_active_glints = 8  # roughly how many glints visible at any time

    if "--frames" in sys.argv:
        num_frames = int(sys.argv[sys.argv.index("--frames") + 1])
    if "--duration" in sys.argv:
        frame_duration = int(sys.argv[sys.argv.index("--duration") + 1])
    if "--glints" in sys.argv:
        num_active_glints = int(sys.argv[sys.argv.index("--glints") + 1])

    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    alpha = data[:, :, 3]

    print(f"Input: {img.size}, {num_frames} frames at {frame_duration}ms each")
    print(f"Total loop duration: {num_frames * frame_duration / 1000:.1f}s")

    # Find candidate glint positions on the locomotive body
    random.seed(42)  # Reproducible
    positions = find_glint_positions(data, alpha)
    print(f"Found {len(positions)} candidate glint positions")

    # Schedule glints across the animation
    # Each glint lasts ~8-15 frames, stagger starts so ~num_active_glints are visible at once
    glint_duration_range = (10, 18)
    glint_size_range = (12, 25)

    glints = []
    spacing = max(1, num_frames // (num_active_glints * 3))
    for i in range(num_active_glints * 4):
        start = (i * spacing) % num_frames
        duration = random.randint(*glint_duration_range)
        size = random.randint(*glint_size_range)
        pos = random.choice(positions)
        glints.append(Glint(pos[0], pos[1], start, duration, size))
        # Also schedule a wrapped version for seamless looping
        if start + duration > num_frames:
            glints.append(Glint(pos[0], pos[1], start - num_frames, duration, size))

    print(f"Scheduled {len(glints)} glint events")

    frames = []
    for f in range(num_frames):
        # Start with the original image
        frame = img.copy()
        overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        for g in glints:
            b = g.brightness_at(f)
            if b > 0:
                draw_glint(draw, g.x, g.y, g.size, b)

        # Composite glints on top
        frame = Image.alpha_composite(frame, overlay)

        # Threshold alpha for GIF compatibility
        frame_data = np.array(frame)
        frame_data[:, :, 3] = np.where(frame_data[:, :, 3] > 128, 255, 0)
        frame = Image.fromarray(frame_data)

        frames.append(frame)

        if (f + 1) % 10 == 0:
            print(f"  Frame {f + 1}/{num_frames}")

    print("Assembling GIF...")

    gif_frames = []
    for frame in frames:
        p_frame = frame.convert("P", palette=Image.ADAPTIVE, colors=255)
        mask = frame.split()[3].point(lambda x: 255 if x < 128 else 0)
        p_frame.paste(0, mask=mask)
        gif_frames.append(p_frame)

    gif_frames[0].save(
        output_path,
        save_all=True,
        append_images=gif_frames[1:],
        duration=frame_duration,
        loop=0,
        disposal=2,
        transparency=0,
    )

    import os
    size_kb = os.path.getsize(output_path) / 1024
    print(f"Saved to: {output_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
