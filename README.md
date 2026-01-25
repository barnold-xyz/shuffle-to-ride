# Shuffle to Ride

A digital card companion for **Ticket to Ride** board game nights. Keep your physical board and train pieces — let your phones handle the cards.

## What It Does

Instead of shuffling and dealing 110 train cards by hand, this app manages the card deck digitally:

- **Private hands** — Each player sees only their own cards on their phone
- **Shared face-up cards** — Everyone sees the same 5 face-up options
- **Automatic shuffling** — No more worn-out cards or accidental reveals
- **Turn tracking** — See whose turn it is and what they just did

You still use the physical board, train pieces, and destination tickets. The app just replaces the train card deck.

## Requirements

- Android phones with the app installed (iOS coming soon)
- Internet connection (the server runs in the cloud)

## Quick Start

1. **Host** opens the app and taps **Create Room**
2. **Other players** enter the 4-letter room code and tap **Join Room**
3. Host taps **Start Game** when everyone's in
4. Draw cards by tapping the deck or face-up cards
5. When claiming a route, select cards from your hand and tap **Discard**

## Game Rules

The app follows standard Ticket to Ride card rules:

| Rule | Implementation |
|------|----------------|
| Starting hand | 4 cards each |
| Cards per turn | Draw 2 (or 1 locomotive from face-up) |
| Face-up locomotives | Taking one ends your turn immediately |
| 3+ locomotives face-up | All 5 discarded, 5 new cards dealt |
| Claiming routes | Select matching cards, tap Discard |

## Building the Android App

To build a new APK (after code changes):

```bash
cd app
npx eas-cli build --profile preview --platform android
```

This runs on Expo's build servers. When complete, you'll get a download link for the APK.

## Development

### Server

The game server runs on PartyKit (Cloudflare's edge network).

```bash
cd server
npm install
npm run dev      # Local development (requires WSL on Windows)
npm run deploy   # Deploy to production
```

Production URL: `wss://shuffle-to-ride.barnold-xyz.partykit.dev`

### Client

```bash
cd app
npm install
npx expo start
```

Scan the QR code with Expo Go to test. Set `USE_LOCAL_SERVER = true` in `app/src/config.ts` to test against a local PartyKit server.

## Tech Stack

- **Server**: PartyKit (WebSocket server on Cloudflare)
- **Client**: React Native + Expo
- **Language**: TypeScript

## Project Structure

```
shuffle-to-ride/
├── app/        # Mobile app (React Native/Expo)
├── server/     # Game server (PartyKit)
└── docs/       # Design documents
```

## Troubleshooting

**Can't connect / create room?**
- Check your internet connection
- Make sure you're not on a restrictive network (some corporate/school WiFi blocks WebSocket connections)

**App won't build?**
- Make sure you're logged into EAS (`npx eas-cli login`)
- Check that `app.json` has a valid `projectId` in `extra.eas`

**Cards not updating?**
- Check your internet connection
- Try leaving and rejoining the room

## License

MIT
