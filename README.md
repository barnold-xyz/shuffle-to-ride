# Shuffle to Ride

A digital card companion for **Ticket to Ride** board game nights. Keep your physical board and train pieces — let your phones handle the cards.

## What It Does

Instead of shuffling and dealing 110 train cards by hand, this app manages the card deck digitally:

- **Private hands** — Each player sees only their own cards on their phone
- **Shared face-up cards** — Everyone sees the same 5 face-up options
- **Automatic shuffling** — No more worn-out cards or accidental reveals
- **Turn tracking** — See whose turn it is and what they just did

You still use the physical board, train pieces, and destination tickets. The app just replaces the train card deck.

## Features

**Reconnection Support**
- Lost connection? Rejoin your game with all your cards intact
- Players show as "OFFLINE" when disconnected but stay in the game
- Saved sessions let you reconnect when you reopen the app

**Official Turn Rules**
- Enforces Ticket to Ride rules: draw cards OR claim a route per turn (not both)
- Claiming a route automatically ends your turn
- Cannot claim a route after you've drawn any cards

**Smart Notifications**
- See exactly what cards other players used to claim routes
- Color breakdown shows wild locomotives vs. specific colors (e.g., "3 red, 1 locomotive")
- Important actions linger longer so you don't miss them

**Railroad Heritage Design**
- Polished 1920s-30s aesthetic inspired by the golden age of rail travel
- Warm wood tones, burgundy accents, and brass highlights
- Elegant interface that matches the board game's theme

## Requirements

- Android or iOS phones with the app installed
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
| Turn actions | Draw cards OR claim a route (not both) |
| Claiming routes | Select matching cards, tap Discard; turn ends automatically |

## Building the App

Builds run on Expo's build servers via EAS.

### Android (APK)

```bash
cd app
npx eas-cli build --profile preview --platform android
```

When complete, you'll get a download link for the APK.

### iOS (TestFlight)

```bash
cd app
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios
```

After submitting, go to App Store Connect → TestFlight to add testers.

## Updating the App

There are two ways to push changes to users:

### OTA Update (instant, no app store review)

For JavaScript/TypeScript code changes, styling, and assets:

```bash
cd app
npx eas-cli update --branch preview --message "Description of changes"      # Android
npx eas-cli update --branch production --message "Description of changes"   # iOS
```

Users get the update automatically next time they open the app.

### Full Rebuild (requires reinstall)

Required when changing:
- Native dependencies (npm packages with native code)
- App configuration (`app.json` - permissions, icons, splash screen)
- Expo SDK version

Before rebuilding:
```bash
npx expo install --check    # Fix dependency mismatches
npx expo-doctor             # Check for common issues
```

For production releases, bump `version` in `app.json` so users see the new version number. For iOS, also increment `ios.buildNumber` before each TestFlight submission.

Then use the build commands above, and redistribute the APK or submit to TestFlight.

**Rule of thumb:** If you only changed `.ts`/`.tsx` files, use OTA update. If you changed `package.json`, `app.json`, or added native features, rebuild.

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

**Lost connection or cards not updating?**
- Check your internet connection
- If you see "Rejoin Room", tap it to reconnect with your cards intact
- If reconnecting doesn't work, leave and create/join a new room

## License

MIT
