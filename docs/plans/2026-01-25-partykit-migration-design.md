# PartyKit Migration Design

Migrate Shuffle to Ride from a laptop-hosted Socket.io server to a cloud-hosted PartyKit server.

## Goals

- **Reliability** - Eliminate local WiFi issues that plague the current laptop server approach
- **Distribution** - Allow others to use the app without running their own server

## Architecture Overview

**Current state:** A Node.js + Socket.io server runs on a laptop. Players connect via local WiFi by entering the laptop's IP. Game state lives in memory on the server.

**New state:** A PartyKit server deployed to Cloudflare's edge network. Players connect automatically via a hardcoded URL. Game state lives in the PartyKit "party" instance.

```
Before:
  [Phone] ──WiFi──> [Laptop:3000] <──WiFi── [Phone]
                         │
                    GameState (memory)

After:
  [Phone] ──Internet──> [PartyKit Edge] <──Internet── [Phone]
                              │
                         Party (room state)
```

**What changes:**
- `server/` folder gets restructured for PartyKit's conventions
- `index.ts` adapts from Socket.io events to PartyKit's `onConnect`, `onMessage`, `onClose` handlers
- Client connects to environment-configured URL instead of user-entered IP

**What stays the same:**
- All game rules and logic (`gameLogic.ts` unchanged)
- The client UI and flow
- Room codes, player management, turn structure
- Current disconnection behavior (player removed on disconnect)

**File structure change:**
```
server/
├── src/
│   ├── server.ts      # PartyKit party class (replaces index.ts)
│   ├── gameLogic.ts   # Unchanged
│   └── types.ts       # Unchanged
├── partykit.json      # PartyKit config
└── package.json       # Updated dependencies
```

## PartyKit Server Implementation

PartyKit uses a class-based model where each "party" is a room.

### Event Mapping

| Socket.io | PartyKit |
|-----------|----------|
| `io.on('connection', ...)` | `onConnect(conn, ctx)` |
| `socket.on('disconnect', ...)` | `onClose(conn)` |
| `socket.on('event', ...)` | `onMessage(message, conn)` |

Instead of separate event handlers, PartyKit receives all messages through `onMessage`. Parse the message type and dispatch:

```typescript
onMessage(message: string, conn: Connection) {
  const { type, payload } = JSON.parse(message);

  switch (type) {
    case 'create-room': this.handleCreateRoom(conn, payload); break;
    case 'join-room': this.handleJoinRoom(conn, payload); break;
    case 'draw-from-deck': this.handleDrawFromDeck(conn); break;
    // ... etc
  }
}
```

### Room Management

Currently room codes are generated and multiple rooms are stored in a `Map`. With PartyKit, each party instance *is* a room. The room code becomes the party ID in the URL:

```
Current:  ws://192.168.1.5:3000  (server manages rooms internally)
PartyKit: wss://shuffle-to-ride.partykit.dev/party/ABCD  (ABCD is the room)
```

This simplifies the server - no need to manage a rooms map. One party = one game.

### Broadcasting

Instead of `io.to(roomCode).emit()`, use `this.room.broadcast(message)` or `conn.send(message)` for individual players.

## Client Changes

### Configuration

Add an environment-based server URL:

```typescript
// app/src/config.ts
const serverUrl = __DEV__
  ? 'ws://localhost:1999'
  : 'wss://shuffle-to-ride.partykit.dev';
```

### Connection Flow

Currently players enter an IP address on the home screen. The new flow:

1. **Create room:** Client connects to a new party with a generated room code: `${serverUrl}/party/${generateRoomCode()}`
2. **Join room:** Client connects using the entered room code: `${serverUrl}/party/${roomCode}`

The "Server IP" input field gets removed from the UI.

### Socket.io to partysocket

Use PartyKit's client library (`partysocket`) - drop-in replacement with reconnection built in.

Message format changes from:
```typescript
socket.emit('draw-from-deck');
```

To:
```typescript
socket.send(JSON.stringify({ type: 'draw-from-deck' }));
```

Similar pattern for receiving - parse JSON and switch on `type`.

## Development & Deployment

### Local Development

```bash
cd server
npm run dev  # runs: partykit dev
```

PartyKit's dev server runs on `localhost:1999` by default. Hot reloads on file changes.

### Deployment

```bash
cd server
npm run deploy  # runs: partykit deploy
```

First deploy prompts for GitHub auth. Creates `shuffle-to-ride.partykit.dev`. Subsequent deploys update in place.

### Dependency Changes

**Remove from server:**
- `socket.io`
- `cors`

**Add to server:**
- `partykit` (dev dependency)

**Add to client:**
- `partysocket`

**Remove from client:**
- `socket.io-client`

## Migration Steps

1. **Server first** - Rewrite `index.ts` as PartyKit party class, keep `gameLogic.ts` as-is
2. **Test locally** - Use a simple WebSocket client or temporary test script to verify server works
3. **Client update** - Swap Socket.io for partysocket, update connection logic, remove IP input
4. **Deploy** - Push server to PartyKit, build client pointing at prod URL
5. **Update docs** - Revise CLAUDE.md and README.md to reflect new architecture, remove laptop server instructions, add PartyKit deployment info
6. **Cleanup** - Remove unused Socket.io dependencies

## Future Enhancements

### Reconnection Support

PartyKit + partysocket support reconnection well. Implementation would require:
- Store player identity (e.g., a token in AsyncStorage)
- Match reconnecting players to their game state
- Add a grace period before removing disconnected players

### Persistent Rooms

PartyKit can persist party state to durable storage. Could allow resuming games after server restarts.
