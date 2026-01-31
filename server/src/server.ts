import type {
  Room,
  Server,
  Connection,
  ConnectionContext,
} from 'partykit/server';
import {
  GameState,
  JoinRoomPayload,
  RejoinRoomPayload,
  DrawFaceUpPayload,
  DiscardCardsPayload,
  SetTurnOrderPayload,
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
  | { type: 'rejoin-room'; payload: RejoinRoomPayload }
  | { type: 'start-game' }
  | { type: 'draw-from-deck' }
  | { type: 'draw-face-up'; payload: DrawFaceUpPayload }
  | { type: 'discard-cards'; payload: DiscardCardsPayload }
  | { type: 'set-turn-order'; payload: SetTurnOrderPayload }
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
    console.log(`Connection opened: ${conn.id} to room ${this.room.id}`);
    // Don't send player list yet - wait for join-room or rejoin-room message
  }

  onClose(conn: Connection) {
    const player = this.state.players.find((p) => p.id === conn.id);
    if (!player) {
      console.log(`Connection closed for unknown player: ${conn.id}`);
      return;
    }

    console.log(`Player disconnected: ${player.name} (${conn.id})`);

    // Mark player as disconnected (don't remove them)
    player.connected = false;

    // Notify other players
    this.broadcastPlayerAction(conn.id, {
      type: 'player-disconnected',
      playerName: player.name,
    });

    // Broadcast updated player list (shows disconnected status)
    this.broadcastPlayerList();
    if (this.state.phase === 'playing') {
      this.broadcastGameState();
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
      case 'rejoin-room':
        this.handleRejoinRoom(conn, parsed.payload);
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
      case 'set-turn-order':
        this.handleSetTurnOrder(conn, parsed.payload);
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
    const isFirstPlayer = this.state.players.filter(p => p.connected).length === 0;

    if (this.state.phase !== 'lobby') {
      this.sendError(conn, 'Game already in progress');
      return;
    }

    if (this.state.players.length >= 5) {
      this.sendError(conn, 'Room is full (max 5 players)');
      return;
    }

    // Generate a unique reconnect token
    const reconnectToken = crypto.randomUUID();
    const player = createPlayer(conn.id, playerName, isFirstPlayer, reconnectToken);
    this.state.players.push(player);

    console.log(`${playerName} joined room ${this.room.id}`);

    // Send room confirmation to the joining player (include token for reconnection)
    this.sendToConnection(conn, {
      type: 'room-created',
      payload: { roomCode: this.room.id, playerId: conn.id, reconnectToken },
    });

    // Broadcast updated player list
    this.broadcastPlayerList();
  }

  private handleRejoinRoom(conn: Connection, payload: RejoinRoomPayload) {
    const { reconnectToken } = payload;

    // Find the player by their reconnect token
    const player = this.state.players.find((p) => p.reconnectToken === reconnectToken);

    if (!player) {
      this.sendError(conn, 'Invalid reconnect token');
      return;
    }

    // Note: We don't check player.connected here because WebSocket/TCP
    // doesn't detect abrupt disconnects immediately (app close, airplane mode).
    // The onClose handler may never fire, leaving the player marked as connected.
    // If they have a valid token, just let them reconnect - the old connection is stale.

    // Update player's connection ID and mark as connected
    const oldId = player.id;
    player.id = conn.id;
    player.connected = true;

    // Update currentTurn if it was this player's turn
    if (this.state.currentTurn?.playerId === oldId) {
      this.state.currentTurn.playerId = conn.id;
    }

    console.log(`${player.name} rejoined room ${this.room.id}`);

    // Send full game state to rejoining player
    this.sendToConnection(conn, {
      type: 'room-rejoined',
      payload: {
        playerId: conn.id,
        hand: player.hand,
        faceUpCards: this.state.faceUpCards,
        deckCount: this.state.deck.length,
        players: getPublicPlayerInfo(this.state.players),
        currentTurn: this.state.currentTurn,
        phase: this.state.phase,
      },
    });

    // Notify other players
    this.broadcastPlayerAction(conn.id, {
      type: 'player-reconnected',
      playerName: player.name,
    });

    // Broadcast updated player list
    this.broadcastPlayerList();
    if (this.state.phase === 'playing') {
      this.broadcastGameState();
    }
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

    // Validate turn action exclusivity - cannot claim route after drawing cards
    if (this.state.currentTurn?.cardsDrawn && this.state.currentTurn.cardsDrawn > 0) {
      this.sendError(conn, 'You cannot claim a route after drawing cards');
      return;
    }

    const player = this.state.players.find((p) => p.id === conn.id);
    if (!player) {
      this.sendError(conn, 'Player not found');
      return;
    }

    const result = discardCards(this.state, conn.id, cardIds);

    if (!result.success) {
      this.sendError(conn, result.error);
      return;
    }

    console.log(`${conn.id} discarded ${cardIds.length} cards`);

    // Build color breakdown
    const colorBreakdown: Record<string, number> = {};
    for (const card of result.cards) {
      colorBreakdown[card.color] = (colorBreakdown[card.color] || 0) + 1;
    }

    // Notify other players
    this.broadcastPlayerAction(conn.id, {
      type: 'discarded',
      playerName: player.name,
      count: cardIds.length,
      colorBreakdown,
    });

    // Track route claim
    if (this.state.currentTurn) {
      this.state.currentTurn.routesClaimed = 1;
    }

    // Auto-end turn after claiming a route
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

  private handleSetTurnOrder(conn: Connection, payload: SetTurnOrderPayload) {
    const { playerIds } = payload;

    // Verify sender is host
    const sender = this.state.players.find((p) => p.id === conn.id);
    if (!sender?.isHost) {
      this.sendError(conn, 'Only the host can set turn order');
      return;
    }

    // Verify game is in lobby
    if (this.state.phase !== 'lobby') {
      this.sendError(conn, 'Cannot change turn order after game starts');
      return;
    }

    // Verify all IDs are valid
    if (playerIds.length !== this.state.players.length) {
      this.sendError(conn, 'Invalid player list');
      return;
    }

    const playerMap = new Map(this.state.players.map((p) => [p.id, p]));
    const reordered = playerIds.map((id) => playerMap.get(id)).filter(Boolean);

    if (reordered.length !== this.state.players.length) {
      this.sendError(conn, 'Invalid player IDs');
      return;
    }

    // Reorder players
    this.state.players = reordered as typeof this.state.players;

    console.log(`Turn order updated by host in room ${this.room.id}`);

    // Broadcast updated player list
    this.broadcastPlayerList();
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
      type: 'drew-from-deck' | 'drew-face-up' | 'discarded' | 'turn-started' | 'player-disconnected' | 'player-reconnected';
      playerName: string;
      cardColor?: string;
      count?: number;
      colorBreakdown?: Record<string, number>;
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
