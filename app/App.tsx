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
import { LinearGradient } from 'expo-linear-gradient';
import { config } from './src/config';
import { THEME, TYPE, SPACING, RADIUS } from './src/theme';
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

// ============ DECORATIVE COMPONENTS ============

function DiamondDivider({ color = THEME.brass }: { color?: string }) {
  return (
    <View style={decorStyles.dividerContainer}>
      <View style={[decorStyles.dividerLine, { backgroundColor: color }]} />
      <View style={[decorStyles.diamond, { borderColor: color }]} />
      <View style={[decorStyles.dividerLine, { backgroundColor: color }]} />
    </View>
  );
}

function ArtDecoCorner({ position }: { position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' }) {
  const isRight = position === 'topRight' || position === 'bottomRight';
  const isBottom = position === 'bottomLeft' || position === 'bottomRight';

  return (
    <View
      style={[
        decorStyles.corner,
        isRight && decorStyles.cornerRight,
        isBottom && decorStyles.cornerBottom,
      ]}
    >
      <View
        style={[
          decorStyles.cornerLineH,
          isRight && decorStyles.cornerLineHRight,
        ]}
      />
      <View
        style={[
          decorStyles.cornerLineV,
          isBottom && decorStyles.cornerLineVBottom,
        ]}
      />
      <View
        style={[
          decorStyles.cornerDot,
          isRight && decorStyles.cornerDotRight,
          isBottom && decorStyles.cornerDotBottom,
        ]}
      />
    </View>
  );
}

function OrnateBox({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <LinearGradient
      colors={['rgba(107, 28, 35, 0.3)', 'rgba(74, 18, 25, 0.2)']}
      style={[decorStyles.ornateBox, style]}
    >
      <ArtDecoCorner position="topLeft" />
      <ArtDecoCorner position="topRight" />
      <ArtDecoCorner position="bottomLeft" />
      <ArtDecoCorner position="bottomRight" />
      {children}
    </LinearGradient>
  );
}

const decorStyles = StyleSheet.create({
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  diamond: {
    width: 8,
    height: 8,
    borderWidth: 1,
    transform: [{ rotate: '45deg' }],
    marginHorizontal: SPACING.md,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    top: 0,
    left: 0,
  },
  cornerRight: {
    left: undefined,
    right: 0,
  },
  cornerBottom: {
    top: undefined,
    bottom: 0,
  },
  cornerLineH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 16,
    height: 2,
    backgroundColor: THEME.brass,
  },
  cornerLineHRight: {
    left: undefined,
    right: 0,
  },
  cornerLineV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2,
    height: 16,
    backgroundColor: THEME.brass,
  },
  cornerLineVBottom: {
    top: undefined,
    bottom: 0,
  },
  cornerDot: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: THEME.brass,
  },
  cornerDotRight: {
    left: undefined,
    right: 6,
  },
  cornerDotBottom: {
    top: undefined,
    bottom: 6,
  },
  ornateBox: {
    borderWidth: 2,
    borderColor: THEME.brass,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    position: 'relative',
  },
});

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
          borderColor: selected ? THEME.brass : 'transparent',
          borderWidth: selected ? 3 : 2,
          transform: selected ? [{ translateY: -8 }, { scale: 1.02 }] : [],
        },
        selected && styles.cardSelected,
      ]}
    >
      <Image
        source={CARD_IMAGES[card.color]}
        style={[styles.cardImage, { width: width - 4, height: height - 4 }]}
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
  const colorCounts = cards.reduce((acc, card) => {
    acc[card.color] = (acc[card.color] || 0) + 1;
    return acc;
  }, {} as Record<CardColor, number>);

  const colorOrder: CardColor[] = [
    'red', 'orange', 'yellow', 'green', 'blue',
    'purple', 'black', 'white', 'locomotive'
  ];
  const ownedColors = colorOrder.filter(color => colorCounts[color] > 0);

  return (
    <View>
      <Text style={styles.handLabel}>
        Your Hand ({cards.length} cards)
        {discardMode && ' — Tap to select'}
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
                      {selected}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.handGridCount, isSelected && styles.handGridCountSelected]}>
                {discardMode && selected > 0 ? `${selected}/${count}` : `×${count}`}
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
      activeOpacity={0.7}
    >
      <View style={styles.deckStack}>
        <LinearGradient
          colors={[THEME.bgElevated, THEME.bgCard]}
          style={[styles.deckCard, styles.deckCard3]}
        />
        <LinearGradient
          colors={[THEME.bgElevated, THEME.bgCard]}
          style={[styles.deckCard, styles.deckCard2]}
        />
        <LinearGradient
          colors={[THEME.bgElevated, THEME.bgCard]}
          style={[styles.deckCard, styles.deckCard1]}
        >
          <Text style={styles.deckQuestion}>?</Text>
        </LinearGradient>
      </View>
      <Text style={styles.deckCount}>{deckCount} cards</Text>
      {!disabled && <Text style={styles.deckHint}>TAP TO DRAW</Text>}
    </TouchableOpacity>
  );
}

