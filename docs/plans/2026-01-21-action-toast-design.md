# Action Toast Notifications Design

## Overview

Add toast notifications so players can see what action the current player just took. Toasts appear briefly and fade away, similar to what you'd observe at a physical game table.

## Privacy Rule

- **Face-up draws**: Show card color (everyone could see it)
- **Deck draws**: Don't reveal color (private information)
- **Discards**: Show count only (for claiming routes)

## Server Changes

### New Socket Event: `player-action`

Emit to all players in the room *except* the acting player.

```typescript
interface PlayerActionPayload {
  type: 'drew-from-deck' | 'drew-face-up' | 'discarded' | 'turn-started';
  playerName: string;
  cardColor?: CardColor;  // only for drew-face-up
  count?: number;         // only for discarded
}
```

### Where to Emit

Add `io.to(roomCode).except(socket.id).emit('player-action', payload)` in:

1. `draw-from-deck` handler - after successful draw
2. `draw-face-up` handler - after successful draw (include card color)
3. `discard-cards` handler - after successful discard (include count)
4. Turn change logic - when turn passes to next player

## Client Changes

### Toast Component

Location: Appears below the turn indicator bar on game screen.

Styling:
- Semi-transparent dark background (`rgba(0,0,0,0.8)`)
- White text, centered
- Rounded corners
- Full width with horizontal padding

Animation:
- Fade in: 200ms
- Hold: 2500ms
- Fade out: 300ms
- Total: ~3 seconds

Behavior:
- New action replaces current toast immediately
- Only visible on game screen

### Message Formats

| Action | Message |
|--------|---------|
| `drew-from-deck` | "{playerName} drew a card" |
| `drew-face-up` | "{playerName} drew a {color} card" |
| `discarded` | "{playerName} discarded {count} cards to claim a route" |
| `turn-started` | "{playerName}'s turn" |

### Socket Listener

Add listener for `player-action` event in the socket setup. Store latest action in state and trigger toast animation.

## Files to Modify

### Server
- `server/src/index.ts` - Add player-action emissions

### Client
- `working-app/App.tsx` - Add Toast component and socket listener

## Testing

1. Open game on two devices
2. Player 1 draws from deck → Player 2 sees "Player1 drew a card"
3. Player 1 draws face-up red → Player 2 sees "Player1 drew a red card"
4. Player 1 discards 4 cards → Player 2 sees "Player1 discarded 4 cards to claim a route"
5. Turn changes → Player 2 sees "Player2's turn"
