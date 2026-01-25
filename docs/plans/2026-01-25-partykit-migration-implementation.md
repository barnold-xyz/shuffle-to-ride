# PartyKit Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate from laptop-hosted Socket.io server to cloud-hosted PartyKit server.

**Architecture:** Each game room becomes a PartyKit "party" instance. The room code is the party ID in the URL. Game logic stays identical; only the networking layer changes.

**Tech Stack:** PartyKit (server), partysocket (client), TypeScript, React Native/Expo

---

## Task 1: Set Up PartyKit Project Structure

**Files:**
- Create: `server/partykit.json`
- Modify: `server/package.json`

**Step 1: Create PartyKit configuration file**

Create `server/partykit.json`:
```json
{
  "name": "shuffle-to-ride",
  "main": "src/server.ts",
  "compatibilityDate": "2024-01-01"
}
```

**Step 2: Update package.json dependencies and scripts**

Replace `server/package.json` with:
```json
{
  "name": "shuffle-to-ride-server",
  "version": "1.0.0",
  "scripts": {
    "dev": "partykit dev",
    "deploy": "partykit deploy",
    "build": "tsc --noEmit"
  },
  "dependencies": {},
  "devDependencies": {
    "partykit": "^0.0.111",
    "typescript": "^5.0.0"
  }
}
```

**Step 3: Install new dependencies**

Run: `cd server && npm install`
Expected: Dependencies install successfully

**Step 4: Commit**

```bash
git add server/partykit.json server/package.json
git commit -m "feat(server): add PartyKit configuration"
```

---

## Task 2: Create PartyKit Server Entry Point

**Files:**
- Create: `server/src/server.ts`

**Step 1: Create the PartyKit party class**

