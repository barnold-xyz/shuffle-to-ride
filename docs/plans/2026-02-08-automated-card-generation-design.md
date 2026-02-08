# Automated Card Art Generation

**Date:** 2026-02-08
**Status:** Draft

## Goal

Automate train card image generation using the Gemini 2.5 Flash Image API, with Claude acting as art director -- evaluating each generated image and iterating with feedback until it meets quality standards.

## Approach

Use Gemini's native image generation (`gemini-2.5-flash-image`) via the REST API. This model supports conversational multimodal input, meaning we can send back a previous attempt along with specific critique and ask it to fix issues. This is the core advantage over a blind re-roll approach.

## Script: `scripts/generate-card.js`

A thin Node.js wrapper around the Gemini API. Single-purpose: call the API, save the image. All evaluation intelligence stays with Claude.

**Arguments:**
- `--prompt "text"` -- The generation prompt
- `--output path` -- Where to save the resulting PNG
- `--reference path` -- (Optional) A previous image to send as visual context for iteration
- `--feedback "text"` -- (Optional) Critique to pair with the reference image

**API details:**
- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent`
- Auth: `x-goog-api-key` header from `GOOGLE_API_KEY` env var
- Config: `responseModalities: ["TEXT", "IMAGE"]`
- Response: Extract `candidates[0].content.parts[].inline_data.data` (base64 PNG)

**Multimodal request format (for iteration):**
When both `--reference` and `--feedback` are provided, the script sends both the image and text in the same request, allowing the model to see what it made and understand what to fix.

## Evaluation Criteria

After each generation, Claude inspects the image and checks:

1. **Flat side view** -- No perspective, no 3/4 angle
2. **Fills the frame** -- Car spans canvas width, no large empty margins
3. **Correct color** -- Body is clearly the designated color
4. **Color contrast** -- Wheels/undercarriage are dark iron, not body color
5. **Clean transparency** -- No haze, fog, shadows, or artifacts
6. **Style match** -- Vintage poster, not cartoon/clipart/photorealistic
7. **Facing right** -- Left-to-right orientation
8. **No text/borders/smoke** -- Clean illustration only

If any check fails, Claude sends the image back with specific feedback targeting only the failed criteria.

## Generation Order

1. **Red boxcar first** -- This is the template setter. Iterate until the style, proportions, wheel design, and framing are locked in. May use more of the 10-attempt budget.

2. **Remaining 7 color cards** -- For each, include the accepted red boxcar as a visual reference with the prompt: "Generate a [color] [car type] in exactly this same style." This should reduce iteration.

3. **Locomotive last** -- Intentionally different (rainbow/multicolor), but still references the color cards for wheel style and baseline consistency.

## File Destinations

Generated images save to `app/assets/cards/[color].png`, directly replacing the current clipart assets. The intermediate attempts save to `scripts/attempts/` for reference.

## Cost Estimate

- ~$0.04 per image at Gemini 2.5 Flash Image pricing
- ~5 attempts average per card = ~$1.80 total
- Worst case (90 attempts) = ~$3.60
- Free tier allows 1,500 requests/day (more than sufficient)

## Dependencies

- Node.js (already installed)
- `GOOGLE_API_KEY` environment variable
- No new npm packages (uses native `fetch` and `fs`)
