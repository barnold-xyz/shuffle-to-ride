# Railroad Heritage Design System

**Date:** 2026-01-25
**Status:** Implemented
**App:** Shuffle to Ride - Ticket to Ride Companion

---

## Design Philosophy

The "Railroad Heritage" aesthetic draws from the **golden age of rail travel (1920s-1930s)**—an era of elegance, adventure, and craftsmanship. This design evokes:

- **Luxury travel posters** with bold typography and rich colors
- **Art deco geometry** with clean lines and diamond motifs
- **Tactile materials** like polished brass, aged leather, and warm wood
- **Railroad ephemera** like tickets, manifests, and timetables

The goal is to make players feel like they're participating in something elegant and timeless, not just playing a digital card game.

---

## Color System

### Primary Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Burgundy | `#6B1C23` | 107, 28, 35 | Primary brand color, key actions |
| Burgundy Dark | `#4A1219` | 74, 18, 25 | Pressed states, shadows |
| Burgundy Light | `#8B2C35` | 139, 44, 53 | Hover states, highlights |

### Accent Palette (Brass/Gold)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Brass | `#C9A227` | 201, 162, 39 | Accents, borders, decorations |
| Brass Light | `#E8C547` | 232, 197, 71 | Highlights, active states |
| Brass Dark | `#A68B1F` | 166, 139, 31 | Shadows, depth |

### Background Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| BG Dark | `#1A1512` | 26, 21, 18 | Main background |
| BG Mid | `#2A2320` | 42, 35, 32 | Elevated surfaces |
| BG Card | `#352E28` | 53, 46, 40 | Cards, containers |
| BG Elevated | `#3F3731` | 63, 55, 49 | Modals, overlays |

### Text Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Text Primary | `#F5EDE0` | 245, 237, 224 | Headlines, important text |
| Text Secondary | `#B8A99A` | 184, 169, 154 | Body text, descriptions |
| Text Muted | `#7A6E62` | 122, 110, 98 | Hints, disabled text |
| Text Inverse | `#1A1512` | 26, 21, 18 | Text on light backgrounds |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success | `#4A7C4E` | Confirmations, your turn indicator |
| Warning | `#C47F17` | End turn, attention needed |
| Danger | `#9B3B3B` | Leave, discard, destructive actions |
| Info | `#4A6B8B` | Neutral information, other players |

### Decorative Colors

| Name | Hex | Usage |
|------|-----|-------|
| Border | `#5A4F45` | Standard borders |
| Border Light | `#6A5F55` | Subtle separators |
| Shadow | `#0D0B09` | Drop shadows (with opacity) |

---

## Typography

### Font Stack

**Display Font (Headers, Titles):**
```
fontFamily: 'Playfair Display' or system serif fallback
```
- Used for: App title, screen headers, room codes
- Weight: Bold (700) for titles, SemiBold (600) for section headers
- Character: Elegant, authoritative, classic

**Body Font (UI Text):**
```
fontFamily: System default (San Francisco on iOS, Roboto on Android)
```
- Used for: Buttons, labels, body text, player names
- Weight: Regular (400), Medium (500), SemiBold (600)
- Character: Clean, readable, modern

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Display XL | 48px | Bold | 1.1 | App title on home |
| Display L | 36px | Bold | 1.2 | Room code |
| Display M | 28px | SemiBold | 1.2 | Screen titles |
| Heading | 20px | SemiBold | 1.3 | Section headers |
| Body L | 18px | Medium | 1.4 | Turn indicator, important info |
| Body | 16px | Regular | 1.5 | Standard text, buttons |
| Body S | 14px | Regular | 1.5 | Secondary info, labels |
| Caption | 12px | Regular | 1.4 | Hints, counts, timestamps |
| Micro | 10px | Medium | 1.3 | Badges, tiny labels |

### Text Styling

**Letter Spacing:**
- Display fonts: +2% to +4% for elegance
- Room codes: +8% (wide tracking for readability)
- Body text: 0% (default)
- All caps labels: +4%

**Text Transform:**
- Room codes: UPPERCASE
- Button labels: Title Case
- Section headers: Title Case
- Hints/captions: Sentence case

---

