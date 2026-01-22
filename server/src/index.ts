import { Server, Socket } from 'socket.io';
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
  generateRoomCode,
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

const PORT = 3000;

const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store all active game rooms
const rooms = new Map<string, GameState>();

// Map socket IDs to room codes for cleanup
const socketToRoom = new Map<string, string>();

function broadcastGameState(roomCode: string): void {
  const state = rooms.get(roomCode);
  if (!state) return;

  const gameStatePayload = {
    faceUpCards: state.faceUpCards,
    deckCount: state.deck.length,
    players: getPublicPlayerInfo(state.players),
    currentTurn: state.currentTurn,
  };

  io.to(roomCode).emit('game-state', gameStatePayload);

  // Send individual hands to each player
  for (const player of state.players) {
    io.to(player.id).emit('your-hand', { hand: player.hand });
  }
}

function broadcastPlayerList(roomCode: string): void {
  const state = rooms.get(roomCode);
  if (!state) return;

  io.to(roomCode).emit('player-joined', {
    players: getPublicPlayerInfo(state.players),
  });
}

function broadcastPlayerAction(
  roomCode: string,
  excludeSocketId: string,
  action: {
    type: 'drew-from-deck' | 'drew-face-up' | 'discarded' | 'turn-started';
    playerName: string;
    cardColor?: string;
    count?: number;
  }
): void {
  io.to(roomCode).except(excludeSocketId).emit('player-action', action);
}

