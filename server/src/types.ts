export type CardColor =
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'blue'
  | 'purple'
  | 'black'
  | 'white'
  | 'locomotive';

export interface Card {
  id: string;
  color: CardColor;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isHost: boolean;
  reconnectToken: string;
  connected: boolean;
}

export interface CurrentTurn {
  playerId: string;
  cardsDrawn: number;
  drewLocomotive: boolean;
}

export interface GameState {
  roomCode: string;
  phase: 'lobby' | 'playing';
  players: Player[];
  deck: Card[];
  faceUpCards: Card[];
  discardPile: Card[];
  currentTurn: CurrentTurn | null;
}

// Client -> Server events
export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface RejoinRoomPayload {
  reconnectToken: string;
}

export interface DrawFaceUpPayload {
  index: number;
}

export interface DiscardCardsPayload {
  cardIds: string[];
}

// Server -> Client events
export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
  reconnectToken: string;
}

export interface RoomRejoinedPayload {
  playerId: string;
  hand: Card[];
  faceUpCards: Card[];
  deckCount: number;
  players: Array<{ id: string; name: string; isHost: boolean; cardCount: number; connected: boolean }>;
  currentTurn: CurrentTurn | null;
  phase: 'lobby' | 'playing';
}

export interface PlayerJoinedPayload {
  players: Array<{ id: string; name: string; isHost: boolean; cardCount: number; connected: boolean }>;
}

export interface GameStartedPayload {
  yourHand: Card[];
  faceUpCards: Card[];
}

export interface GameStatePayload {
  faceUpCards: Card[];
  deckCount: number;
  players: Array<{ id: string; name: string; isHost: boolean; cardCount: number; connected: boolean }>;
  currentTurn: CurrentTurn | null;
}

export interface YourHandPayload {
  hand: Card[];
}

export interface ErrorPayload {
  message: string;
}