## Decorative Elements

### Art Deco Corner Ornament

Used on important containers (room code box, ornate cards).

```
Structure:
┌──────
│ •
│

- Horizontal line: 16px wide, 2px tall
- Vertical line: 16px tall, 2px wide
- Corner dot: 4px diameter, positioned 4px from corner
- Color: Brass (#C9A227)
```

Position all four corners with appropriate rotation.

### Diamond Divider

Horizontal rule with centered diamond shape.

```
────────── ◇ ──────────

- Lines: 1px tall, flex width
- Diamond: 8x8px, rotated 45°, 1px border
- Spacing: 12px between diamond and lines
- Color: Brass (#C9A227) or muted (#5A4F45)
```

### Ornate Border

For premium containers:

```css
borderWidth: 1px
borderColor: THEME.border (#5A4F45)
borderRadius: 4px
/* Inner glow effect via shadow */
shadowColor: THEME.brass
shadowOpacity: 0.1
shadowRadius: 8
shadowOffset: { width: 0, height: 0 }
```

### Ticket Stub Style

For buttons and interactive elements:

```
┌─────────────────────────┐
│  ┊                  ┊   │
│  ┊   BUTTON TEXT    ┊   │
│  ┊                  ┊   │
└─────────────────────────┘

- Dashed vertical lines at 8px and (width - 8px)
- Suggests perforated ticket edge
- Optional: subtle notch at edges
```

---

## Component Specifications

### Buttons

#### Primary Button (Brass Accent)

```
Background: Linear gradient
  - Start: #6B1C23 (burgundy)
  - End: #4A1219 (burgundy dark)
Border: 1px solid #C9A227 (brass)
Border Radius: 6px
Padding: 16px vertical, 24px horizontal
Shadow: 0 4px 12px rgba(13, 11, 9, 0.5)

Text:
  - Color: #F5EDE0 (cream)
  - Size: 16px
  - Weight: SemiBold (600)
  - Letter Spacing: +1%

Pressed State:
  - Background darkens 10%
  - Shadow reduces to 0 2px 6px
  - Transform: translateY(2px)
```

#### Secondary Button

```
Background: Transparent
Border: 1px solid #5A4F45 (border)
Border Radius: 6px
Padding: 14px vertical, 20px horizontal

Text:
  - Color: #B8A99A (secondary)
  - Size: 16px
  - Weight: Medium (500)

Hover/Focus:
  - Border color: #C9A227 (brass)
  - Text color: #F5EDE0 (primary)
```

#### Danger Button

```
Background: Linear gradient
  - Start: #9B3B3B
  - End: #7A2E2E
Border: 1px solid #B84A4A
Border Radius: 6px

Text:
  - Color: #F5EDE0
  - Size: 14px
  - Weight: Medium
```

#### Text Button (Tertiary)

```
Background: Transparent
Border: None
Padding: 12px

Text:
  - Color: #7A6E62 (muted)
  - Size: 14px
  - Weight: Regular

Active:
  - Color: #B8A99A (secondary)
  - Underline
```

### Input Fields

```
Background: #2A2320 (bg mid)
Border: 1px solid #5A4F45 (border)
Border Radius: 6px
Padding: 16px
Height: 52px

Text:
  - Color: #F5EDE0 (primary)
  - Size: 16px
  - Placeholder: #7A6E62 (muted)

Focus State:
  - Border: 1px solid #C9A227 (brass)
  - Shadow: 0 0 0 2px rgba(201, 162, 39, 0.2)
```

### Cards (Train Cards)

```
Container:
  - Width: 100px (normal) / 70px (small)
  - Height: 70px (normal) / 50px (small)
  - Border Radius: 8px
  - Border: 2px solid transparent
  - Shadow: 0 2px 8px rgba(13, 11, 9, 0.4)
  - Overflow: hidden

Selected State:
  - Border: 3px solid #C9A227 (brass)
  - Transform: translateY(-8px) scale(1.02)
  - Shadow: 0 8px 20px rgba(201, 162, 39, 0.3)

Disabled State:
  - Opacity: 0.5
  - Grayscale filter (if supported)
```

### Room Code Display

