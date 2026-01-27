# Route Claim Notifications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance route claim notifications to show card color breakdown, use tiered toast durations, and validate that discarded cards are the same color (locomotives are wild).

**Architecture:** Server validates discard requests and includes color breakdown in broadcast. Client formats messages with color details and uses action-specific toast durations.

**Tech Stack:** TypeScript, PartyKit (server), React Native/Expo (client)

---

### Task 1: Add discard validation to gameLogic.ts

**Files:**
- Modify: `server/src/gameLogic.ts:179-209` (discardCards function)

**Step 1: Update discardCards to validate same-color rule**

The function currently just checks cards exist. Add validation that all non-locomotive cards are the same color.

Replace the `discardCards` function with:

```typescript
export function discardCards(
  state: GameState,
  playerId: string,
  cardIds: string[]
): { success: true; cards: Card[] } | { success: false; error: string } {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  const cardsToDiscard: Card[] = [];

  for (const cardId of cardIds) {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, error: 'Card not found in hand' };
    }
    cardsToDiscard.push(player.hand[cardIndex]);
  }

  // Validate: all non-locomotive cards must be the same color
  const nonLocomotiveColors = cardsToDiscard
    .filter((c) => c.color !== 'locomotive')
    .map((c) => c.color);
  const uniqueColors = new Set(nonLocomotiveColors);

  if (uniqueColors.size > 1) {
    return { success: false, error: 'Route cards must be the same color (locomotives are wild)' };
  }

  // Remove cards from hand and add to discard pile
  for (const card of cardsToDiscard) {
    const index = player.hand.findIndex((c) => c.id === card.id);
    if (index !== -1) {
      player.hand.splice(index, 1);
      state.discardPile.push(card);
    }
  }

  return { success: true, cards: cardsToDiscard };
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: Compilation error because server.ts still expects boolean return

---

### Task 2: Update server.ts to use new discardCards return type

**Files:**
- Modify: `server/src/server.ts:313-335` (handleDiscardCards method)
- Modify: `server/src/server.ts:405-420` (broadcastPlayerAction method)

**Step 1: Update broadcastPlayerAction type to include colorBreakdown**

Find the `broadcastPlayerAction` method and update the action type:

```typescript
private broadcastPlayerAction(
  excludeConnectionId: string,
  action: {
    type: 'drew-from-deck' | 'drew-face-up' | 'discarded' | 'turn-started';
    playerName: string;
    cardColor?: string;
    count?: number;
    colorBreakdown?: Record<string, number>;
  }
) {
  const message = JSON.stringify({ type: 'player-action', payload: action });
  for (const conn of this.room.getConnections()) {
    if (conn.id !== excludeConnectionId) {
      conn.send(message);
    }
  }
}
```

**Step 2: Update handleDiscardCards to use new return type and include color breakdown**

Replace the `handleDiscardCards` method:

```typescript
private handleDiscardCards(conn: Connection, payload: DiscardCardsPayload) {
  const { cardIds } = payload;

  if (this.state.phase !== 'playing') return;

  const player = this.state.players.find((p) => p.id === conn.id);
  if (!player) {
    this.sendError(conn, 'Player not found');
    return;
  }

  const result = discardCards(this.state, conn.id, cardIds);

  if (!result.success) {
    this.sendError(conn, result.error);
    return;
  }

  console.log(`${conn.id} discarded ${cardIds.length} cards`);

  // Build color breakdown
  const colorBreakdown: Record<string, number> = {};
  for (const card of result.cards) {
    colorBreakdown[card.color] = (colorBreakdown[card.color] || 0) + 1;
  }

  // Notify other players
  this.broadcastPlayerAction(conn.id, {
    type: 'discarded',
    playerName: player.name,
    count: cardIds.length,
    colorBreakdown,
  });

  this.broadcastGameState();
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd server && npx tsc --noEmit`
Expected: PASS (no errors)

**Step 4: Commit server changes**

```bash
git add server/src/gameLogic.ts server/src/server.ts
git commit -m "feat(server): validate same-color discard, include color breakdown in broadcast"
```

---

### Task 3: Update Toast component to accept duration prop

**Files:**
- Modify: `app/App.tsx:374-437` (Toast component)

**Step 1: Update Toast to accept duration prop**

Update the Toast component signature and use the duration:

```typescript
function Toast({ message, duration = 2500 }: { message: string | null; duration?: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [message, duration, opacity, translateY]);

  if (!visible || !message) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastHeader}>
        <View style={styles.toastHeaderLine} />
        <Text style={styles.toastHeaderText}>DISPATCH</Text>
        <View style={styles.toastHeaderLine} />
      </View>
      <Text style={styles.toastText}>{message}</Text>
      <View style={styles.toastFooter}>
        <Text style={styles.toastFooterText}>═══ END ═══</Text>
      </View>
    </Animated.View>
  );
}
```

**Step 2: Verify no TypeScript errors**

Run: `cd app && npx tsc --noEmit`
Expected: PASS (Toast still works with optional duration)

---

### Task 4: Update toast state and formatActionMessage

**Files:**
- Modify: `app/App.tsx:880-901` (state and formatActionMessage)

**Step 1: Change toast state to include duration**

Find the state declarations around line 880 and update:

```typescript
const [toast, setToast] = useState<{ message: string; duration: number } | null>(null);
const toastKeyRef = useRef(0);
```

**Step 2: Update formatActionMessage to return message and duration, and format color breakdown**

Replace the formatActionMessage function:

```typescript
const formatActionMessage = useCallback((action: {
  type: string;
  playerName: string;
  cardColor?: string;
  count?: number;
  colorBreakdown?: Record<string, number>;
}): { message: string; duration: number } | null => {
  const COLOR_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'locomotive'];

  switch (action.type) {
    case 'drew-from-deck':
      return { message: `${action.playerName} drew a card`, duration: 3000 };
    case 'drew-face-up':
      return { message: `${action.playerName} drew a ${action.cardColor} card`, duration: 3000 };
    case 'discarded': {
      let breakdown = '';
      if (action.colorBreakdown) {
        const parts: string[] = [];
        for (const color of COLOR_ORDER) {
          const count = action.colorBreakdown[color];
          if (count) {
            parts.push(`${count} ${color}`);
          }
        }
        breakdown = parts.join(', ');
      }
      const message = breakdown
        ? `${action.playerName} claimed a route with ${action.count} cards (${breakdown})`
        : `${action.playerName} claimed a route with ${action.count} card${action.count !== 1 ? 's' : ''}`;
      return { message, duration: 8000 };
    }
    case 'turn-started':
      return { message: `${action.playerName}'s turn`, duration: 5000 };
    default:
      return null;
  }
}, []);
```

---

### Task 5: Update player-action handler and Toast usage

**Files:**
- Modify: `app/App.tsx` (player-action case in onmessage handler, around line 968)
- Modify: `app/App.tsx` (Toast component usage, around line 1097)

**Step 1: Update player-action handler**

Find the `case 'player-action':` block and update:

```typescript
case 'player-action':
  const result = formatActionMessage(payload);
  if (result) {
    toastKeyRef.current += 1;
    setToast(result);
  }
  break;
