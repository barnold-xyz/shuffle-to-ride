# Turn Action Exclusivity Design

## Overview

Enforce the Ticket to Ride rule that a player's turn consists of ONE action type:
- Draw train cards, OR
- Claim a route (discard cards)

Players cannot do both on the same turn.

## Current Behavior

- Players can draw cards and discard cards in any order during their turn
- Turn ends after drawing 2 cards (or 1 face-up locomotive)
- No restriction on mixing draw and discard actions

## New Behavior

### Turn Actions (Mutually Exclusive)

A player's turn consists of ONE of:
- **Draw cards** - Up to 2 cards (or 1 face-up locomotive), then turn auto-ends
- **Claim a route** - Discard cards for exactly 1 route, then turn auto-ends immediately

### Rules

1. If a player has drawn any cards, they cannot claim a route
2. Claiming a route immediately ends the turn (passes to next player)
3. Only one route can be claimed per turn (enforced by auto-end)

## Technical Design

### Server Changes

**1. Extend `CurrentTurn` interface (`types.ts`):**
```typescript
interface CurrentTurn {
  playerId: string;
  cardsDrawn: number;
  drewLocomotive: boolean;
  routesClaimed: number;  // NEW: 0 or 1
}
```

**2. Update `startTurn` (`gameLogic.ts`):**
Initialize `routesClaimed: 0` when starting a turn.

**3. Validation in `handleDiscardCards` (`server.ts`):**
Before processing discard:
- If `currentTurn.cardsDrawn > 0` → Error: "You cannot claim a route after drawing cards"

**4. Track route claim (`server.ts`):**
After successful discard:
- Set `currentTurn.routesClaimed = 1`

**5. Auto-end turn after route claim (`server.ts`):**
After successful discard and setting `routesClaimed`:
- Immediately advance to next player (reuse existing turn-end logic)

### Client Changes

None required. Errors display via existing error message mechanism.

### Error Messages

| Scenario | Message |
|----------|---------|
| Discard after drawing | "You cannot claim a route after drawing cards" |

## Test Cases

1. Player draws card, then tries to discard → Error
2. Player discards cards → Turn ends immediately, next player's turn
3. Player draws 2 cards → Turn ends (existing behavior unchanged)
4. Player draws face-up locomotive → Turn ends (existing behavior unchanged)