```
Container (OrnateBox):
  - Background: Linear gradient
    - Start: rgba(107, 28, 35, 0.3)
    - End: rgba(74, 18, 25, 0.2)
  - Border: 2px solid #C9A227 (brass)
  - Border Radius: 8px
  - Padding: 24px 32px
  - Art Deco corners at all four positions

Label:
  - Text: "ROOM CODE"
  - Color: #B8A99A
  - Size: 12px
  - Weight: SemiBold
  - Letter Spacing: +4%
  - Text Transform: uppercase

Code:
  - Color: #C9A227 (brass)
  - Size: 48px
  - Weight: Bold
  - Letter Spacing: +12px
  - Font: Display (serif)

Hint:
  - Text: "Share this code with other players"
  - Color: #7A6E62
  - Size: 12px
  - Margin Top: 8px
```

### Player List Item

```
Container:
  - Background: rgba(42, 35, 32, 0.8)
  - Border: 1px solid #5A4F45
  - Border Radius: 6px
  - Padding: 14px 16px
  - Margin Bottom: 8px
  - Flex Direction: row
  - Justify: space-between
  - Align: center

Player Name:
  - Color: #F5EDE0
  - Size: 16px
  - Weight: Medium

Host Badge:
  - Background: #C9A227
  - Color: #1A1512
  - Size: 10px
  - Weight: Bold
  - Padding: 2px 6px
  - Border Radius: 4px
  - Text: "HOST"
  - Margin Left: 8px

"You" Label:
  - Color: #7A6E62
  - Size: 14px
  - Font Style: italic
```

### Turn Indicator Bar

```
Container:
  - Height: 56px
  - Padding: 12px 16px
  - Flex Direction: row
  - Justify: space-between
  - Align: center

Not Your Turn:
  - Background: Linear gradient
    - Start: #2A2320
    - End: #1A1512
  - Border Bottom: 1px solid #5A4F45

Your Turn:
  - Background: Linear gradient
    - Start: rgba(74, 124, 78, 0.4)
    - End: rgba(74, 124, 78, 0.2)
  - Border Bottom: 2px solid #4A7C4E

Turn Text:
  - Color: #F5EDE0
  - Size: 18px
  - Weight: SemiBold

Draw Count:
  - Color: #B8A99A
  - Size: 12px
  - Margin Top: 2px
```

### Draw Deck

```
Container:
  - Background: #352E28
  - Border: 1px solid #5A4F45
  - Border Radius: 12px
  - Padding: 16px
  - Align Items: center
  - Min Width: 100px

Stack (3 cards offset):
  - Card 3: top: 0, left: 0
  - Card 2: top: 3px, left: 4px
  - Card 1: top: 6px, left: 8px (frontmost)

Individual Card:
  - Width: 50px
  - Height: 70px
  - Background: Linear gradient
    - Start: #4A3F38
    - End: #352E28
  - Border: 2px solid #5A4F45
  - Border Radius: 6px

Front Card Center:
  - "?" character
  - Color: #C9A227
  - Size: 24px
  - Weight: Bold
  - OR: Small train icon

Deck Count:
  - Color: #F5EDE0
  - Size: 14px
  - Weight: Bold
  - Margin Top: 8px

Tap Hint (when enabled):
  - Color: #C9A227
  - Size: 10px
  - Text: "TAP TO DRAW"
  - Letter Spacing: +2%
  - Text Transform: uppercase
```

### Toast Notification

```
Container:
  - Position: absolute
  - Bottom: 200px (above hand area)
  - Left/Right: 16px
  - Background: rgba(26, 21, 18, 0.95)
  - Border: 1px solid #5A4F45
  - Border Left: 3px solid #C9A227
  - Border Radius: 6px
  - Padding: 14px 16px
  - Shadow: 0 8px 24px rgba(13, 11, 9, 0.6)

Text:
  - Color: #F5EDE0
  - Size: 14px
  - Text Align: left

Animation:
  - Slide up from bottom: translateY(20px) -> translateY(0)
  - Fade in: opacity 0 -> 1
  - Duration: 200ms ease-out
  - Hold: 2500ms
  - Fade out: 300ms
```

### Hand Section

