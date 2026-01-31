# Turn Order Selection Design

## Overview

Allow the host to set the turn order by dragging players in the lobby. The order can be changed anytime before the game starts, then locks once gameplay begins.

## Design Decisions

- **Draggable list** using `react-native-draggable-flatlist`
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

### Dependencies

```bash
npx expo install react-native-draggable-flatlist react-native-reanimated react-native-gesture-handler
```

Requires full rebuild (native modules).

### App.tsx

**Root wrapper:**

Wrap the app content in `GestureHandlerRootView`:

```typescript
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// In render:
<GestureHandlerRootView style={{ flex: 1 }}>
  {/* existing app content */}
</GestureHandlerRootView>
```

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

Add `onSetTurnOrder` and `isHost` props.

### LobbyScreen Component

**Host view - Draggable list:**

```typescript
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';

// For host:
<DraggableFlatList
  data={players}
  keyExtractor={(item) => item.id}
  onDragEnd={({ data }) => {
    onSetTurnOrder(data.map((p) => p.id));
  }}
  renderItem={({ item, drag, isActive, getIndex }) => (
    <PlayerRow
      player={item}
      position={(getIndex() ?? 0) + 1}
      isActive={isActive}
      onDrag={drag}
      showDragHandle={true}
    />
  )}
/>
```

**Non-host view:**

Regular FlatList with position numbers, no drag handles.

## Styling (Railroad Heritage)

Following project design principles:

| Element | Style |
|---------|-------|
| Drag handle icon (≡) | `color: THEME.brass` |
| Position number circle | `backgroundColor: THEME.brass`, `color: THEME.cream` |
| Section label | `color: THEME.brass`, `...TYPE.label` |
| Active drag row | `borderColor: 'rgba(201, 162, 39, 0.4)'`, subtle elevation |
| Player rows | Existing burgundy tint container style |

**Labels:**
- Host sees: "Drag to set turn order"
- Non-host sees: "Turn order"

## Files to Modify

1. `server/src/types.ts` - Add `SetTurnOrderPayload`
2. `server/src/server.ts` - Add `handleSetTurnOrder`
3. `app/package.json` - Add draggable-flatlist dependencies
4. `app/App.tsx` - GestureHandlerRootView wrapper, handler, LobbyScreen updates

## Testing

1. Create room with 3+ players
2. Verify host sees drag handles, others don't
3. Drag to reorder - verify all clients see updated order
4. Start game - verify turn order matches the set order
5. Verify non-host cannot trigger reorder (server rejects)
6. Verify reorder rejected after game starts
