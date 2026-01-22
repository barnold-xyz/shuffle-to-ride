import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import {
  Card,
  CardColor,
  CurrentTurn,
  PublicPlayer,
  Screen,
  GameState,
  CARD_COLORS,
} from './src/types';

// ============ COMPONENTS ============

function CardComponent({
  card,
  selected,
  onPress,
  size = 'normal',
}: {
  card: Card;
  selected?: boolean;
  onPress?: () => void;
  size?: 'normal' | 'small';
}) {
  const isSmall = size === 'small';
  const width = isSmall ? 50 : 70;
  const height = isSmall ? 70 : 100;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          width,
          height,
          backgroundColor: CARD_COLORS[card.color],
          borderColor: selected ? '#fff' : 'rgba(0,0,0,0.3)',
          borderWidth: selected ? 3 : 2,
          transform: selected ? [{ translateY: -10 }] : [],
        },
      ]}
    >
      {card.color === 'locomotive' && (
        <Text style={styles.locomotiveText}>W</Text>
      )}
    </TouchableOpacity>
  );
}

function Hand({
  cards,
  selectedIds,
  onCardPress,
  discardMode,
}: {
  cards: Card[];
  selectedIds: string[];
  onCardPress: (id: string) => void;
  discardMode: boolean;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>
        Your Hand ({cards.length} cards)
        {discardMode && ' - Tap cards to select'}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.handContainer}
      >
        {cards.map((card) => (
          <CardComponent
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            onPress={discardMode ? () => onCardPress(card.id) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FaceUpDisplay({
  cards,
  onCardPress,
  canDraw,
  canDrawLocomotive,
}: {
  cards: Card[];
  onCardPress: (index: number) => void;
  canDraw: boolean;
  canDrawLocomotive: boolean;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>Face-Up Cards (tap to draw)</Text>
      <View style={styles.faceUpContainer}>
        {cards.map((card, index) => {
          const isLoco = card.color === 'locomotive';
          const canTake = canDraw && (canDrawLocomotive || !isLoco);
          return (
            <TouchableOpacity
              key={card.id}
              onPress={() => canTake && onCardPress(index)}
              disabled={!canTake}
              style={[styles.faceUpSlot, !canTake && styles.faceUpDisabled]}
            >
              <CardComponent card={card} size="small" />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function DrawDeck({
  deckCount,
  onPress,
  disabled,
}: {
  deckCount: number;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.deckContainer, disabled && styles.deckDisabled]}
    >
      <View style={styles.deckStack}>
        <View style={[styles.deckCard, styles.deckCard3]} />
        <View style={[styles.deckCard, styles.deckCard2]} />
        <View style={[styles.deckCard, styles.deckCard1]}>
          <Text style={styles.deckQuestion}>?</Text>
        </View>
      </View>
      <Text style={styles.deckCount}>{deckCount} cards</Text>
      {!disabled && <Text style={styles.deckHint}>Tap to draw</Text>}
    </TouchableOpacity>
  );
}

// ============ SCREENS ============

function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  connecting,
}: {
  onCreateRoom: (name: string, serverUrl: string) => void;
  onJoinRoom: (name: string, code: string, serverUrl: string) => void;
  connecting: boolean;
}) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [serverUrl, setServerUrl] = useState('http://192.168.1.157:3000');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    onCreateRoom(playerName.trim(), serverUrl);
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      Alert.alert('Error', 'Please enter room code');
      return;
    }
    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase(), serverUrl);
  };

  if (mode === 'menu') {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Shuffle to Ride</Text>
        <Text style={styles.subtitle}>Train Card Companion</Text>

        <View style={styles.serverUrlContainer}>
          <Text style={styles.inputLabel}>Server URL:</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.100:3000"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setMode('create')}
        >
          <Text style={styles.buttonText}>Create Room</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setMode('join')}
        >
          <Text style={styles.buttonText}>Join Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.title}>
        {mode === 'create' ? 'Create Room' : 'Join Room'}
      </Text>

      <TextInput
        style={styles.input}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Your Name"
        placeholderTextColor="#666"
        autoCapitalize="words"
      />

      {mode === 'join' && (
        <TextInput
          style={styles.input}
          value={roomCode}
          onChangeText={setRoomCode}
          placeholder="Room Code"
          placeholderTextColor="#666"
          autoCapitalize="characters"
          maxLength={4}
        />
      )}

      <TouchableOpacity
        style={[styles.primaryButton, connecting && styles.disabledButton]}
        onPress={mode === 'create' ? handleCreate : handleJoin}
        disabled={connecting}
      >
        <Text style={styles.buttonText}>
          {connecting ? 'Connecting...' : mode === 'create' ? 'Create' : 'Join'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setMode('menu')}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

function LobbyScreen({
  roomCode,
  players,
  isHost,
  playerName,
  onStartGame,
  onLeave,
}: {
  roomCode: string;
  players: PublicPlayer[];
  isHost: boolean;
  playerName: string;
  onStartGame: () => void;
  onLeave: () => void;
}) {
  return (
    <View style={styles.screenContainer}>
      <View style={styles.roomCodeBox}>
        <Text style={styles.roomCodeLabel}>Room Code</Text>
        <Text style={styles.roomCodeText}>{roomCode}</Text>
        <Text style={styles.roomCodeHint}>Share this with other players</Text>
      </View>

      <Text style={styles.sectionTitle}>Players ({players.length}/5)</Text>
      <View style={styles.playerList}>
        {players.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <Text style={styles.playerName}>
              {player.name}
              {player.isHost && ' (Host)'}
            </Text>
            {player.name === playerName && (
              <Text style={styles.youLabel}>You</Text>
            )}
          </View>
        ))}
      </View>

      {isHost ? (
        <TouchableOpacity
          style={[
            styles.primaryButton,
            players.length < 1 && styles.disabledButton,
          ]}
          onPress={onStartGame}
          disabled={players.length < 1}
        >
          <Text style={styles.buttonText}>
            {players.length < 1 ? 'Need 2+ Players' : 'Start Game'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.waitingText}>Waiting for host to start...</Text>
      )}

      <TouchableOpacity style={styles.backButton} onPress={onLeave}>
        <Text style={styles.leaveText}>Leave Room</Text>
      </TouchableOpacity>
    </View>
  );
}

function GameScreen({
  state,
  onDrawDeck,
  onDrawFaceUp,
  onDiscard,
  onEndTurn,
  onLeave,
}: {
  state: GameState;
  onDrawDeck: () => void;
  onDrawFaceUp: (index: number) => void;
  onDiscard: (cardIds: string[]) => void;
  onEndTurn: () => void;
  onLeave: () => void;
}) {
  const [discardMode, setDiscardMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isMyTurn =
    state.currentTurn?.playerId === state.mySocketId;
  const cardsDrawn = state.currentTurn?.cardsDrawn ?? 0;
  const canDraw = isMyTurn && cardsDrawn < 2 && !state.currentTurn?.drewLocomotive;
  const canDrawLocomotive = isMyTurn && cardsDrawn === 0;

  const currentPlayerName =
    state.players.find((p) => p.id === state.currentTurn?.playerId)?.name ??
    'Unknown';

  const handleCardPress = (cardId: string) => {
    setSelectedIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleConfirmDiscard = () => {
    if (selectedIds.length > 0) {
      onDiscard(selectedIds);
      setSelectedIds([]);
      setDiscardMode(false);
    }
  };

  return (
    <View style={styles.gameContainer}>
      {/* Turn indicator */}
      <View style={[styles.turnBar, isMyTurn && styles.turnBarActive]}>
        <Text style={styles.turnText}>
          {isMyTurn ? 'Your Turn' : `${currentPlayerName}'s Turn`}
        </Text>
        {isMyTurn && (
          <Text style={styles.drawCount}>
            Drawn: {cardsDrawn}/2
            {state.currentTurn?.drewLocomotive && ' (locomotive)'}
          </Text>
        )}
      </View>

      <ScrollView style={styles.gameScroll}>
        {/* Face-up cards */}
        <FaceUpDisplay
          cards={state.faceUpCards}
          onCardPress={onDrawFaceUp}
          canDraw={canDraw}
          canDrawLocomotive={canDrawLocomotive}
        />

        {/* Draw deck */}
        <DrawDeck
          deckCount={state.deckCount}
          onPress={onDrawDeck}
          disabled={!canDraw}
        />

        {/* Players info */}
        <View style={styles.playersInfo}>
          <Text style={styles.sectionLabel}>Players</Text>
          {state.players.map((player) => (
            <View
              key={player.id}
              style={[
                styles.playerInfoRow,
                player.id === state.currentTurn?.playerId &&
                  styles.playerInfoActive,
              ]}
            >
              <Text style={styles.playerInfoName}>{player.name}</Text>
              <Text style={styles.playerInfoCards}>{player.cardCount} cards</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Hand */}
      <View style={styles.handSection}>
        <Hand
          cards={state.hand}
          selectedIds={selectedIds}
          onCardPress={handleCardPress}
          discardMode={discardMode}
        />

        {/* Actions */}
        <View style={styles.actionRow}>
          {discardMode ? (
            <>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmDiscard}
              >
                <Text style={styles.buttonText}>
                  Discard ({selectedIds.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDiscardMode(false);
                  setSelectedIds([]);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={() => setDiscardMode(true)}
              >
                <Text style={styles.buttonText}>Claim Route</Text>
              </TouchableOpacity>
              {isMyTurn && cardsDrawn > 0 && (
                <TouchableOpacity style={styles.endTurnButton} onPress={onEndTurn}>
                  <Text style={styles.buttonText}>End Turn</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
                <Text style={styles.leaveText}>Leave</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ============ MAIN APP ============

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<GameState>({
    screen: 'home',
    roomCode: null,
    connected: false,
    players: [],
    hand: [],
    faceUpCards: [],
    deckCount: 0,
    currentTurn: null,
    error: null,
    isHost: false,
    playerName: '',
    mySocketId: null,
  });
  const [connecting, setConnecting] = useState(false);

  const setupSocket = useCallback((serverUrl: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io(serverUrl, {
      transports: ['websocket'],
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('Connected:', socket.id);
      setState((s) => ({ ...s, connected: true, mySocketId: socket.id ?? null }));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected');
      setState((s) => ({
        ...s,
        connected: false,
        screen: 'home',
        roomCode: null,
      }));
      setConnecting(false);
    });

    socket.on('room-created', ({ roomCode }: { roomCode: string }) => {
      setState((s) => ({ ...s, roomCode, screen: 'lobby' }));
      setConnecting(false);
    });

    socket.on('player-joined', ({ players }: { players: PublicPlayer[] }) => {
      setState((s) => ({ ...s, players }));
    });

    socket.on(
      'game-started',
      ({ yourHand, faceUpCards }: { yourHand: Card[]; faceUpCards: Card[] }) => {
        setState((s) => ({
          ...s,
          screen: 'game',
          hand: yourHand,
          faceUpCards,
        }));
      }
    );

    socket.on(
      'game-state',
      (payload: {
        faceUpCards: Card[];
        deckCount: number;
        players: PublicPlayer[];
        currentTurn: CurrentTurn | null;
      }) => {
        setState((s) => ({
          ...s,
          faceUpCards: payload.faceUpCards,
          deckCount: payload.deckCount,
          players: payload.players,
          currentTurn: payload.currentTurn,
        }));
      }
    );

    socket.on('your-hand', ({ hand }: { hand: Card[] }) => {
      setState((s) => ({ ...s, hand }));
    });

    socket.on('error', ({ message }: { message: string }) => {
      Alert.alert('Error', message);
    });

    socketRef.current = socket;
    return socket;
  }, []);

  const handleCreateRoom = useCallback(
    (playerName: string, serverUrl: string) => {
      setConnecting(true);
      const socket = setupSocket(serverUrl);
      setState((s) => ({ ...s, playerName, isHost: true }));

      socket.on('connect', () => {
        socket.emit('create-room', { playerName });
      });
    },
    [setupSocket]
  );

  const handleJoinRoom = useCallback(
    (playerName: string, roomCode: string, serverUrl: string) => {
      setConnecting(true);
      const socket = setupSocket(serverUrl);
      setState((s) => ({ ...s, playerName, isHost: false }));

      socket.on('connect', () => {
        socket.emit('join-room', { roomCode, playerName });
      });
    },
    [setupSocket]
  );

  const handleStartGame = useCallback(() => {
    socketRef.current?.emit('start-game');
  }, []);

  const handleDrawDeck = useCallback(() => {
    socketRef.current?.emit('draw-from-deck');
  }, []);

  const handleDrawFaceUp = useCallback((index: number) => {
    socketRef.current?.emit('draw-face-up', { index });
  }, []);

  const handleDiscard = useCallback((cardIds: string[]) => {
    socketRef.current?.emit('discard-cards', { cardIds });
  }, []);

  const handleEndTurn = useCallback(() => {
    socketRef.current?.emit('end-turn');
  }, []);

  const handleLeave = useCallback(() => {
    Alert.alert('Leave', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          socketRef.current?.disconnect();
          setState({
            screen: 'home',
            roomCode: null,
            connected: false,
            players: [],
            hand: [],
            faceUpCards: [],
            deckCount: 0,
            currentTurn: null,
            error: null,
            isHost: false,
            playerName: '',
            mySocketId: null,
          });
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      {state.screen === 'home' && (
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          connecting={connecting}
        />
      )}
      {state.screen === 'lobby' && state.roomCode && (
        <LobbyScreen
          roomCode={state.roomCode}
          players={state.players}
          isHost={state.isHost}
          playerName={state.playerName}
          onStartGame={handleStartGame}
          onLeave={handleLeave}
        />
      )}
      {state.screen === 'game' && (
        <GameScreen
          state={state}
          onDrawDeck={handleDrawDeck}
          onDrawFaceUp={handleDrawFaceUp}
          onDiscard={handleDiscard}
          onEndTurn={handleEndTurn}
          onLeave={handleLeave}
        />
      )}
    </SafeAreaView>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  screenContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#95a5a6',
    marginBottom: 48,
  },
  serverUrlContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    color: '#95a5a6',
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#27ae60',
    borderRadius: 8,
    padding: 16,
    width: '100%',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#2c3e50',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 24,
    padding: 12,
  },
  backButtonText: {
    color: '#95a5a6',
    fontSize: 16,
  },
  roomCodeBox: {
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  roomCodeLabel: {
    color: '#95a5a6',
    fontSize: 14,
  },
  roomCodeText: {
    color: '#3498db',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 12,
  },
  roomCodeHint: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  playerList: {
    width: '100%',
    marginBottom: 24,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
  },
  youLabel: {
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  waitingText: {
    color: '#95a5a6',
    fontSize: 16,
    marginTop: 16,
  },
  leaveText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  // Game styles
  gameContainer: {
    flex: 1,
  },
  turnBar: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    alignItems: 'center',
  },
  turnBarActive: {
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
  },
  turnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawCount: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 4,
  },
  gameScroll: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  faceUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  faceUpSlot: {
    padding: 4,
  },
  faceUpDisabled: {
    opacity: 0.5,
  },
  deckContainer: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    marginBottom: 24,
  },
  deckDisabled: {
    opacity: 0.5,
  },
  deckStack: {
    width: 80,
    height: 100,
    position: 'relative',
  },
  deckCard: {
    position: 'absolute',
    width: 60,
    height: 85,
    backgroundColor: '#34495e',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCard3: { top: 0, left: 0 },
  deckCard2: { top: 4, left: 6 },
  deckCard1: { top: 8, left: 12 },
  deckQuestion: {
    color: '#95a5a6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  deckCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  deckHint: {
    color: '#3498db',
    fontSize: 11,
    marginTop: 4,
  },
  playersInfo: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  playerInfoActive: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },
  playerInfoName: {
    color: '#fff',
    fontSize: 14,
  },
  playerInfoCards: {
    color: '#95a5a6',
    fontSize: 14,
  },
  handSection: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  handContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  card: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locomotiveText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  discardButton: {
    backgroundColor: '#9b59b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  endTurnButton: {
    backgroundColor: '#e67e22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmButton: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#95a5a6',
    fontSize: 14,
  },
  leaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