```

**Step 2: Update Toast component usage**

Find where `<Toast>` is rendered (around line 1097) and update:

```typescript
{state.screen === 'game' && toast && (
  <Toast key={toastKeyRef.current} message={toast.message} duration={toast.duration} />
)}
```

**Step 3: Verify TypeScript compiles**

Run: `cd app && npx tsc --noEmit`
Expected: PASS

**Step 4: Commit client changes**

```bash
git add app/App.tsx
git commit -m "feat(app): tiered toast durations, color breakdown in route claim messages"
```

---

### Task 6: Manual testing

**Step 1: Start the server locally**

In WSL (required for PartyKit on Windows):
```bash
cd server && npm run dev
```

**Step 2: Configure client for local server**

Edit `app/src/config.ts` and set `USE_LOCAL_SERVER = true`

**Step 3: Start the client**

```bash
cd app && npx expo start
```

**Step 4: Test scenarios**

1. Create a room, start game, select cards of different colors, tap "Claim Route"
   - Expected: Error message "Route cards must be the same color (locomotives are wild)"

2. Select cards of same color (with or without locomotives), tap "Claim Route"
   - Expected: Toast shows "Alice claimed a route with 4 cards (3 red, 1 locomotive)" for 8 seconds

3. Draw from deck
   - Expected: Toast shows "Alice drew a card" for 3 seconds

4. Draw face-up card
   - Expected: Toast shows "Alice drew a blue card" for 3 seconds

5. Turn changes
   - Expected: Toast shows "Bob's turn" for 5 seconds

**Step 5: Reset config and commit**

Reset `USE_LOCAL_SERVER = false` in `app/src/config.ts`

---

### Task 7: Final commit

```bash
git add -A
git status  # Verify only expected files
git commit -m "chore: reset local server config after testing"
```

If no changes to commit (config already reset), skip this task.
