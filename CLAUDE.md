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

## Deploying App Updates

### OTA Update (JS changes only)
For TypeScript/JavaScript code changes, styling, and assets - instant, no app store review:
```bash
cd app
npx eas-cli update --branch preview --message "Description"      # Android
npx eas-cli update --branch production --message "Description"   # iOS
```

### Full Rebuild (native changes)
Required when changing `package.json`, `app.json`, native dependencies, or Expo SDK:
```bash
cd app
npx expo install --check                                         # Fix dependency mismatches
npx expo-doctor                                                  # Check for common issues
# Bump "version" in app.json for production releases
# Bump "ios.buildNumber" in app.json for each iOS submission
npx eas-cli build --profile preview --platform android           # Android APK
npx eas-cli build --profile production --platform ios            # iOS
npx eas-cli submit --platform ios                                # Submit to TestFlight
```

**Rule of thumb:** Changed only `.ts`/`.tsx` files? Use OTA. Changed `package.json` or `app.json`? Rebuild.

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
- **Turn action exclusivity**: Draw cards OR claim route per turn (not both)
- Claiming a route immediately ends the turn
- Discard cards to claim routes (tracking done physically on board)

## Message Types

| Client → Server | Description |
|-----------------|-------------|
| `join-room` | Player joins with name (first player becomes host) |
| `rejoin-room` | Player reconnects using saved token |
| `set-turn-order` | Host sets player turn order in lobby (before game starts) |
| `start-game` | Host starts, deals cards |
| `draw-from-deck` | Draw blind from deck |
| `draw-face-up` | Draw specific face-up card |
| `discard-cards` | Remove cards when claiming route |
| `end-turn` | End turn early |

| Server → Client | Description |
|-----------------|-------------|
| `room-created` | Confirms room join with code and reconnect token |
| `room-rejoined` | Confirms rejoin with full game state |
| `player-joined` | Updated player list (includes connected status) |
| `game-started` | Initial hand and face-up cards |
| `game-state` | Broadcast face-up cards, deck count, turn info |
| `your-hand` | Private hand update to individual player |
| `player-action` | Toast notification of other player's action |
| `error` | Error message |

## Development Notes

- The app uses simple state-based navigation (no expo-router) due to SDK 54 compatibility issues
- Cards display in landscape orientation (100x70px normal, 70x50px small)
- Toast notifications show other players' actions with privacy rules:
  - Deck draws don't reveal color
  - Route claims show color breakdown (e.g., "3 red, 1 locomotive")
  - Tiered durations: 3s for draws, 5s for turn start, 8s for route claims
- Route claim validation enforces same-color requirement (locomotives are wild)
- Server broadcasts game state after every action to keep all clients in sync
- Room codes are generated client-side and become the PartyKit party ID
- Set `USE_LOCAL_SERVER = true` in `app/src/config.ts` to test against localhost instead of prod
- PartyKit has Windows path bugs; use WSL for `npm run dev` and `npm run deploy`

## UI Design: Railroad Heritage

The app uses a **"Railroad Heritage"** design system inspired by the golden age of rail travel (1920s-30s). See `docs/plans/2026-01-25-railroad-heritage-design.md` for full specifications.

### Design Principles

1. **Refined, not garish** - Rich colors at low-medium opacity; avoid saturated solid backgrounds
2. **Warm and elegant** - Aged wood tones, burgundy accents, brass highlights
3. **Consistent across screens** - Same palette and treatment on home, lobby, and game screens
4. **Brass as accent** - Use brass (`#C9A227`) for borders, labels, and highlights—not backgrounds

### Color Usage

| Element | Treatment |
|---------|-----------|
| Backgrounds | Wood-tone gradients (`bgMid` → `bgDark`) |
| Containers | Semi-transparent burgundy tint (15-25% opacity) |
| Borders | Semi-transparent brass (30-40% opacity) or muted border color |
| Section labels | Brass colored |
| Buttons | Burgundy gradient with brass border |
| Text | Cream/parchment on dark backgrounds |

### Theme File

All colors and typography are defined in `app/src/theme.ts`. Always use theme constants:

```typescript
import { THEME, TYPE, SPACING, RADIUS } from './src/theme';

// Colors
backgroundColor: THEME.bgMid
color: THEME.brass
borderColor: THEME.border

// Typography
...TYPE.heading
...TYPE.body

// Spacing
padding: SPACING.lg
borderRadius: RADIUS.md
```

### Key Components

- **DiamondDivider** - Horizontal rule with brass diamond accent
- **OrnateBox** - Burgundy gradient container (used for room code display)
- **LinearGradient** - Used for buttons, backgrounds, and sections

### Anti-Patterns

- ❌ Solid bright colors as backgrounds (too garish)
- ❌ Brass borders everywhere (use sparingly)
- ❌ Inconsistent treatment between screens
- ❌ Generic dark gray/black without wood tones

## Reconnection Support

Players can rejoin a game after losing their connection:

1. **How it works**: When a player joins, the server generates a unique reconnect token. The client stores this token, along with the room code and player name, in AsyncStorage.

2. **On disconnect**: The player is marked as disconnected but remains in the game. Their turn is skipped, and other players see an "OFFLINE" badge.

3. **On reconnect**: When the app opens, if a saved session exists, the player sees a "Rejoin Room [CODE]" button. Tapping it reconnects them with their original hand intact.

4. **Intentional leave**: Choosing "Leave" clears the saved session, preventing accidental rejoins.

## Future Enhancements

- **Persistent rooms** - Save game state to survive server restarts
