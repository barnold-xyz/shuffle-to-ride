# Turn Order Selection Design

## Overview

Allow the host to set the turn order using up/down arrows in the lobby. The order can be changed anytime before the game starts, then locks once gameplay begins.

## Design Decisions

- **Up/down arrows** - Simple approach that works with Expo Go (no native dependencies)
- **Host only** can reorder; non-host players see the order but can't change it
- **Lobby only** - order is locked once game starts
- **Reuses existing data** - `state.players` array order already determines turn order

## Server Changes

### types.ts

Add new payload type:

```typescript
export interface SetTurnOrderPayload {
  playerIds: string[];  // Player IDs in desired order
}
```

Add to `ClientMessage` union:

```typescript
| { type: 'set-turn-order'; payload: SetTurnOrderPayload }
```

### server.ts

Add message handler in `onMessage` switch:

```typescript
case 'set-turn-order':
  this.handleSetTurnOrder(conn, parsed.payload);
  break;
```

Add handler method:

```typescript
private handleSetTurnOrder(conn: Connection, payload: SetTurnOrderPayload) {
  const { playerIds } = payload;

  // Verify sender is host
  const sender = this.state.players.find((p) => p.id === conn.id);
  if (!sender?.isHost) {
    this.sendError(conn, 'Only the host can set turn order');
    return;
  }

  // Verify game is in lobby
  if (this.state.phase !== 'lobby') {
    this.sendError(conn, 'Cannot change turn order after game starts');
    return;
  }

  // Verify all IDs are valid
  if (playerIds.length !== this.state.players.length) {
    this.sendError(conn, 'Invalid player list');
    return;
  }

  const playerMap = new Map(this.state.players.map((p) => [p.id, p]));
  const reordered = playerIds.map((id) => playerMap.get(id)).filter(Boolean);

  if (reordered.length !== this.state.players.length) {
    this.sendError(conn, 'Invalid player IDs');
    return;
  }

  // Reorder players
  this.state.players = reordered as typeof this.state.players;

  console.log(`Turn order updated by host in room ${this.room.id}`);

  // Broadcast updated player list
  this.broadcastPlayerList();
}
```

## Client Changes

### App.tsx

**New handler:**

```typescript
const handleSetTurnOrder = useCallback((playerIds: string[]) => {
  socketRef.current?.send(JSON.stringify({
    type: 'set-turn-order',
    payload: { playerIds }
  }));
}, []);
```

**LobbyScreen props:**

Add `onSetTurnOrder` prop.

### LobbyScreen Component

**Move player function:**

```typescript
const movePlayer = (index: number, direction: 'up' | 'down') => {
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= players.length) return;

  const newOrder = [...players];
  [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
  onSetTurnOrder(newOrder.map((p) => p.id));
};
```

**Player row with arrows (host only):**

Each player row shows:
- Position number in brass circle (1, 2, 3...)
- Player name and badges
- Up/down arrow buttons (host only, when 2+ players)

## Styling (Railroad Heritage)

Following project design principles:

| Element | Style |
|---------|-------|
| Position number circle | `backgroundColor: THEME.brass`, `color: THEME.textInverse` |
| Arrow buttons (▲▼) | `color: THEME.brass` |
| Disabled arrows | `opacity: 0.3`, `color: THEME.textMuted` |
| Section label | `color: THEME.brass`, `...TYPE.label` |
| Player rows | Existing burgundy tint container style |

**Label:**
- Host sees: "Tap arrows to set turn order" (only when 2+ players)

## Files Modified

1. `server/src/types.ts` - Add `SetTurnOrderPayload`
2. `server/src/server.ts` - Add `handleSetTurnOrder`
3. `app/App.tsx` - Handler and LobbyScreen updates with arrow UI

## Testing

1. Create room with 2+ players
2. Verify host sees arrow buttons, others don't
3. Tap arrows to reorder - verify all clients see updated order
4. Verify arrows disabled at list boundaries (can't move first player up)
5. Start game - verify turn order matches the set order
6. Verify non-host cannot trigger reorder (server rejects)
7. Verify reorder rejected after game starts
