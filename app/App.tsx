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
  Image,
  Animated,
} from 'react-native';
import { config } from './src/config';
import {
  Card,
  CardColor,
  CurrentTurn,
  PublicPlayer,
  Screen,
  GameState,
  CARD_COLORS,
} from './src/types';
import { CARD_IMAGES } from './src/cardImages';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

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
  const width = isSmall ? 70 : 100;
  const height = isSmall ? 50 : 70;

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
          borderColor: selected ? '#fff' : 'transparent',
          borderWidth: selected ? 3 : 0,
          transform: selected ? [{ translateY: -10 }] : [],
        },
      ]}
    >
      <Image
        source={CARD_IMAGES[card.color]}
        style={[styles.cardImage, { width, height }]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
}

function HandGrid({
  cards,
  selectedCounts,
  onColorPress,
  discardMode,
}: {
  cards: Card[];
  selectedCounts: Record<CardColor, number>;
  onColorPress: (color: CardColor) => void;
  discardMode: boolean;
}) {
  // Group cards by color and count
  const colorCounts = cards.reduce((acc, card) => {
    acc[card.color] = (acc[card.color] || 0) + 1;
    return acc;
  }, {} as Record<CardColor, number>);

  // Get colors that have cards, maintaining a consistent order
  const colorOrder: CardColor[] = [
    'red', 'orange', 'yellow', 'green', 'blue',
    'purple', 'black', 'white', 'locomotive'
  ];
  const ownedColors = colorOrder.filter(color => colorCounts[color] > 0);

  return (
    <View>
      <Text style={styles.sectionLabel}>
        Your Hand ({cards.length} cards)
        {discardMode && ' - Tap to select'}
      </Text>
      <View style={styles.handGrid}>
        {ownedColors.map((color) => {
          const count = colorCounts[color];
          const selected = selectedCounts[color] || 0;
          const isSelected = selected > 0;

          return (
            <TouchableOpacity
              key={color}
              onPress={discardMode ? () => onColorPress(color) : undefined}
              disabled={!discardMode}
              activeOpacity={0.7}
              style={styles.handGridItem}
            >
              <View
                style={[
                  styles.handGridCard,
                  isSelected && styles.handGridCardSelected,
                ]}
              >
                <Image
                  source={CARD_IMAGES[color]}
                  style={styles.handGridImage}
                  resizeMode="cover"
                />
                {discardMode && isSelected && (
                  <View style={styles.selectedOverlay}>
                    <Text style={styles.selectedOverlayText}>
                      {selected}/{count}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.handGridCount}>
                {discardMode && selected > 0 ? `${selected}/${count}` : count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
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
              <CardComponent card={card} />
            </TouchableOpacity>
          );
        })}
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

function Toast({ message }: { message: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2500),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => setVisible(false));
    }
  }, [message, opacity]);

  if (!visible || !message) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]}>
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ============ SCREENS ============