Create `server/src/server.ts`:
```typescript
import type {
  Party,
  PartyKitServer,
  Connection,
  ConnectionContext,
} from 'partykit/server';
import {
  GameState,
  CreateRoomPayload,
  JoinRoomPayload,
  DrawFaceUpPayload,
  DiscardCardsPayload,
} from './types';
import {
  createGameState,
  createPlayer,
  dealInitialHands,
  drawFromDeck,
  drawFaceUpCard,
  discardCards,
  getNextPlayer,
  startTurn,
  canDrawCard,
  canDrawFaceUpLocomotive,
  isTurnComplete,
  getPublicPlayerInfo,
  reshuffleDiscardIntoDeck,
} from './gameLogic';

// Message types from client
type ClientMessage =
  | { type: 'join-room'; payload: JoinRoomPayload }
  | { type: 'start-game' }
  | { type: 'draw-from-deck' }
  | { type: 'draw-face-up'; payload: DrawFaceUpPayload }
  | { type: 'discard-cards'; payload: DiscardCardsPayload }
  | { type: 'end-turn' };

export default class ShuffleToRideServer implements PartyKitServer {
  readonly party: Party;
  state: GameState;

  constructor(party: Party) {
    this.party = party;
    // Room code is the party ID
    this.state = createGameState(party.id);
  }

  onConnect(conn: Connection, ctx: ConnectionContext) {
    console.log(`Player connected: ${conn.id} to room ${this.party.id}`);
    // Send current player list to the new connection
    this.sendToConnection(conn, {
      type: 'player-joined',
      payload: { players: getPublicPlayerInfo(this.state.players) },
    });
  }

  onClose(conn: Connection) {
    console.log(`Player disconnected: ${conn.id}`);

    // Remove player from game
    this.state.players = this.state.players.filter((p) => p.id !== conn.id);

    // If host left, assign new host
    if (this.state.players.length > 0 && !this.state.players.some((p) => p.isHost)) {
      this.state.players[0].isHost = true;
    }

    // If it was this player's turn, move to next
    if (this.state.currentTurn?.playerId === conn.id) {
      const nextPlayerId = getNextPlayer(this.state);
      if (nextPlayerId) {
        startTurn(this.state, nextPlayerId);
      }
    }

    // Broadcast updated state
    if (this.state.players.length > 0) {
      this.broadcastPlayerList();
      if (this.state.phase === 'playing') {
        this.broadcastGameState();
      }
    }
  }

  onMessage(message: string, conn: Connection) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      this.sendError(conn, 'Invalid message format');
      return;
    }

    switch (parsed.type) {
      case 'join-room':
        this.handleJoinRoom(conn, parsed.payload);
        break;
      case 'start-game':
        this.handleStartGame(conn);
        break;
      case 'draw-from-deck':
        this.handleDrawFromDeck(conn);
        break;
      case 'draw-face-up':
        this.handleDrawFaceUp(conn, parsed.payload);
        break;
      case 'discard-cards':
        this.handleDiscardCards(conn, parsed.payload);
        break;
      case 'end-turn':
        this.handleEndTurn(conn);
        break;
      default:
        this.sendError(conn, 'Unknown message type');
    }
  }

  // --- Handlers ---

  private handleJoinRoom(conn: Connection, payload: JoinRoomPayload) {
    const { playerName } = payload;
    const isFirstPlayer = this.state.players.length === 0;

    if (this.state.phase !== 'lobby') {
      this.sendError(conn, 'Game already in progress');
      return;
    }

    if (this.state.players.length >= 5) {
      this.sendError(conn, 'Room is full (max 5 players)');
      return;
    }

    const player = createPlayer(conn.id, playerName, isFirstPlayer);
    this.state.players.push(player);

    console.log(`${playerName} joined room ${this.party.id}`);

    // Send room confirmation to the joining player
    this.sendToConnection(conn, {
      type: 'room-created',
      payload: { roomCode: this.party.id },
    });

    // Broadcast updated player list
    this.broadcastPlayerList();
  }

  private handleStartGame(conn: Connection) {
    const player = this.state.players.find((p) => p.id === conn.id);
    if (!player?.isHost) {
      this.sendError(conn, 'Only the host can start the game');
      return;
    }

    if (this.state.players.length < 1) {
      this.sendError(conn, 'Need at least 1 player to start');
      return;
    }

    // Deal cards
    dealInitialHands(this.state);
    this.state.phase = 'playing';

    // Start first player's turn
    const firstPlayer = getNextPlayer(this.state);
    if (firstPlayer) {
      startTurn(this.state, firstPlayer);
    }

    console.log(`Game started in room ${this.party.id}`);

    // Send initial hands to each player
    for (const p of this.state.players) {
      const playerConn = this.party.getConnection(p.id);
      if (playerConn) {
        this.sendToConnection(playerConn, {
          type: 'game-started',
          payload: {
            yourHand: p.hand,
            faceUpCards: this.state.faceUpCards,
          },
        });
      }
    }

    this.broadcastGameState();
  }

  private handleDrawFromDeck(conn: Connection) {
    if (this.state.phase !== 'playing') return;

    if (!canDrawCard(this.state, conn.id)) {
      this.sendError(conn, 'Cannot draw a card right now');
      return;
    }

    // Check if deck is empty, reshuffle discard if needed
    if (this.state.deck.length === 0) {
      reshuffleDiscardIntoDeck(this.state);
    }

    if (this.state.deck.length === 0) {
      this.sendError(conn, 'No cards left in deck');
      return;
    }

    const card = drawFromDeck(this.state, conn.id);
    const player = this.state.players.find((p) => p.id === conn.id);

    if (card && this.state.currentTurn && player) {
      this.state.currentTurn.cardsDrawn++;

      console.log(`${conn.id} drew from deck: ${card.color}`);

      // Notify other players (don't reveal card color)
      this.broadcastPlayerAction(conn.id, {
        type: 'drew-from-deck',
        playerName: player.name,
      });

      // Check if turn is complete
      if (isTurnComplete(this.state)) {
        const nextPlayerId = getNextPlayer(this.state);
        if (nextPlayerId) {
          const nextPlayer = this.state.players.find((p) => p.id === nextPlayerId);
          startTurn(this.state, nextPlayerId);
          if (nextPlayer) {
            this.broadcastPlayerAction(nextPlayerId, {
              type: 'turn-started',
              playerName: nextPlayer.name,
            });
          }
        }
      }

      this.broadcastGameState();
    }
  }

  private handleDrawFaceUp(conn: Connection, payload: DrawFaceUpPayload) {
    const { index } = payload;

    if (this.state.phase !== 'playing') return;

    // Check if it's a locomotive and if that's allowed
    const targetCard = this.state.faceUpCards[index];
    if (!targetCard) {
      this.sendError(conn, 'Invalid card index');
      return;
    }

    if (targetCard.color === 'locomotive') {
      if (!canDrawFaceUpLocomotive(this.state, conn.id)) {
        this.sendError(conn, 'Can only draw a face-up locomotive as your first draw');
        return;
      }
    } else {
      if (!canDrawCard(this.state, conn.id)) {
        this.sendError(conn, 'Cannot draw a card right now');
        return;
      }
    }

    const result = drawFaceUpCard(this.state, conn.id, index);
    const player = this.state.players.find((p) => p.id === conn.id);

    if (result && this.state.currentTurn && player) {
      this.state.currentTurn.cardsDrawn++;
      if (result.isLocomotive) {
        this.state.currentTurn.drewLocomotive = true;
      }

      console.log(`${conn.id} drew face-up: ${result.card.color}`);

      // Notify other players (reveal card color since it was face-up)
      this.broadcastPlayerAction(conn.id, {
        type: 'drew-face-up',
        playerName: player.name,
        cardColor: result.card.color,
      });

      // Refill deck from discard if needed
      if (this.state.deck.length === 0) {
        reshuffleDiscardIntoDeck(this.state);
      }

      // Check if turn is complete
      if (isTurnComplete(this.state)) {
        const nextPlayerId = getNextPlayer(this.state);
        if (nextPlayerId) {
          const nextPlayer = this.state.players.find((p) => p.id === nextPlayerId);
          startTurn(this.state, nextPlayerId);
          if (nextPlayer) {
            this.broadcastPlayerAction(nextPlayerId, {
              type: 'turn-started',
              playerName: nextPlayer.name,
            });
          }
        }
      }

      this.broadcastGameState();
    }
  }

  private handleDiscardCards(conn: Connection, payload: DiscardCardsPayload) {
    const { cardIds } = payload;

    if (this.state.phase !== 'playing') return;

    const player = this.state.players.find((p) => p.id === conn.id);
    const success = discardCards(this.state, conn.id, cardIds);

    if (success && player) {
      console.log(`${conn.id} discarded ${cardIds.length} cards`);

      // Notify other players
      this.broadcastPlayerAction(conn.id, {
        type: 'discarded',
        playerName: player.name,
        count: cardIds.length,
      });

      this.broadcastGameState();
    } else {
      this.sendError(conn, 'Failed to discard cards');
    }
  }

  private handleEndTurn(conn: Connection) {
    if (this.state.phase !== 'playing') return;

    if (!this.state.currentTurn || this.state.currentTurn.playerId !== conn.id) {
      this.sendError(conn, 'Not your turn');
      return;
    }

    console.log(`${conn.id} ended turn early`);

    const nextPlayerId = getNextPlayer(this.state);
    if (nextPlayerId) {
      const nextPlayer = this.state.players.find((p) => p.id === nextPlayerId);
      startTurn(this.state, nextPlayerId);
      if (nextPlayer) {
        this.broadcastPlayerAction(nextPlayerId, {
          type: 'turn-started',
          playerName: nextPlayer.name,
        });
      }
    }

    this.broadcastGameState();
  }

  // --- Helpers ---

  private sendToConnection(conn: Connection, message: object) {
    conn.send(JSON.stringify(message));
  }

  private sendError(conn: Connection, message: string) {
    this.sendToConnection(conn, { type: 'error', payload: { message } });
  }

  private broadcastPlayerList() {
    const message = JSON.stringify({
      type: 'player-joined',
      payload: { players: getPublicPlayerInfo(this.state.players) },
    });
    this.party.broadcast(message);
  }

  private broadcastGameState() {
    const gameStatePayload = {
      faceUpCards: this.state.faceUpCards,
      deckCount: this.state.deck.length,
      players: getPublicPlayerInfo(this.state.players),
      currentTurn: this.state.currentTurn,
    };

    this.party.broadcast(JSON.stringify({
      type: 'game-state',
      payload: gameStatePayload,
    }));

    // Send individual hands to each player
    for (const player of this.state.players) {
      const playerConn = this.party.getConnection(player.id);
      if (playerConn) {
        this.sendToConnection(playerConn, {
          type: 'your-hand',
          payload: { hand: player.hand },
        });
      }
    }
  }

  private broadcastPlayerAction(
    excludeConnectionId: string,
    action: {
      type: 'drew-from-deck' | 'drew-face-up' | 'discarded' | 'turn-started';
      playerName: string;
      cardColor?: string;
      count?: number;
    }
  ) {
    const message = JSON.stringify({ type: 'player-action', payload: action });
    for (const conn of this.party.getConnections()) {
      if (conn.id !== excludeConnectionId) {
        conn.send(message);
      }
    }
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd server && npm run build`
Expected: No errors

