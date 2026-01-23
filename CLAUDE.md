# Shuffle to Ride

A mobile companion app for Ticket to Ride (USA) that handles train card shuffling and dealing digitally, allowing players to use the physical board and tokens while managing cards on their phones.

## Architecture

```
shuffle-to-ride/
├── app/           # React Native (Expo) mobile client
├── server/        # Node.js + Socket.io game server
└── docs/plans/    # Design documents
```

**How it works:** A Node.js server runs on a laptop. Players connect from their phones via the local WiFi network. The server manages the shared deck, face-up cards, and turn order. Each player sees their private hand on their phone.

## Running the App

### Server
```bash
cd server
npm install
npm run dev
```
Runs on port 3000. Note the laptop's IP address for clients.

### Client
```bash
cd app
npm install
npx expo start
```
Scan QR code with Expo Go app. Enter the server IP when creating/joining a room.

## Key Files

### Server (`server/src/`)
- `index.ts` - Socket.io event handlers (create-room, join-room, draw-from-deck, etc.)
- `gameLogic.ts` - Card/deck operations, turn management, locomotive rules
- `types.ts` - TypeScript interfaces for Card, Player, GameState

### Client (`app/`)
- `App.tsx` - All screens and components in a single file (HomeScreen, LobbyScreen, GameScreen, Card, Hand, FaceUpDisplay, Toast)
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

## Socket Events

| Client → Server | Description |
|-----------------|-------------|
| `create-room` | Host creates room, gets 4-letter code |
| `join-room` | Player joins with room code |
| `start-game` | Host starts, deals cards |
| `draw-from-deck` | Draw blind from deck |
| `draw-face-up` | Draw specific face-up card |
| `discard-cards` | Remove cards when claiming route |

| Server → Client | Description |
|-----------------|-------------|
| `game-state` | Broadcast face-up cards, deck count, turn info |
| `your-hand` | Private hand update to individual player |
| `player-action` | Toast notification of other player's action |

## Development Notes

- The app uses simple state-based navigation (no expo-router) due to SDK 54 compatibility issues
- Cards display in landscape orientation (100x70px normal, 70x50px small)
- Toast notifications show other players' actions with privacy rules (deck draws don't reveal color)
- Server broadcasts game state after every action to keep all clients in sync