```
Container:
  - Background: Linear gradient
    - Start: #352E28
    - End: #2A2320
  - Border Top: 1px solid #5A4F45
  - Padding: 16px
  - Shadow (inset effect): inner shadow at top

Section Label:
  - Color: #B8A99A
  - Size: 14px
  - Weight: SemiBold
  - Margin Bottom: 12px
  - Format: "YOUR HAND (X cards)"
  - In discard mode: append " - Tap to select"

Grid:
  - Flex Wrap: wrap
  - Gap: 12px
  - Justify: flex-start

Grid Item:
  - Width: ~30% (3 per row)
  - Align Items: center

Card Count Badge:
  - Color: #F5EDE0
  - Size: 16px
  - Weight: Bold
  - Margin Top: 6px
  - In discard mode with selection: "X/Y" format
```

---

## Screen Designs

### Home Screen

**Layout:**
```
┌────────────────────────────┐
│                            │
│                            │
│    ══════════════════      │
│     SHUFFLE TO RIDE        │  <- Display XL, Brass color
│    ══════════════════      │
│                            │
│    Train Card Companion    │  <- Body, Secondary color
│                            │
│    ────────◇────────       │  <- Diamond divider
│                            │
│  ┌────────────────────┐    │
│  │    CREATE ROOM     │    │  <- Primary button
│  └────────────────────┘    │
│                            │
│  ┌────────────────────┐    │
│  │     JOIN ROOM      │    │  <- Secondary button (outlined)
│  └────────────────────┘    │
│                            │
│                            │
└────────────────────────────┘
```

**Background:**
- Radial gradient from center: `#2A2320` -> `#1A1512`
- Optional: Very subtle noise texture overlay at 3% opacity

**Create/Join Subscreen:**
- Same background
- Title updates to "Create Room" or "Join Room"
- Input fields for name (and code)
- Back button as text button below

### Lobby Screen

**Layout:**
```
┌────────────────────────────┐
│                            │
│  ┌──────────────────────┐  │
│  │ •                  • │  │  <- Art deco corners
│  │     ROOM CODE        │  │
│  │       A7K2           │  │  <- Large brass text
│  │  Share with players  │  │
│  │ •                  • │  │
│  └──────────────────────┘  │
│                            │
│    ────────◇────────       │
│                            │
│  PASSENGERS (3/5)          │  <- Section header
│                            │
│  ┌────────────────────┐    │
│  │ Alice        HOST  │    │
│  └────────────────────┘    │
│  ┌────────────────────┐    │
│  │ Bob            You │    │
│  └────────────────────┘    │
│  ┌────────────────────┐    │
│  │ Charlie            │    │
│  └────────────────────┘    │
│                            │
│  ┌────────────────────┐    │
│  │    START GAME      │    │  <- Primary button (host only)
│  └────────────────────┘    │
│                            │
│       Leave Room           │  <- Text button, danger color
│                            │
└────────────────────────────┘
```

**Non-host view:** Replace "Start Game" button with elegant waiting text:
```
"Awaiting departure..."
```
With a subtle pulsing brass dot animation.

### Game Screen

**Layout:**
```
┌────────────────────────────┐
│  YOUR TURN         1/2 ▶  │  <- Turn bar (green tint when your turn)
├────────────────────────────┤
│                            │
│  DRAW CARDS                │
│  ┌──────┐ ┌──────┐         │
│  │ RED  │ │      │         │
│  └──────┘ │  ?   │         │
│  ┌──────┐ │ DECK │         │
│  │ BLUE │ │      │         │
│  └──────┘ │ 87   │         │
│  ┌──────┐ │cards │         │
│  │GREEN │ └──────┘         │
│  └──────┘                  │
│  ┌──────┐                  │
│  │LOCO  │                  │
│  └──────┘                  │
│  ┌──────┐                  │
│  │WHITE │                  │
│  └──────┘                  │
│                            │
│  PASSENGERS                │
│  ┌────────────────────┐    │
│  │ ● Alice      12    │    │  <- Active player highlighted
│  │   Bob         8    │    │
│  │   Charlie    10    │    │
│  └────────────────────┘    │
│                            │
├────────────────────────────┤  <- Hand section (fixed bottom)
│  YOUR HAND (8 cards)       │
│  ┌────┐ ┌────┐ ┌────┐      │
│  │RED │ │BLUE│ │GRN │      │
│  │ 3  │ │ 2  │ │ 1  │      │
│  └────┘ └────┘ └────┘      │
│  ┌────┐ ┌────┐             │
│  │LOCO│ │WHT │             │
│  │ 1  │ │ 1  │             │
│  └────┘ └────┘             │
│                            │
│  [Claim Route]  [End Turn] │  <- Action buttons
└────────────────────────────┘
```