**Step 3: Commit**

```bash
git add server/src/server.ts
git commit -m "feat(server): add PartyKit server implementation"
```

---

## Task 3: Test Server Locally

**Files:**
- None (manual testing)

**Step 1: Start the PartyKit dev server**

Run: `cd server && npm run dev`
Expected: Server starts on localhost:1999

**Step 2: Test with a simple WebSocket connection**

In a browser console or using wscat:
```javascript
const ws = new WebSocket('ws://localhost:1999/party/TEST');
ws.onmessage = (e) => console.log('Received:', e.data);
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'join-room', payload: { playerName: 'Alice' } }));
};
```

Expected: Receive `room-created` and `player-joined` messages

**Step 3: Commit (nothing to commit, but note server works)**

No commit needed - this was a verification step.

---

## Task 4: Add Client Configuration

**Files:**
- Create: `app/src/config.ts`

**Step 1: Create config file with environment-based URL**

Create `app/src/config.ts`:
```typescript
const DEV_SERVER_URL = 'ws://localhost:1999';
const PROD_SERVER_URL = 'wss://shuffle-to-ride.partykit.dev';

// __DEV__ is provided by React Native/Expo
declare const __DEV__: boolean;

export const config = {
  serverUrl: __DEV__ ? DEV_SERVER_URL : PROD_SERVER_URL,
};
```

