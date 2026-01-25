import type {
  Room,
  Server,
  Connection,
  ConnectionContext,
} from 'partykit/server';
import {
  GameState,
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

export default class ShuffleToRideServer implements Server {
  readonly room: Room;
  state: GameState;

  constructor(room: Room) {
    this.room = room;
    // Room code is the room ID
    this.state = createGameState(room.id);
  }

  onConnect(conn: Connection, ctx: ConnectionContext) {
    console.log(`Player connected: ${conn.id} to room ${this.room.id}`);
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

  onMessage(message: string | ArrayBuffer | ArrayBufferView, conn: Connection) {
    // Only handle string messages
    if (typeof message !== 'string') {
      this.sendError(conn, 'Invalid message format: expected string');
      return;
    }

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

    console.log(`${playerName} joined room ${this.room.id}`);

    // Send room confirmation to the joining player
    this.sendToConnection(conn, {
      type: 'room-created',
      payload: { roomCode: this.room.id },
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

    console.log(`Game started in room ${this.room.id}`);

    // Send initial hands to each player
    for (const p of this.state.players) {
      const playerConn = this.room.getConnection(p.id);
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
    this.room.broadcast(message);
  }

  private broadcastGameState() {
    const gameStatePayload = {
      faceUpCards: this.state.faceUpCards,
      deckCount: this.state.deck.length,
      players: getPublicPlayerInfo(this.state.players),
      currentTurn: this.state.currentTurn,
    };

    this.room.broadcast(JSON.stringify({
      type: 'game-state',
      payload: gameStatePayload,
    }));

    // Send individual hands to each player
    for (const player of this.state.players) {
      const playerConn = this.room.getConnection(player.id);
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
    for (const conn of this.room.getConnections()) {
      if (conn.id !== excludeConnectionId) {
        conn.send(message);
      }
    }
  }
}
