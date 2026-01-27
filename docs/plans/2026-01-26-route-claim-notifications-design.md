# Route Claim Notifications Enhancement

## Overview

Improve route claim notifications to show card color breakdown and linger longer. Also enforce the game rule that discarded cards must be the same color (locomotives are wild).

## Changes

### Server: Discard Validation (`server/src/gameLogic.ts`)

Add validation to `discardCards` function:
- Collect all non-locomotive colors from cards to discard
- If more than one distinct non-locomotive color, reject the discard
- Return `false` so server can send error message

Valid combinations:
- All same color (with 0 or more locomotives)
- All locomotives

### Server: Color Breakdown in Broadcast (`server/src/server.ts`)

Modify `handleDiscardCards` to:
1. Before discarding, collect the colors of cards being discarded
2. Build color summary object: `{ red: 3, locomotive: 1 }`
3. Include in `player-action` broadcast:

```typescript
{
  type: 'discarded',
  playerName: 'Alice',
  count: 4,
  colorBreakdown: { red: 3, locomotive: 1 }
}
```

4. Send error message for invalid discards: "Route cards must be the same color (locomotives are wild)"

### Client: Message Formatting (`app/App.tsx`)

Update `formatActionMessage` for `discarded` action type:

Before: `"Alice discarded 4 cards to claim a route"`

After: `"Alice claimed a route with 4 cards (3 red, 1 locomotive)"`

Formatting rules:
- Colors in consistent order: red, orange, yellow, green, blue, purple, black, white, locomotive
- Only include colors that were used
- Locomotives listed last
- Singular form: "1 red" not "1 reds"

### Client: Tiered Toast Durations (`app/App.tsx`)

Change toast state from `toastMessage: string` to `toast: { message: string, duration: number }`.

Durations by action type:
- `drew-from-deck`: 3000ms
- `drew-face-up`: 3000ms
- `turn-started`: 5000ms
- `discarded`: 8000ms

Update `Toast` component to accept `duration` prop and use it for the fade-out timeout.

## Files to Modify

- `server/src/gameLogic.ts` - Add discard validation
- `server/src/server.ts` - Include color breakdown in broadcast, handle validation errors
- `app/App.tsx` - Update message formatting, add tiered toast durations