**Step 2: Commit**

```bash
git add app/src/config.ts
git commit -m "feat(client): add environment-based server config"
```

---

## Task 5: Install Client Dependencies

**Files:**
- Modify: `app/package.json`

**Step 1: Install partysocket**

Run: `cd app && npm install partysocket`
Expected: Package installs successfully

**Step 2: Uninstall socket.io-client**

Run: `cd app && npm uninstall socket.io-client`
Expected: Package removed

**Step 3: Commit**

```bash
git add app/package.json app/package-lock.json
git commit -m "feat(client): switch from socket.io-client to partysocket"
```

---

## Task 6: Update Client Connection Logic

**Files:**
- Modify: `app/App.tsx`

This is the largest change. We need to:
1. Replace Socket.io with partysocket
2. Change connection URL format (include room code in URL)
3. Update message sending/receiving format
4. Remove server URL input from UI

**Step 1: Update imports**

Replace:
```typescript
import { io, Socket } from 'socket.io-client';
```

With:
```typescript
import PartySocket from 'partysocket';
import { config } from './src/config';
```

**Step 2: Update socket ref type**

Replace:
```typescript
const socketRef = useRef<Socket | null>(null);
```

With:
```typescript
const socketRef = useRef<PartySocket | null>(null);
```

**Step 3: Add room code generator (moved from server)**

Add after imports:
```typescript
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
```

**Step 4: Rewrite setupSocket function**

