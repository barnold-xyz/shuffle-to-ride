import { Card, CardColor, GameState, Player } from './types';

const REGULAR_COLORS: CardColor[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'black',
  'white',
];

const CARDS_PER_COLOR = 12;
const LOCOMOTIVE_COUNT = 14;
const INITIAL_HAND_SIZE = 4;
const FACE_UP_COUNT = 5;
const MAX_FACE_UP_LOCOMOTIVES = 2;

let cardIdCounter = 0;

function generateCardId(): string {
  return `card_${++cardIdCounter}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];

  // Add 12 of each regular color
  for (const color of REGULAR_COLORS) {
    for (let i = 0; i < CARDS_PER_COLOR; i++) {
      deck.push({ id: generateCardId(), color });
    }
  }

  // Add 14 locomotives
  for (let i = 0; i < LOCOMOTIVE_COUNT; i++) {
    deck.push({ id: generateCardId(), color: 'locomotive' });
  }

  return deck;
}

export function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function createPlayer(id: string, name: string, isHost: boolean): Player {
  return {
    id,
    name,
    hand: [],
    isHost,
  };
}

export function createGameState(roomCode: string): GameState {
  return {
    roomCode,
    phase: 'lobby',
    players: [],
    deck: [],
    faceUpCards: [],
    discardPile: [],
    currentTurn: null,
  };
}

export function dealInitialHands(state: GameState): void {
  // Create and shuffle the deck
  state.deck = shuffleDeck(createDeck());

  // Deal cards to each player
  for (const player of state.players) {
    for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
      const card = state.deck.pop();
      if (card) {
        player.hand.push(card);
      }
    }
  }

  // Deal face-up cards
  dealFaceUpCards(state);
}

export function dealFaceUpCards(state: GameState): void {
  while (state.faceUpCards.length < FACE_UP_COUNT && state.deck.length > 0) {
    const card = state.deck.pop();
    if (card) {
      state.faceUpCards.push(card);
    }
  }

  // Check for 3+ locomotives rule
  checkLocomotiveRefresh(state);
}

export function checkLocomotiveRefresh(state: GameState): void {
  const locomotiveCount = state.faceUpCards.filter(
    (card) => card.color === 'locomotive'
  ).length;

  if (locomotiveCount > MAX_FACE_UP_LOCOMOTIVES) {
    // Discard all face-up cards
    state.discardPile.push(...state.faceUpCards);
    state.faceUpCards = [];

    // Deal new face-up cards
    for (let i = 0; i < FACE_UP_COUNT && state.deck.length > 0; i++) {
      const card = state.deck.pop();
      if (card) {
        state.faceUpCards.push(card);
      }
    }

    // Recursively check again (unlikely but possible)
    checkLocomotiveRefresh(state);
  }
}

export function drawFromDeck(state: GameState, playerId: string): Card | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.deck.length === 0) {
    return null;
  }

  const card = state.deck.pop()!;
  player.hand.push(card);

  return card;
}

export function drawFaceUpCard(
  state: GameState,
  playerId: string,
  index: number
): { card: Card; isLocomotive: boolean } | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || index < 0 || index >= state.faceUpCards.length) {
    return null;
  }

  const card = state.faceUpCards[index];
  const isLocomotive = card.color === 'locomotive';

  // Remove the card from face-up
  state.faceUpCards.splice(index, 1);

  // Add to player's hand
  player.hand.push(card);

  // Replace with new card from deck
  if (state.deck.length > 0) {
    const newCard = state.deck.pop()!;
    state.faceUpCards.splice(index, 0, newCard);
  }

  // Check for 3+ locomotives
  checkLocomotiveRefresh(state);

  return { card, isLocomotive };
}

export function discardCards(
  state: GameState,
  playerId: string,
  cardIds: string[]
): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) {
    return false;
  }

  const cardsToDiscard: Card[] = [];

  for (const cardId of cardIds) {
    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) {
      return false; // Card not found in hand
    }
    cardsToDiscard.push(player.hand[cardIndex]);
  }

  // Remove cards from hand and add to discard pile
  for (const card of cardsToDiscard) {
    const index = player.hand.findIndex((c) => c.id === card.id);
    if (index !== -1) {
      player.hand.splice(index, 1);
      state.discardPile.push(card);
    }
  }

  return true;
}

export function reshuffleDiscardIntoDeck(state: GameState): void {
  if (state.discardPile.length > 0) {
    state.deck = shuffleDeck([...state.deck, ...state.discardPile]);
    state.discardPile = [];
  }
}

export function getNextPlayer(state: GameState): string | null {
  if (state.players.length === 0) return null;

  if (!state.currentTurn) {
    return state.players[0].id;
  }

  const currentIndex = state.players.findIndex(
    (p) => p.id === state.currentTurn!.playerId
  );
  const nextIndex = (currentIndex + 1) % state.players.length;
  return state.players[nextIndex].id;
}

export function startTurn(state: GameState, playerId: string): void {
  state.currentTurn = {
    playerId,
    cardsDrawn: 0,
    drewLocomotive: false,
  };
}

export function canDrawCard(state: GameState, playerId: string): boolean {
  if (!state.currentTurn || state.currentTurn.playerId !== playerId) {
    return false;
  }

  // If drew a face-up locomotive, turn is over
  if (state.currentTurn.drewLocomotive) {
    return false;
  }

  // Can draw up to 2 cards
  return state.currentTurn.cardsDrawn < 2;
}

export function canDrawFaceUpLocomotive(state: GameState, playerId: string): boolean {
  if (!state.currentTurn || state.currentTurn.playerId !== playerId) {
    return false;
  }

  // Can only draw face-up locomotive as first draw
  return state.currentTurn.cardsDrawn === 0;
}

export function isTurnComplete(state: GameState): boolean {
  if (!state.currentTurn) return true;

  return (
    state.currentTurn.cardsDrawn >= 2 || state.currentTurn.drewLocomotive
  );
}

export function getPublicPlayerInfo(
  players: Player[]
): Array<{ id: string; name: string; isHost: boolean; cardCount: number }> {
  return players.map((p) => ({
    id: p.id,
    name: p.name,
    isHost: p.isHost,
    cardCount: p.hand.length,
  }));
}