**Discard Mode Overlay:**
When "Claim Route" is tapped, the hand section transforms:
- Section label updates: "YOUR HAND - Tap to select"
- Cards show selection count overlay when tapped
- Action row changes to: `[Discard (3)] [Cancel]`

---

## Animations

### Page Transitions

**Home -> Lobby/Game:**
```
- Current screen: Fade out (200ms)
- New screen: Fade in + slide up 20px (300ms ease-out)
```

### Card Animations

**Card Draw (new card appears in hand):**
```
- Initial: scale(0.8), opacity(0), translateY(-20px)
- Final: scale(1), opacity(1), translateY(0)
- Duration: 250ms
- Easing: ease-out
- Stagger: 50ms between multiple cards
```

**Card Selection:**
```
- Transform: translateY(-8px), scale(1.02)
- Border: animate color to brass
- Shadow: expand and add brass tint
- Duration: 150ms
- Easing: ease-out
```

### Turn Change

**Your Turn Starts:**
```
- Turn bar: Flash brass border (pulse 2x)
- Background: Fade to success tint (300ms)
- Optional: Subtle screen shake (2px, 100ms)
```

### Toast

```
Entry:
  - translateY(20px) -> translateY(0)
  - opacity(0) -> opacity(1)
  - Duration: 200ms ease-out

Exit:
  - opacity(1) -> opacity(0)
  - Duration: 300ms ease-in
```

### Button Press

```
- translateY(0) -> translateY(2px)
- Shadow depth reduces
- Duration: 100ms
- Easing: ease-in
```

### Loading States

**Connecting Spinner:**
- Three brass dots pulsing in sequence
- Or: Classic train wheel rotation

**Waiting for Host:**
- Single brass dot with slow pulse (opacity 0.5 -> 1 -> 0.5)
- Period: 2s

---

## Implementation Notes

### Dependencies to Add

```json
{
  "expo-linear-gradient": "^13.0.0",
  "expo-font": "^12.0.0"
}
```

### Font Loading (Optional Enhancement)

If using custom fonts:
```javascript
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
```

For MVP, system fonts work fine with the serif/sans distinction.

### Gradient Backgrounds

Use `expo-linear-gradient` for:
- Button backgrounds
- Turn bar states
- Background ambiance
- Card overlays

### Performance Considerations

1. **Minimize gradient layers** - Use solid colors where gradients aren't essential
2. **Optimize shadows** - Shadows are expensive on Android; use sparingly
3. **Image caching** - Card images should be cached after first load
4. **Animation driver** - Use `useNativeDriver: true` for all Animated values

### Accessibility

1. **Contrast ratios:**
   - Primary text on dark bg: 12.5:1 (exceeds AAA)
   - Secondary text on dark bg: 7.2:1 (exceeds AA)
   - Brass on dark bg: 6.8:1 (exceeds AA)

2. **Touch targets:** All interactive elements minimum 44x44px

3. **Color independence:** Never rely solely on color for information (use icons, text, position)

---

## File Changes Required

| File | Changes |
|------|---------|
| `app/App.tsx` | Complete style overhaul, add theme constants, decorative components |
| `app/package.json` | Add `expo-linear-gradient` dependency |
| `app/src/theme.ts` | (New) Extract theme constants for reuse |

---

## Next Steps

1. **Review and approve** this design document
2. **Install dependencies** (`expo-linear-gradient`)
3. **Implement theme constants** and decorative components
4. **Restyle screens** in order: Home -> Lobby -> Game
5. **Add animations** after base styling is complete
6. **Test on device** for performance and visual quality