io.on('connection', (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (payload: CreateRoomPayload) => {
    const { playerName } = payload;

    // Generate unique room code
    let roomCode = generateRoomCode();
    while (rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    // Create game state
    const state = createGameState(roomCode);
    const player = createPlayer(socket.id, playerName, true);
    state.players.push(player);

    rooms.set(roomCode, state);
    socketToRoom.set(socket.id, roomCode);

    socket.join(roomCode);

    console.log(`Room ${roomCode} created by ${playerName}`);

    socket.emit('room-created', { roomCode });
    broadcastPlayerList(roomCode);
  });

  // Join an existing room
  socket.on('join-room', (payload: JoinRoomPayload) => {
    const { roomCode, playerName } = payload;
    const normalizedCode = roomCode.toUpperCase();

    const state = rooms.get(normalizedCode);
    if (!state) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (state.phase !== 'lobby') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    if (state.players.length >= 5) {
      socket.emit('error', { message: 'Room is full (max 5 players)' });
      return;
    }

    const player = createPlayer(socket.id, playerName, false);
    state.players.push(player);
    socketToRoom.set(socket.id, normalizedCode);

    socket.join(normalizedCode);

    console.log(`${playerName} joined room ${normalizedCode}`);

    socket.emit('room-created', { roomCode: normalizedCode });
    broadcastPlayerList(normalizedCode);
  });

  // Host starts the game
  socket.on('start-game', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) {
      socket.emit('error', { message: 'Not in a room' });
      return;
    }

    const state = rooms.get(roomCode);
    if (!state) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    const player = state.players.find((p) => p.id === socket.id);
    if (!player?.isHost) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    if (state.players.length < 1) {
      socket.emit('error', { message: 'Need at least 1 player to start' });
      return;
    }

    // Deal cards
    dealInitialHands(state);
    state.phase = 'playing';

    // Start first player's turn
    const firstPlayer = getNextPlayer(state);
    if (firstPlayer) {
      startTurn(state, firstPlayer);
    }

    console.log(`Game started in room ${roomCode}`);

    // Send initial hands to each player
    for (const p of state.players) {
      io.to(p.id).emit('game-started', {
        yourHand: p.hand,
        faceUpCards: state.faceUpCards,
      });
    }

    broadcastGameState(roomCode);
  });

  // Draw from deck
  socket.on('draw-from-deck', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'playing') return;

    if (!canDrawCard(state, socket.id)) {
      socket.emit('error', { message: 'Cannot draw a card right now' });
      return;
    }

    // Check if deck is empty, reshuffle discard if needed
    if (state.deck.length === 0) {
      reshuffleDiscardIntoDeck(state);
    }

    if (state.deck.length === 0) {
      socket.emit('error', { message: 'No cards left in deck' });
      return;
    }

    const card = drawFromDeck(state, socket.id);
    const player = state.players.find((p) => p.id === socket.id);
    if (card && state.currentTurn && player) {
      state.currentTurn.cardsDrawn++;

      console.log(`${socket.id} drew from deck: ${card.color}`);

      // Notify other players (don't reveal card color)
      broadcastPlayerAction(roomCode, socket.id, {
        type: 'drew-from-deck',
        playerName: player.name,
      });

      // Check if turn is complete
      if (isTurnComplete(state)) {
        const nextPlayerId = getNextPlayer(state);
        if (nextPlayerId) {
          const nextPlayer = state.players.find((p) => p.id === nextPlayerId);
          startTurn(state, nextPlayerId);
          if (nextPlayer) {
            broadcastPlayerAction(roomCode, nextPlayerId, {
              type: 'turn-started',
              playerName: nextPlayer.name,
            });
          }
        }
      }

      broadcastGameState(roomCode);
    }
  });

  // Draw face-up card
  socket.on('draw-face-up', (payload: DrawFaceUpPayload) => {
    const { index } = payload;
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'playing') return;

    // Check if it's a locomotive and if that's allowed
    const targetCard = state.faceUpCards[index];
    if (!targetCard) {
      socket.emit('error', { message: 'Invalid card index' });
      return;
    }

    if (targetCard.color === 'locomotive') {
      if (!canDrawFaceUpLocomotive(state, socket.id)) {
        socket.emit('error', {
          message: 'Can only draw a face-up locomotive as your first draw',
        });
        return;
      }
    } else {
      if (!canDrawCard(state, socket.id)) {
        socket.emit('error', { message: 'Cannot draw a card right now' });
        return;
      }
    }

    const result = drawFaceUpCard(state, socket.id, index);
    const player = state.players.find((p) => p.id === socket.id);
    if (result && state.currentTurn && player) {
      state.currentTurn.cardsDrawn++;
      if (result.isLocomotive) {
        state.currentTurn.drewLocomotive = true;
      }

      console.log(`${socket.id} drew face-up: ${result.card.color}`);

      // Notify other players (reveal card color since it was face-up)
      broadcastPlayerAction(roomCode, socket.id, {
        type: 'drew-face-up',
        playerName: player.name,
        cardColor: result.card.color,
      });

      // Refill deck from discard if needed
      if (state.deck.length === 0) {
        reshuffleDiscardIntoDeck(state);
      }

      // Check if turn is complete
      if (isTurnComplete(state)) {
        const nextPlayerId = getNextPlayer(state);
        if (nextPlayerId) {
          const nextPlayer = state.players.find((p) => p.id === nextPlayerId);
          startTurn(state, nextPlayerId);
          if (nextPlayer) {
            broadcastPlayerAction(roomCode, nextPlayerId, {
              type: 'turn-started',
              playerName: nextPlayer.name,
            });
          }
        }
      }

      broadcastGameState(roomCode);
    }
  });

  // Discard cards (when claiming routes)
  socket.on('discard-cards', (payload: DiscardCardsPayload) => {
    const { cardIds } = payload;
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'playing') return;

    const player = state.players.find((p) => p.id === socket.id);
    const success = discardCards(state, socket.id, cardIds);
    if (success && player) {
      console.log(`${socket.id} discarded ${cardIds.length} cards`);

      // Notify other players
      broadcastPlayerAction(roomCode, socket.id, {
        type: 'discarded',
        playerName: player.name,
        count: cardIds.length,
      });

      broadcastGameState(roomCode);
    } else {
      socket.emit('error', { message: 'Failed to discard cards' });
    }
  });

  // End turn early
  socket.on('end-turn', () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const state = rooms.get(roomCode);
    if (!state || state.phase !== 'playing') return;

    if (!state.currentTurn || state.currentTurn.playerId !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    console.log(`${socket.id} ended turn early`);

    const nextPlayerId = getNextPlayer(state);
    if (nextPlayerId) {
      const nextPlayer = state.players.find((p) => p.id === nextPlayerId);
      startTurn(state, nextPlayerId);
      if (nextPlayer) {
        broadcastPlayerAction(roomCode, nextPlayerId, {
          type: 'turn-started',
          playerName: nextPlayer.name,
        });
      }
    }

    broadcastGameState(roomCode);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    const roomCode = socketToRoom.get(socket.id);
    if (roomCode) {
      const state = rooms.get(roomCode);
      if (state) {
        // Remove player from game
        state.players = state.players.filter((p) => p.id !== socket.id);

        // If host left, assign new host
        if (state.players.length > 0 && !state.players.some((p) => p.isHost)) {
          state.players[0].isHost = true;
        }

        // If it was this player's turn, move to next
        if (state.currentTurn?.playerId === socket.id) {
          const nextPlayerId = getNextPlayer(state);
          if (nextPlayerId) {
            startTurn(state, nextPlayerId);
          }
        }

        // Clean up empty rooms
        if (state.players.length === 0) {
          rooms.delete(roomCode);
          console.log(`Room ${roomCode} deleted (empty)`);
        } else {
          broadcastPlayerList(roomCode);
          if (state.phase === 'playing') {
            broadcastGameState(roomCode);
          }
        }
      }
      socketToRoom.delete(socket.id);
    }
  });
});

console.log(`🚂 Shuffle to Ride server running on port ${PORT}`);
console.log(`Connect clients to: http://YOUR_IP:${PORT}`);
