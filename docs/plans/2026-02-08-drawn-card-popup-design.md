# Drawn Card Popup Design

**Date:** 2026-02-08

## Overview

When a player draws from the deck, show a popup displaying the card they drew before it joins their hand.

## Behavior

1. Player taps "Draw from Deck"
2. Server draws card and sends updated hand with `drawnCard` field
3. Popup appears center screen showing the drawn card
4. Auto-dismisses after 2 seconds, or tap anywhere to dismiss early
5. Card is now visible in the player's hand

## Visual Design

- **Backdrop:** Semi-transparent dark overlay (consistent with existing toast style)
- **Card:** Displayed at ~2x normal size (200x140px) centered on screen
- **Label:** "You drew" text above the card in brass color (`THEME.brass`)
- **Animation:** Subtle fade-in on appear, fade-out on dismiss

## Server Changes

### `server/src/server.ts`

Modify the `your-hand` message to include an optional `drawnCard` field when the hand update is triggered by a deck draw:

```typescript
type YourHandPayload = {
  hand: Card[];
  drawnCard?: CardColor;  // Only present when drawing from deck
};
```

Send `drawnCard` only in the `draw-from-deck` handler, not for other hand updates (game start, face-up draws, etc.).

## Client Changes

### `app/App.tsx`

**New state:**
```typescript
drawnCardPopup: CardColor | null;
```

**Message handler:**
When receiving `your-hand` with `drawnCard`, set `drawnCardPopup` to show the popup.

**Popup component:**
- Modal overlay with `TouchableWithoutFeedback` to dismiss on tap
- Card image from `CARD_IMAGES[drawnCard]`
- `useEffect` with 2-second timeout to auto-dismiss
- Fade animation using `Animated.timing`

**Cleanup:**
Clear `drawnCardPopup` state when dismissed (tap or timeout).

## Edge Cases

- **Multiple rapid draws:** Each new draw replaces the previous popup (reset the 2s timer)
- **Turn ends while popup showing:** Popup still dismisses normally
- **Face-up draws:** No popup (player already sees what they're picking)