function Toast({ message }: { message: string | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timeout = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 2500);

      return () => clearTimeout(timeout);
    }
  }, [message, opacity, translateY]);

  if (!visible || !message) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.toastAccent} />
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
      <LinearGradient
        colors={[THEME.bgMid, THEME.bgDark]}
        style={styles.screenContainer}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Shuffle to Ride</Text>
          <Text style={styles.subtitle}>Train Card Companion</Text>
        </View>

        <DiamondDivider />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setMode('create')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[THEME.burgundy, THEME.burgundyDark]}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>Create Room</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setMode('join')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Join Room</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[THEME.bgMid, THEME.bgDark]}
      style={styles.screenContainer}
    >
      <Text style={styles.screenTitle}>
        {mode === 'create' ? 'Create Room' : 'Join Room'}
      </Text>

      <DiamondDivider color={THEME.border} />

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="Your Name"
          placeholderTextColor={THEME.textMuted}
          autoCapitalize="words"
        />

        {mode === 'join' && (
          <TextInput
            style={styles.input}
            value={roomCode}
            onChangeText={setRoomCode}
            placeholder="Room Code"
            placeholderTextColor={THEME.textMuted}
            autoCapitalize="characters"
            maxLength={4}
          />
        )}

        <TouchableOpacity
          style={[styles.primaryButton, connecting && styles.disabledButton]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={connecting}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={connecting ? [THEME.bgCard, THEME.bgMid] : [THEME.burgundy, THEME.burgundyDark]}
            style={styles.primaryButtonGradient}
          >
            <Text style={styles.primaryButtonText}>
              {connecting ? 'Connecting...' : mode === 'create' ? 'Create' : 'Join'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.textButton}
        onPress={() => setMode('menu')}
      >
        <Text style={styles.textButtonText}>Back</Text>
      </TouchableOpacity>
    </LinearGradient>
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
    <LinearGradient
      colors={[THEME.bgMid, THEME.bgDark]}
      style={styles.screenContainer}
    >
      <OrnateBox style={styles.roomCodeBox}>
        <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
        <Text style={styles.roomCodeText}>{roomCode}</Text>
        <Text style={styles.roomCodeHint}>Share this code with other players</Text>
      </OrnateBox>

      <DiamondDivider color={THEME.border} />

      <View style={styles.lobbyContent}>
        <Text style={styles.sectionTitle}>Passengers ({players.length}/5)</Text>
        <View style={styles.playerList}>
          {players.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <View style={styles.playerNameContainer}>
                <Text style={styles.playerName}>{player.name}</Text>
                {player.isHost && (
                  <View style={styles.hostBadge}>
                    <Text style={styles.hostBadgeText}>HOST</Text>
                  </View>
                )}
              </View>
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
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={players.length < 1 ? [THEME.bgCard, THEME.bgMid] : [THEME.burgundy, THEME.burgundyDark]}
              style={styles.primaryButtonGradient}
            >
              <Text style={styles.primaryButtonText}>
                {players.length < 1 ? 'Need 2+ Players' : 'Start Game'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Awaiting departure...</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.textButton} onPress={onLeave}>
        <Text style={styles.dangerText}>Leave Room</Text>
      </TouchableOpacity>
    </LinearGradient>
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
      <LinearGradient
        colors={isMyTurn
          ? [THEME.successLight, THEME.successFaint]
          : [THEME.bgMid, THEME.bgDark]
        }
        style={styles.turnBar}
      >
        <View>
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
        {isMyTurn && (
          <View style={styles.turnIndicator}>
            <View style={[styles.turnDot, styles.turnDotActive]} />
            <View style={[styles.turnDot, cardsDrawn >= 1 && styles.turnDotActive]} />
          </View>
        )}
      </LinearGradient>

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
        <View style={styles.playersPanel}>
          <Text style={styles.sectionLabel}>Passengers</Text>
          {state.players.map((player) => (
            <View
              key={player.id}
              style={[
                styles.playerInfoRow,
                player.id === state.currentTurn?.playerId &&
                  styles.playerInfoActive,
              ]}
            >
              <View style={styles.playerInfoLeft}>
                {player.id === state.currentTurn?.playerId && (
                  <View style={styles.activePlayerDot} />
                )}
                <Text style={styles.playerInfoName}>{player.name}</Text>
              </View>
              <Text style={styles.playerInfoCards}>{player.cardCount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Hand */}
      <LinearGradient
        colors={[THEME.bgCard, THEME.bgMid]}
        style={styles.handSection}
      >
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
                style={styles.actionButtonPrimary}
                onPress={handleConfirmDiscard}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.success, '#3A6C3E']}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonText}>
                    Discard ({totalSelected})
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButtonText}
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
                style={styles.actionButtonSecondary}
                onPress={() => setDiscardMode(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonSecondaryText}>Claim Route</Text>
              </TouchableOpacity>
              {isMyTurn && cardsDrawn > 0 && (
                <TouchableOpacity
                  style={styles.actionButtonWarning}
                  onPress={onEndTurn}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[THEME.warning, '#A66A12']}
                    style={styles.actionButtonGradient}
                  >
                    <Text style={styles.actionButtonText}>End Turn</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
                <Text style={styles.dangerText}>Leave</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>
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
      <StatusBar barStyle="light-content" backgroundColor={THEME.bgDark} />
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
  // Container styles
  container: {
    flex: 1,
    backgroundColor: THEME.bgDark,
  },
  screenContainer: {
    flex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Title styles
  titleContainer: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    ...TYPE.displayXL,
    color: THEME.brass,
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    ...TYPE.body,
    color: THEME.textSecondary,
    marginTop: SPACING.sm,
  },
  screenTitle: {
    ...TYPE.displayM,
    color: THEME.textPrimary,
    marginBottom: SPACING.sm,
  },

  // Button container
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },

  // Primary button (gradient with brass border)
  primaryButton: {
    width: '100%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.brass,
    overflow: 'hidden',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonGradient: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...TYPE.body,
    fontWeight: '600',
    color: THEME.textPrimary,
    letterSpacing: 0.5,
  },
  disabledButton: {
    borderColor: THEME.border,
    opacity: 0.7,
  },

  // Secondary button (outlined)
  secondaryButton: {
    width: '100%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.border,
    paddingVertical: SPACING.lg - 2,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    ...TYPE.body,
    fontWeight: '500',
    color: THEME.textSecondary,
  },

  // Text button (tertiary)
  textButton: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
  },
  textButtonText: {
    ...TYPE.bodyS,
    color: THEME.textMuted,
  },

  // Form styles
  formContainer: {
    width: '100%',
    gap: SPACING.lg,
  },
  input: {
    backgroundColor: THEME.bgMid,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    color: THEME.textPrimary,
    ...TYPE.body,
  },

  // Lobby styles
  roomCodeBox: {
    alignItems: 'center',
    width: '100%',
  },
  roomCodeLabel: {
    ...TYPE.caption,
    fontWeight: '600',
    color: THEME.textSecondary,
    letterSpacing: 2,
  },
  roomCodeText: {
    ...TYPE.displayL,
    color: THEME.brass,
    letterSpacing: 12,
    marginVertical: SPACING.sm,
  },
  roomCodeHint: {
    ...TYPE.caption,
    color: THEME.textMuted,
  },
  lobbyContent: {
    width: '100%',
    flex: 1,
  },
  sectionTitle: {
    ...TYPE.heading,
    color: THEME.textPrimary,
    marginBottom: SPACING.lg,
  },
  playerList: {
    width: '100%',
    marginBottom: SPACING.xl,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 35, 32, 0.8)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  playerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  playerName: {
    ...TYPE.body,
    fontWeight: '500',
    color: THEME.textPrimary,
  },
  hostBadge: {
    backgroundColor: THEME.brass,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  hostBadgeText: {
    ...TYPE.micro,
    fontWeight: '700',
    color: THEME.textInverse,
  },
  youLabel: {
    ...TYPE.bodyS,
    color: THEME.textMuted,
    fontStyle: 'italic',
  },
  waitingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  waitingText: {
    ...TYPE.body,
    color: THEME.textSecondary,
    fontStyle: 'italic',
  },
  dangerText: {
    ...TYPE.bodyS,
    color: THEME.danger,
  },
  // Game styles
  gameContainer: {
    flex: 1,
    backgroundColor: THEME.bgDark,
  },
  turnBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  turnText: {
    ...TYPE.bodyL,
    color: THEME.textPrimary,
  },
  drawCount: {
    ...TYPE.caption,
    color: THEME.textSecondary,
    marginTop: 2,
  },
  turnIndicator: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  turnDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  turnDotActive: {
    backgroundColor: THEME.brass,
    borderColor: THEME.brassLight,
  },
  gameScroll: {
    flex: 1,
    padding: SPACING.lg,
  },
  sectionLabel: {
    ...TYPE.caption,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: SPACING.sm,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawArea: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  faceUpContainer: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  faceUpSlot: {
    borderRadius: RADIUS.lg,
  },
  faceUpDisabled: {
    opacity: 0.5,
  },
  deckContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.bgCard,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  deckDisabled: {
    opacity: 0.5,
  },
  deckStack: {
    width: 60,
    height: 80,
    position: 'relative',
  },
  deckCard: {
    position: 'absolute',
    width: 50,
    height: 70,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckCard3: { top: 0, left: 0 },
  deckCard2: { top: 3, left: 4 },
  deckCard1: { top: 6, left: 8 },
  deckQuestion: {
    ...TYPE.heading,
    color: THEME.brass,
  },
  deckCount: {
    ...TYPE.bodyS,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: SPACING.sm,
  },
  deckHint: {
    ...TYPE.micro,
    color: THEME.brass,
    letterSpacing: 1,
    marginTop: SPACING.xs,
  },
  // Players panel
  playersPanel: {
    backgroundColor: THEME.bgCard,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  playerInfoActive: {
    backgroundColor: 'rgba(201, 162, 39, 0.15)',
  },
  playerInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  activePlayerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.brass,
  },
  playerInfoName: {
    ...TYPE.bodyS,
    color: THEME.textPrimary,
  },
  playerInfoCards: {
    ...TYPE.bodyS,
    color: THEME.textSecondary,
  },
  // Hand section
  handSection: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  handLabel: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textSecondary,
    marginBottom: SPACING.md,
  },
  handGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  handGridItem: {
    alignItems: 'center',
    width: '30%',
  },
  handGridCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  handGridCardSelected: {
    borderColor: THEME.brass,
    shadowColor: THEME.brass,
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  handGridImage: {
    width: 100,
    height: 70,
  },
  handGridCount: {
    ...TYPE.bodyS,
    fontWeight: '700',
    color: THEME.textPrimary,
    marginTop: SPACING.xs,
  },
  handGridCountSelected: {
    color: THEME.brass,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(74, 124, 78, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedOverlayText: {
    ...TYPE.heading,
    color: THEME.textPrimary,
  },
  // Card styles
  card: {
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderColor: 'transparent',
    borderWidth: 2,
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  cardSelected: {
    shadowColor: THEME.brass,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  cardImage: {
    borderRadius: RADIUS.md,
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  actionButtonPrimary: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  actionButtonSecondary: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.bgCard,
  },
  actionButtonSecondaryText: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textSecondary,
  },
  actionButtonWarning: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  actionButtonText: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  cancelText: {
    ...TYPE.bodyS,
    color: THEME.textMuted,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  leaveButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  // Toast
  toast: {
    position: 'absolute',
    bottom: 220,
    left: SPACING.lg,
    right: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 21, 18, 0.95)',
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  toastAccent: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: THEME.brass,
  },
  toastText: {
    ...TYPE.bodyS,
    color: THEME.textPrimary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    flex: 1,
  },
});
