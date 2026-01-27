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

export interface CurrentTurn {
  playerId: string;
  cardsDrawn: number;
  drewLocomotive: boolean;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isHost: boolean;
  cardCount: number;
  connected: boolean;
}

export type Screen = 'home' | 'lobby' | 'game';

export interface GameState {
  screen: Screen;
  roomCode: string | null;
  connected: boolean;
  players: PublicPlayer[];
  hand: Card[];
  faceUpCards: Card[];
  deckCount: number;
  currentTurn: CurrentTurn | null;
  error: string | null;
  isHost: boolean;
  playerName: string;
  mySocketId: string | null;
}

export const CARD_COLORS: Record<CardColor, string> = {
  red: '#e74c3c',
  orange: '#e67e22',
  yellow: '#f1c40f',
  green: '#27ae60',
  blue: '#3498db',
  purple: '#9b59b6',
  black: '#2c3e50',
  white: '#ecf0f1',
  locomotive: '#1abc9c',
};