Replace the entire `setupSocket` function with:
```typescript
const setupSocket = useCallback((roomCode: string) => {
  if (socketRef.current) {
    socketRef.current.close();
  }

  const socket = new PartySocket({
    host: config.serverUrl.replace(/^wss?:\/\//, ''),
    room: roomCode,
  });

  socket.addEventListener('open', () => {
    console.log('Connected:', socket.id);
    setState((s) => ({ ...s, connected: true, mySocketId: socket.id }));
  });

  socket.addEventListener('close', () => {
    console.log('Disconnected');
    setState((s) => ({
      ...s,
      connected: false,
      screen: 'home',
      roomCode: null,
    }));
    setConnecting(false);
  });

  socket.addEventListener('message', (event) => {
    const { type, payload } = JSON.parse(event.data);

    switch (type) {
      case 'room-created':
        setState((s) => ({ ...s, roomCode: payload.roomCode, screen: 'lobby' }));
        setConnecting(false);
        break;

      case 'player-joined':
        setState((s) => ({ ...s, players: payload.players }));
        break;

      case 'game-started':
        setState((s) => ({
          ...s,
          screen: 'game',
          hand: payload.yourHand,
          faceUpCards: payload.faceUpCards,
        }));
        break;

      case 'game-state':
        setState((s) => ({
          ...s,
          faceUpCards: payload.faceUpCards,
          deckCount: payload.deckCount,
          players: payload.players,
          currentTurn: payload.currentTurn,
        }));
        break;

      case 'your-hand':
        setState((s) => ({ ...s, hand: payload.hand }));
        break;

      case 'player-action':
        const message = formatActionMessage(payload);
        if (message) {
          toastKeyRef.current += 1;
          setToastMessage(message);
        }
        break;

      case 'error':
        Alert.alert('Error', payload.message);
        break;
    }
  });

  socketRef.current = socket;
  return socket;
}, [formatActionMessage]);
```

**Step 5: Rewrite handleCreateRoom**

Replace:
```typescript
const handleCreateRoom = useCallback(
  (playerName: string, serverUrl: string) => {
    setConnecting(true);
    const socket = setupSocket(serverUrl);
    setState((s) => ({ ...s, playerName, isHost: true }));

    socket.on('connect', () => {
      socket.emit('create-room', { playerName });
    });
  },
  [setupSocket]
);
```

With:
```typescript
const handleCreateRoom = useCallback(
  (playerName: string) => {
    setConnecting(true);
    const roomCode = generateRoomCode();
    const socket = setupSocket(roomCode);
    setState((s) => ({ ...s, playerName, isHost: true }));

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'join-room',
        payload: { playerName }
      }));
    }, { once: true });
  },
  [setupSocket]
);
```

**Step 6: Rewrite handleJoinRoom**

Replace:
```typescript
const handleJoinRoom = useCallback(
  (playerName: string, roomCode: string, serverUrl: string) => {
    setConnecting(true);
    const socket = setupSocket(serverUrl);
    setState((s) => ({ ...s, playerName, isHost: false }));

    socket.on('connect', () => {
      socket.emit('join-room', { roomCode, playerName });
    });
  },
  [setupSocket]
);
```

With:
```typescript
const handleJoinRoom = useCallback(
  (playerName: string, roomCode: string) => {
    setConnecting(true);
    const socket = setupSocket(roomCode.toUpperCase());
    setState((s) => ({ ...s, playerName, isHost: false }));

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'join-room',
        payload: { playerName }
      }));
    }, { once: true });
  },
  [setupSocket]
);
```

**Step 7: Update action handlers to use send()**

Replace all `socketRef.current?.emit('event-name', payload)` patterns with `socketRef.current?.send(JSON.stringify({ type: 'event-name', payload }))`:

```typescript
const handleStartGame = useCallback(() => {
  socketRef.current?.send(JSON.stringify({ type: 'start-game' }));
}, []);

const handleDrawDeck = useCallback(() => {
  socketRef.current?.send(JSON.stringify({ type: 'draw-from-deck' }));
}, []);

const handleDrawFaceUp = useCallback((index: number) => {
  socketRef.current?.send(JSON.stringify({ type: 'draw-face-up', payload: { index } }));
}, []);

const handleDiscard = useCallback((cardIds: string[]) => {
  socketRef.current?.send(JSON.stringify({ type: 'discard-cards', payload: { cardIds } }));
}, []);

const handleEndTurn = useCallback(() => {
  socketRef.current?.send(JSON.stringify({ type: 'end-turn' }));
}, []);
```

