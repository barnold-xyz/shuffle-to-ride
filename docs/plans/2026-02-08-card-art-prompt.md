# NanoBanana Prompt: Ticket to Ride Train Card Set

## Overview

I need **9 train card images** for a mobile companion app called "Shuffle to Ride." The app uses a **"Railroad Heritage" design system** inspired by the **golden age of rail travel (1920s-1930s)** -- think luxury travel posters, art deco geometry, polished brass, aged leather, and warm wood tones.

The current cards are cartoon clipart boxcars on white backgrounds. They need to be replaced with something that matches the refined, elegant aesthetic of the app.

## Design Direction

**Style:** Vintage railroad poster / art deco illustration. Think bold flat color planes, strong geometric shapes, and minimal shading -- like a screen-printed travel poster, NOT a soft digital painting or cartoon. Inspired by 1920s-30s travel posters (Cassandre, A.M. Mouron) and railroad advertising art. If it looks like it could have been made in Photoshop with gradient fills and soft brushes, it's wrong. If it looks like it was printed from woodblocks or lithograph plates with 4-5 colors, it's right.

**Mood:** Elegant, timeless, warm. These should feel like they belong on a polished mahogany table, not in a children's toy box.

**Viewpoint:** Pure **flat side-view profile** -- as if looking at the train from directly beside the tracks. No 3/4 angle, no perspective, no isometric view. A perfectly flat 2D side elevation, like a technical diagram or a sprite in a side-scrolling game. This is essential for visual consistency across the set.

**Composition:** Each card should feature a **train car or railroad element** as its central subject, rendered in the card's designated color. All trains/cars must be **facing to the right.**

**Background:** Transparent. No background fill, no background color, no backdrop. The app composites these images onto its own dark UI.

**No borders or frames.** The app handles all card framing. The image should be the train car illustration only.

**No text or labels.** No card names, color names, numbers, or any other text on the images.

## Exact Pixel Sizes

Cards are displayed at two sizes in the app:

| Size | Display Dimensions | Use |
|------|--------------------|-----|
| **Normal** | 100 x 70 px | Face-up cards in draw area |
| **Small** | 70 x 50 px | Cards in player's hand |

To support high-density (Retina) screens, **source images should be 3x the normal display size:**

| Deliverable | Pixel Dimensions | Aspect Ratio |
|-------------|------------------|--------------|
| **Source image** | **300 x 210 px** | 10:7 |

If you can provide higher resolution (e.g., 600 x 420), even better -- the app will scale down. But **300 x 210 is the minimum** for crisp rendering on modern phones.

## The 9 Cards

Each card represents a **train car color** in Ticket to Ride. The subject should be recognizably a train car but with variety:

| Card | Color Hex | Suggested Subject |
|------|-----------|-------------------|
| **Red** | `#C41E3A` | Classic boxcar |
| **Orange** | `#D2691E` | Cattle car or gondola |
| **Yellow** | `#DAA520` | Passenger coach |
| **Green** | `#2E8B57` | Mail/postal car |
| **Blue** | `#2563EB` | Refrigerator car |
| **Purple** | `#7B2D8B` | Caboose |
| **Black** | `#2C2C2C` | Coal hopper |
| **White** | `#D4C5B0` (cream) | Tanker car |
| **Locomotive** | Rainbow/multicolor | Steam locomotive (see special notes below) |

**Color treatment:** The designated color applies to the **car body only**. The wheels, undercarriage, frame, and couplers should be a consistent **dark iron/charcoal** (`#2C2C2C` to `#3A3A3A`) across all cards, with optional brass/gold (`#C9A227`) highlights on hardware details. This contrast is critical -- it gives the car definition and makes the body color pop. Without it, the entire illustration becomes a monochrome blob of the same hue.

The car body color should be rendered in a sophisticated way -- not a flat solid fill. Use 2-3 shades of the designated color for depth (a base tone, a darker shadow, and a lighter highlight), consistent with a limited-palette poster print technique. The color should be immediately identifiable at small sizes (50px tall).

## Visual Consistency (Critical)

**These cars must look like they belong to the same train.** Imagine lining all 8 color cards up in a row -- they should look like a cohesive consist you'd see rolling down the tracks, not a mismatched collection.

Specifically:

- **Wheels:** All cars must share the **same wheel style, size, and vertical position**. Use a consistent truck/bogie design across every card (including the locomotive). Wheels should sit on the same baseline.
- **Proportions:** All 8 color cars should have the **same overall height and length**. A boxcar and a tanker are different shapes on top, but the undercarriage, coupler height, and car body width should be uniform. No card should look noticeably taller, shorter, longer, or stubbier than the others.
- **Vertical position:** The rail line / wheel baseline should be at the **same Y-position** on every card so they visually align when displayed side by side.
- **Undercarriage:** Use the same frame, coupler, and truck design across all cars. Only the body above the frame should vary by car type.
- **Line weight and detail level:** Same outline thickness, same shading approach, same level of detail on every card.
- **The locomotive** is naturally larger/taller than the cars -- that's fine and expected. But it should still share the same wheel style and baseline so it looks like it could pull the rest of the train.

Think of it like a sprite sheet for a side-scrolling game: if you placed these images next to each other, the cars should connect into a believable train.

## Locomotive: Special Card

The locomotive is the **wild card** and should feel distinctly special compared to the 8 standard cars.

**Important:**
- **No smoke coming out of the smokestack.** Keep it clean.
- **Facing right**, same as all other cards.
- **Rainbow/multicolor** treatment -- the body should cycle through or blend the colors of the other 8 cards.

**Please provide two versions:**

1. **Static PNG** (`locomotive.png`) -- The locomotive rendered with a rainbow/multicolor gradient or prismatic treatment. This is the guaranteed-to-use version.

2. **Animated GIF** (`locomotive.gif`) -- A subtle, slow animation where the colors **shimmer or gently cycle** across the locomotive body. Think iridescent metal or a slow prismatic shift, not a flashy strobe. Loop seamlessly. Keep the frame count and file size reasonable (aim for under 500KB if possible -- the fewer colors in the palette, the smaller the GIF).

## Technical Requirements

**These images will be used directly as game assets in a mobile app -- they are not mockups or concepts.** They need to be final, production-ready art that can be dropped straight into the build with zero editing.

- **Exact dimensions:** **600 x 420 px** (10:7 aspect ratio). All 9 cards must be this exact size.
- **Framing:** The train car illustration must **fill the canvas**. The car should span nearly the full width (edge to edge, with only a few pixels of padding) and be vertically centered. Do NOT leave large empty margins around the illustration -- the image IS the card, not a card within a card.
- **Format:** PNG-24 with alpha transparency for all 8 color cards. PNG + GIF for locomotive.
- **Clean transparency:** The alpha channel must be pixel-clean. No haze, fog, glow, ground shadow, drop shadow, or semi-transparent artifacts bleeding into the transparent area. Every pixel is either fully opaque (part of the illustration) or fully transparent (background). This is critical -- any artifacts will be visible against the app's dark background.
- **File names:** `red.png`, `orange.png`, `yellow.png`, `green.png`, `blue.png`, `purple.png`, `black.png`, `white.png`, `locomotive.png`, `locomotive.gif`
- **Consistency:** All 9 cards should feel like they belong to the same set -- same style, same level of detail, same general composition structure. All facing right.
- **Legibility at small size:** These images will be displayed as small as **70 x 50 px**. The train car shape and color must be clearly distinguishable at that size. This means: bold shapes, strong silhouettes, minimal fine detail. Avoid thin lines, tiny hardware, or intricate textures that disappear when scaled down.

## App Color Context (for reference)

The cards appear against dark wood-toned backgrounds (`#2D2622` to `#3D342D`). The transparent background of the card images will let this show through.

## What to Avoid

- **3/4 perspective, isometric, or any angled viewpoint** -- must be a flat side-view profile only
- **Monochrome illustrations** where the wheels, frame, and body are all the same color -- the undercarriage must contrast with the body
- Cartoon or clipart style (the current cards look like this -- that's what we're replacing)
- Soft digital painting with smooth gradients and airbrush-style shading
- Photorealistic renders
- Bright/saturated backgrounds
- Modern flat design with no texture
- Overly complex detail (cross-bracing, tiny rivets, intricate wheel mechanisms) -- these disappear at display size
- Illustrations that float in the center of a large empty canvas -- the car must fill the frame
- Haze, fog, ground shadows, or any semi-transparent artifacts in the transparent areas
- Pure white anywhere (use cream/parchment `#D4C5B0` if you need a light tone)
- **No text, labels, or lettering** on the cards
- **No borders or frames** around the illustrations
- **No smoke, steam, or exhaust** on the locomotive

## Reference Mood

Think: if the *Orient Express* had a card game, and the cards were designed by a 1920s poster artist using a limited color palette and bold graphic shapes. Warm, rich, and collectible-feeling.

---

Feel free to adjust the specific car types per color -- the important thing is that each card is **immediately distinguishable by color** at thumbnail size, the set is **visually cohesive**, the style matches **vintage railroad poster art**, and **all trains face right**.