function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  connecting,
}: {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (name: string, code: string) => void;
  connecting: boolean;
}) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (!playerName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    onCreateRoom(playerName.trim());
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
    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase());
  };

  if (mode === 'menu') {
    return (
      <View style={styles.screenContainer}>
        <Text style={styles.title}>Shuffle to Ride</Text>
        <Text style={styles.subtitle}>Train Card Companion</Text>

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
  const [selectedCounts, setSelectedCounts] = useState<Record<CardColor, number>>({} as Record<CardColor, number>);

  const isMyTurn =
    state.currentTurn?.playerId === state.mySocketId;
  const cardsDrawn = state.currentTurn?.cardsDrawn ?? 0;
  const canDraw = isMyTurn && cardsDrawn < 2 && !state.currentTurn?.drewLocomotive;
  const canDrawLocomotive = isMyTurn && cardsDrawn === 0;

  const currentPlayerName =
    state.players.find((p) => p.id === state.currentTurn?.playerId)?.name ??
    'Unknown';

  // Count cards by color for max selection limits
  const colorCounts = state.hand.reduce((acc, card) => {
    acc[card.color] = (acc[card.color] || 0) + 1;
    return acc;
  }, {} as Record<CardColor, number>);

  const handleColorPress = (color: CardColor) => {
    setSelectedCounts((prev) => {
      const current = prev[color] || 0;
      const max = colorCounts[color] || 0;
      // Increment, wrap to 0 if exceeding max
      const next = current >= max ? 0 : current + 1;
      return { ...prev, [color]: next };
    });
  };

  const handleConfirmDiscard = () => {
    // Convert selectedCounts to actual card IDs
    const cardIds: string[] = [];
    for (const [color, count] of Object.entries(selectedCounts)) {
      if (count > 0) {
        // Get card IDs for this color (take first 'count' cards)
        const colorCards = state.hand.filter(c => c.color === color);
        cardIds.push(...colorCards.slice(0, count).map(c => c.id));
      }
    }
    if (cardIds.length > 0) {
      onDiscard(cardIds);
      setSelectedCounts({} as Record<CardColor, number>);
      setDiscardMode(false);
    }
  };

  const totalSelected = Object.values(selectedCounts).reduce((sum, n) => sum + n, 0);

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
        {/* Draw area: Face-up cards on left, deck on right */}
        <Text style={styles.sectionLabel}>Draw Cards</Text>
        <View style={styles.drawArea}>
          <FaceUpDisplay
            cards={state.faceUpCards}
            onCardPress={onDrawFaceUp}
            canDraw={canDraw}
            canDrawLocomotive={canDrawLocomotive}
          />
          <DrawDeck
            deckCount={state.deckCount}
            onPress={onDrawDeck}
            disabled={!canDraw}
          />
        </View>

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
        <HandGrid
          cards={state.hand}
          selectedCounts={selectedCounts}
          onColorPress={handleColorPress}
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
                  Discard ({totalSelected})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setDiscardMode(false);
                  setSelectedCounts({} as Record<CardColor, number>);
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
  const socketRef = useRef<WebSocket | null>(null);
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastKeyRef = useRef(0);

  const formatActionMessage = useCallback((action: {
    type: string;
    playerName: string;
    cardColor?: string;
    count?: number;
  }): string => {
    switch (action.type) {
      case 'drew-from-deck':
        return `${action.playerName} drew a card`;
      case 'drew-face-up':
        return `${action.playerName} drew a ${action.cardColor} card`;
      case 'discarded':
        return `${action.playerName} discarded ${action.count} card${action.count !== 1 ? 's' : ''} to claim a route`;
      case 'turn-started':
        return `${action.playerName}'s turn`;
      default:
        return '';
    }
  }, []);

  const setupSocket = useCallback((roomCode: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    // Build PartyKit WebSocket URL: wss://project.user.partykit.dev/party/ROOMCODE
    const wsUrl = `${config.serverUrl}/party/${roomCode}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Connected to room:', roomCode);
      setState((s) => ({ ...s, connected: true }));
    };

    socket.onclose = (event) => {
      console.log('Disconnected', event.code, event.reason);
      setState((s) => ({
        ...s,
        connected: false,
        screen: 'home',
        roomCode: null,
      }));
      setConnecting(false);
    };

    socket.onerror = (error) => {
      console.log('WebSocket error:', error);
    };

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'room-created':
          setState((s) => ({ ...s, roomCode: payload.roomCode, mySocketId: payload.playerId, screen: 'lobby' }));
          setConnecting(false);
          break;

        case 'player-joined':
          setState((s) => ({ ...s, players: payload.players }));
          break;

        case 'game-started':
          setState((s) => ({
            ...s,
            screen: 'game',
            hand: payload.yourHand,
            faceUpCards: payload.faceUpCards,
          }));
          break;

        case 'game-state':
          setState((s) => ({
            ...s,
            faceUpCards: payload.faceUpCards,
            deckCount: payload.deckCount,
            players: payload.players,
            currentTurn: payload.currentTurn,
          }));
          break;

        case 'your-hand':
          setState((s) => ({ ...s, hand: payload.hand }));
          break;

        case 'player-action':
          const message = formatActionMessage(payload);
          if (message) {
            toastKeyRef.current += 1;
            setToastMessage(message);
          }
          break;

        case 'error':
          Alert.alert('Error', payload.message);
          break;
      }
    };

    socketRef.current = socket;
    return socket;
  }, [formatActionMessage]);

  const handleCreateRoom = useCallback(
    (playerName: string) => {
      setConnecting(true);
      const roomCode = generateRoomCode();
      const socket = setupSocket(roomCode);
      setState((s) => ({ ...s, playerName, isHost: true }));

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
          type: 'join-room',
          payload: { playerName }
        }));
      }, { once: true });
    },
    [setupSocket]
  );

  const handleJoinRoom = useCallback(
    (playerName: string, roomCode: string) => {
      setConnecting(true);
      const socket = setupSocket(roomCode.toUpperCase());
      setState((s) => ({ ...s, playerName, isHost: false }));

      socket.addEventListener('open', () => {
        socket.send(JSON.stringify({
          type: 'join-room',
          payload: { playerName }
        }));
      }, { once: true });
    },
    [setupSocket]
  );

  const handleStartGame = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'start-game' }));
  }, []);

  const handleDrawDeck = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'draw-from-deck' }));
  }, []);

  const handleDrawFaceUp = useCallback((index: number) => {
    socketRef.current?.send(JSON.stringify({ type: 'draw-face-up', payload: { index } }));
  }, []);

  const handleDiscard = useCallback((cardIds: string[]) => {
    socketRef.current?.send(JSON.stringify({ type: 'discard-cards', payload: { cardIds } }));
  }, []);

  const handleEndTurn = useCallback(() => {
    socketRef.current?.send(JSON.stringify({ type: 'end-turn' }));
  }, []);

  const handleLeave = useCallback(() => {
    Alert.alert('Leave', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          socketRef.current?.close();
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
      {state.screen === 'game' && (
        <Toast key={toastKeyRef.current} message={toastMessage} />
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
  drawArea: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  faceUpContainer: {
    flexDirection: 'column',
    gap: 6,
  },
  faceUpSlot: {
    padding: 2,
  },
  faceUpDisabled: {
    opacity: 0.5,
  },
  deckContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    flex: 1,
  },
  deckDisabled: {
    opacity: 0.5,
  },
  deckStack: {
    width: 60,
    height: 75,
    position: 'relative',
  },
  deckCard: {
    position: 'absolute',
    width: 45,
    height: 65,
    backgroundColor: '#34495e',
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCard3: { top: 0, left: 0 },
  deckCard2: { top: 3, left: 4 },
  deckCard1: { top: 6, left: 8 },
  deckQuestion: {
    color: '#95a5a6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  deckCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 6,
  },
  deckHint: {
    color: '#3498db',
    fontSize: 10,
    marginTop: 2,
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
  handGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 12,
  },
  handGridItem: {
    alignItems: 'center',
    width: '30%',
  },
  handGridCard: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  handGridCardSelected: {
    borderColor: '#27ae60',
  },
  handGridImage: {
    width: 100,
    height: 70,
    borderRadius: 5,
  },
  handGridCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(39, 174, 96, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlayText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardImage: {
    borderRadius: 8,
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
  toast: {
    position: 'absolute',
    bottom: 220,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    zIndex: 100,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
