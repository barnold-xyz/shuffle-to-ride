# 🚂 Shuffle to Ride

A digital card companion for **Ticket to Ride** board game nights. Keep your physical board and train pieces — let your phones handle the cards.

## What It Does

Instead of shuffling and dealing 110 train cards by hand, this app manages the card deck digitally:

- **Private hands** — Each player sees only their own cards on their phone
- **Shared face-up cards** — Everyone sees the same 5 face-up options
- **Automatic shuffling** — No more worn-out cards or accidental reveals
- **Turn tracking** — See whose turn it is and what they just did

You still use the physical board, train pieces, and destination tickets. The app just replaces the train card deck.

## Requirements

- A laptop to run the server (Windows, Mac, or Linux)
- Phones with [Expo Go](https://expo.dev/client) installed (iOS or Android)
- Everyone on the same WiFi network

## Quick Start

### 1. Start the Server

On your laptop:

```bash
cd server
npm install
npm run dev
```

Note your laptop's local IP address (e.g., `192.168.1.42`). The server runs on port 3000.

### 2. Start the App

In a separate terminal:

```bash
cd app
npm install
npx expo start
```

Scan the QR code with your phone's camera (iOS) or Expo Go app (Android).

### 3. Play!

1. **Host** enters the server IP and creates a room
2. **Other players** enter the same IP and join using the 4-letter room code
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

## Tech Stack

- **Server**: Node.js + Socket.io
- **Client**: React Native + Expo
- **Language**: TypeScript

## Project Structure

```
shuffle-to-ride/
├── app/        # Mobile app (React Native/Expo)
├── server/     # Game server (Node.js/Socket.io)
└── docs/       # Design documents
```

## Troubleshooting

**Can't connect to server?**
- Make sure your phone and laptop are on the same WiFi network
- Check that no firewall is blocking port 3000
- Try the laptop's IP address, not `localhost`

**App won't start?**
- Make sure you have Node.js 18+ installed
- Delete `node_modules` and run `npm install` again

**Cards not updating?**
- Check that the server is still running
- Try leaving and rejoining the room

## License

MIT