**Step 8: Update handleLeave**

Replace `socketRef.current?.disconnect()` with `socketRef.current?.close()`.

**Step 9: Commit**

```bash
git add app/App.tsx
git commit -m "feat(client): migrate from socket.io to partysocket"
```

---

## Task 7: Update HomeScreen UI

**Files:**
- Modify: `app/App.tsx`

Remove the server URL input field and update function signatures.

**Step 1: Update HomeScreen props**

Replace:
```typescript
function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  connecting,
}: {
  onCreateRoom: (name: string, serverUrl: string) => void;
  onJoinRoom: (name: string, code: string, serverUrl: string) => void;
  connecting: boolean;
}) {
```

With:
```typescript
function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  connecting,
}: {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (name: string, code: string) => void;
  connecting: boolean;
}) {
```

**Step 2: Remove serverUrl state and input**

Remove from HomeScreen:
```typescript
const [serverUrl, setServerUrl] = useState('http://192.168.1.157:3000');
```

And remove the entire serverUrlContainer section:
```tsx
<View style={styles.serverUrlContainer}>
  <Text style={styles.inputLabel}>Server URL:</Text>
  <TextInput
    style={styles.input}
    value={serverUrl}
    onChangeText={setServerUrl}
    placeholder="http://192.168.1.100:3000"
    placeholderTextColor="#666"
    autoCapitalize="none"
  />
</View>
```

**Step 3: Update button handlers**

Replace:
```typescript
const handleCreate = () => {
  if (!playerName.trim()) {
    Alert.alert('Error', 'Please enter your name');
    return;
  }
  onCreateRoom(playerName.trim(), serverUrl);
};

const handleJoin = () => {
  if (!playerName.trim()) {
    Alert.alert('Error', 'Please enter your name');
    return;
  }
  if (!roomCode.trim()) {
    Alert.alert('Error', 'Please enter room code');
    return;
  }
  onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase(), serverUrl);
};
```

With:
```typescript
const handleCreate = () => {
  if (!playerName.trim()) {
    Alert.alert('Error', 'Please enter your name');
    return;
  }
  onCreateRoom(playerName.trim());
};

const handleJoin = () => {
  if (!playerName.trim()) {
    Alert.alert('Error', 'Please enter your name');
    return;
  }
  if (!roomCode.trim()) {
    Alert.alert('Error', 'Please enter room code');
    return;
  }
  onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase());
};
```

**Step 4: Remove serverUrlContainer style**

Remove from StyleSheet:
```typescript
serverUrlContainer: {
  width: '100%',
  marginBottom: 24,
},
```

**Step 5: Commit**

```bash
git add app/App.tsx
git commit -m "feat(client): remove server URL input from UI"
```

---

## Task 8: Test End-to-End Locally

**Files:**
- None (manual testing)

**Step 1: Start server**

Run: `cd server && npm run dev`

**Step 2: Start client**

Run: `cd app && npx expo start`

**Step 3: Test flow**

1. Open app on phone (scan QR code)
2. Create a room - should get 4-letter code
3. Open app on second device
4. Join with room code
5. Start game
6. Draw cards, verify game state syncs

**Step 4: Commit test verification**

No code changes, but verify everything works before proceeding.

---

## Task 9: Deploy Server to PartyKit

**Files:**
- None (deployment)

**Step 1: Deploy**

Run: `cd server && npm run deploy`

First run will prompt for GitHub authentication. Follow the prompts.

Expected: Server deploys to `shuffle-to-ride.partykit.dev`

**Step 2: Verify deployment URL**

The CLI will output the deployment URL. Note it for the next step.

**Step 3: Update client config if needed**

If the URL is different from `shuffle-to-ride.partykit.dev`, update `app/src/config.ts`.

**Step 4: Commit any config changes**

```bash
git add app/src/config.ts
git commit -m "chore: update production server URL" # only if changed
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md` (if exists)

**Step 1: Update CLAUDE.md**

Replace `CLAUDE.md` with updated content reflecting PartyKit architecture:

```markdown
# Shuffle to Ride

A mobile companion app for Ticket to Ride (USA) that handles train card shuffling and dealing digitally, allowing players to use the physical board and tokens while managing cards on their phones.

## Architecture

```
shuffle-to-ride/
├── app/           # React Native (Expo) mobile client
├── server/        # PartyKit game server
└── docs/plans/    # Design documents
```

**How it works:** A PartyKit server runs on Cloudflare's edge network. Players connect from their phones via the internet. The server manages the shared deck, face-up cards, and turn order. Each player sees their private hand on their phone.

## Running the App

### Server (Local Development)
```bash
cd server
npm install
npm run dev
```
Runs on localhost:1999.

### Server (Production)
```bash
cd server
npm run deploy
```
Deploys to shuffle-to-ride.partykit.dev.

### Client
```bash
cd app
npm install
npx expo start
```
Scan QR code with Expo Go app. The app automatically connects to the appropriate server based on environment.

## Key Files

### Server (`server/src/`)
- `server.ts` - PartyKit party class handling all game events
- `gameLogic.ts` - Card/deck operations, turn management, locomotive rules
- `types.ts` - TypeScript interfaces for Card, Player, GameState

### Client (`app/`)
- `App.tsx` - All screens and components in a single file
- `src/config.ts` - Environment-based server URL configuration
- `src/cardImages.ts` - Maps card colors to image assets
- `src/types.ts` - Client-side type definitions
- `assets/cards/` - Train car images for each color

## Game Rules Implemented

- 110-card deck: 12 each of 8 colors + 14 locomotives (wild)
- Each player starts with 4 cards
- 5 face-up cards always visible
- Draw 2 cards per turn (from deck or face-up)
- Face-up locomotive counts as both draws (turn ends immediately)
- If 3+ locomotives appear face-up, discard all 5 and redraw
- Discard cards to claim routes (tracking done physically on board)

## Message Types

| Client → Server | Description |
|-----------------|-------------|
| `join-room` | Player joins with name (first player becomes host) |
| `start-game` | Host starts, deals cards |
| `draw-from-deck` | Draw blind from deck |
| `draw-face-up` | Draw specific face-up card |
| `discard-cards` | Remove cards when claiming route |
| `end-turn` | End turn early |

| Server → Client | Description |
|-----------------|-------------|
| `room-created` | Confirms room join with code |
| `player-joined` | Updated player list |
| `game-started` | Initial hand and face-up cards |
| `game-state` | Broadcast face-up cards, deck count, turn info |
| `your-hand` | Private hand update to individual player |
| `player-action` | Toast notification of other player's action |
| `error` | Error message |

## Development Notes

- The app uses simple state-based navigation (no expo-router) due to SDK 54 compatibility issues
- Cards display in landscape orientation (100x70px normal, 70x50px small)
- Toast notifications show other players' actions with privacy rules (deck draws don't reveal color)
- Server broadcasts game state after every action to keep all clients in sync
- Room codes are generated client-side and become the PartyKit party ID

## Future Enhancements

- **Reconnection support** - Allow players to rejoin if they disconnect briefly
- **Persistent rooms** - Save game state to survive server restarts
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update documentation for PartyKit architecture"
```

---

## Task 11: Clean Up Old Server Code

**Files:**
- Delete: `server/src/index.ts`

**Step 1: Remove old Socket.io server**

Run: `rm server/src/index.ts` (or delete via file explorer)

**Step 2: Update tsconfig if needed**

Verify `server/tsconfig.json` doesn't reference index.ts specifically.

**Step 3: Verify server still builds**

Run: `cd server && npm run build`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old Socket.io server code"
```

---

## Task 12: Final Verification and Merge

**Files:**
- None

**Step 1: Run full test**

1. Deploy latest server: `cd server && npm run deploy`
2. Build and run client pointing at prod
3. Test full game flow with 2+ devices

**Step 2: Merge to main branch**

If in worktree:
```bash
cd /path/to/main/repo
git merge feature/partykit-migration
git push
```

**Step 3: Clean up worktree**

```bash
git worktree remove .worktrees/partykit-migration
```
