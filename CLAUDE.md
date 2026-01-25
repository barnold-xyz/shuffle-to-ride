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
Deploys to shuffle-to-ride.barnold-xyz.partykit.dev. Note: On Windows, run PartyKit commands via WSL.

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
- Set `USE_LOCAL_SERVER = true` in `app/src/config.ts` to test against localhost instead of prod
- PartyKit has Windows path bugs; use WSL for `npm run dev` and `npm run deploy`

## Future Enhancements

- **Reconnection support** - Allow players to rejoin if they disconnect briefly
- **Persistent rooms** - Save game state to survive server restarts
