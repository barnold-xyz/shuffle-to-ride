import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Animated,
  Modal,
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
import { saveGameSession, getGameSession, clearGameSession, SavedGameSession } from './src/storage';

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
          isBottom && decorStyles.cornerLineHBottom,
        ]}
      />
      <View
        style={[
          decorStyles.cornerLineV,
          isRight && decorStyles.cornerLineVRight,
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
      {children}
    </LinearGradient>
  );
}

// Themed Alert Component
interface ThemedAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface ThemedAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: ThemedAlertButton[];
  onDismiss: () => void;
}

function ThemedAlert({ visible, title, message, buttons, onDismiss }: ThemedAlertProps) {
  const alertButtons = buttons || [{ text: 'OK', onPress: onDismiss }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.container}>
          <LinearGradient
            colors={[THEME.bgElevated, THEME.bgCard]}
            style={alertStyles.content}
          >
            <View style={alertStyles.header}>
              <View style={alertStyles.headerLine} />
              <Text style={alertStyles.headerText}>NOTICE</Text>
              <View style={alertStyles.headerLine} />
            </View>

            <Text style={alertStyles.title}>{title}</Text>
            {message && <Text style={alertStyles.message}>{message}</Text>}

            <View style={alertStyles.buttonRow}>
              {alertButtons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      alertStyles.button,
                      isCancel && alertStyles.buttonCancel,
                      isDestructive && alertStyles.buttonDestructive,
                    ]}
                    onPress={() => {
                      button.onPress?.();
                      onDismiss();
                    }}
                    activeOpacity={0.8}
                  >
                    {isDestructive ? (
                      <LinearGradient
                        colors={[THEME.danger, THEME.dangerDark]}
                        style={alertStyles.buttonGradient}
                      >
                        <Text style={alertStyles.buttonText}>{button.text}</Text>
                      </LinearGradient>
                    ) : isCancel ? (
                      <Text style={alertStyles.buttonTextCancel}>{button.text}</Text>
                    ) : (
                      <LinearGradient
                        colors={[THEME.burgundy, THEME.burgundyDark]}
                        style={alertStyles.buttonGradient}
                      >
                        <Text style={alertStyles.buttonText}>{button.text}</Text>
                      </LinearGradient>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={alertStyles.footer}>
              <Text style={alertStyles.footerText}>═══ ◆ ═══</Text>
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 9, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: THEME.brass,
    overflow: 'hidden',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 16,
  },
  content: {
    padding: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.brass,
  },
  headerText: {
    ...TYPE.micro,
    fontWeight: '700',
    color: THEME.brass,
    letterSpacing: 2,
    marginHorizontal: SPACING.md,
  },
  title: {
    ...TYPE.heading,
    color: THEME.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    ...TYPE.body,
    color: THEME.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    justifyContent: 'center',
  },
  button: {
    flex: 1,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.4)',
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderColor: THEME.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  buttonDestructive: {
    borderColor: THEME.danger,
  },
  buttonGradient: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  buttonText: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  buttonTextCancel: {
    ...TYPE.bodyS,
    fontWeight: '500',
    color: THEME.textMuted,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    ...TYPE.caption,
    color: THEME.brass,
    letterSpacing: 2,
  },
});

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
    top: -1,
    left: -1,
    width: 18,
    height: 2,
    backgroundColor: THEME.brass,
  },
  cornerLineHRight: {
    left: undefined,
    right: -1,
  },
  cornerLineHBottom: {
    top: undefined,
    bottom: -1,
  },
  cornerLineV: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 2,
    height: 18,
    backgroundColor: THEME.brass,
  },
  cornerLineVRight: {
    left: undefined,
    right: -1,
  },
  cornerLineVBottom: {
    top: undefined,
    bottom: -1,
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

function Toast({ message, duration = 2500 }: { message: string | null; duration?: number }) {
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
      }, duration);

      return () => clearTimeout(timeout);
    }
  }, [message, duration, opacity, translateY]);

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
      <View style={styles.toastHeader}>
        <View style={styles.toastHeaderLine} />
        <Text style={styles.toastHeaderText}>DISPATCH</Text>
        <View style={styles.toastHeaderLine} />
      </View>
      <Text style={styles.toastText}>{message}</Text>
      <View style={styles.toastFooter}>
        <Text style={styles.toastFooterText}>═══ END ═══</Text>
      </View>
    </Animated.View>
  );
}

// ============ SCREENS ============

function HomeScreen({
  onCreateRoom,
  onJoinRoom,
  onRejoinRoom,
  onDismissSavedSession,
  connecting,
  savedSession,
  showAlert,
}: {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (name: string, code: string) => void;
  onRejoinRoom: () => void;
  onDismissSavedSession: () => void;
  connecting: boolean;
  savedSession: SavedGameSession | null;
  showAlert: (title: string, message?: string, buttons?: ThemedAlertButton[]) => void;
}) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const handleCreate = () => {
    if (!playerName.trim()) {
      showAlert('Missing Name', 'Please enter your name');
      return;
    }
    onCreateRoom(playerName.trim());
  };

  const handleJoin = () => {
    if (!playerName.trim()) {
      showAlert('Missing Name', 'Please enter your name');
      return;
    }
    if (!roomCode.trim()) {
      showAlert('Missing Code', 'Please enter room code');
      return;
    }
    onJoinRoom(playerName.trim(), roomCode.trim().toUpperCase());
  };

  if (mode === 'menu') {
    return (
      <LinearGradient
        colors={[THEME.bgMid, THEME.bgDark]}
        style={[styles.screenContainer, styles.homeContainer]}
      >
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Shuffle to Ride</Text>
          <Text style={styles.subtitle}>Train Card Companion</Text>
        </View>

        <DiamondDivider />

        <View style={styles.buttonContainer}>
          {savedSession && (
            <View style={styles.rejoinContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onRejoinRoom}
                disabled={connecting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={connecting ? [THEME.bgCard, THEME.bgMid] : [THEME.success, '#3A6C3E']}
                  style={styles.primaryButtonGradient}
                >
                  <Text style={styles.primaryButtonText}>
                    {connecting ? 'Reconnecting...' : `Rejoin Room ${savedSession.roomCode}`}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.textButton}
                onPress={onDismissSavedSession}
              >
                <Text style={styles.textButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}

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
      style={[styles.screenContainer, styles.homeContainer]}
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
      style={[styles.screenContainer, styles.lobbyContainer]}
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
    <LinearGradient
      colors={[THEME.bgMid, THEME.bgDark]}
      style={styles.gameContainer}
    >
      {/* Turn indicator */}
      <LinearGradient
        colors={[THEME.bgElevated, THEME.bgMid]}
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
        {/* Draw area: Face-up cards on left, deck and players stacked on right */}
        <Text style={styles.sectionLabel}>Draw Cards</Text>
        <View style={styles.drawArea}>
          <FaceUpDisplay
            cards={state.faceUpCards}
            onCardPress={onDrawFaceUp}
            canDraw={canDraw}
            canDrawLocomotive={canDrawLocomotive}
          />
          <View style={styles.deckAndPlayersColumn}>
            <DrawDeck
              deckCount={state.deckCount}
              onPress={onDrawDeck}
              disabled={!canDraw}
            />
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
                    player.connected === false && styles.playerInfoDisconnected,
                  ]}
                >
                  <View style={styles.playerInfoLeft}>
                    {player.id === state.currentTurn?.playerId && (
                      <View style={styles.activePlayerDot} />
                    )}
                    <Text style={[
                      styles.playerInfoName,
                      player.connected === false && styles.playerInfoNameDisconnected,
                    ]}>
                      {player.name}
                    </Text>
                    {player.connected === false && (
                      <Text style={styles.disconnectedBadge}>OFFLINE</Text>
                    )}
                  </View>
                  <Text style={styles.playerInfoCards}>{player.cardCount}</Text>
                </View>
              ))}
            </View>
          </View>
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
                style={styles.discardButton}
                onPress={handleConfirmDiscard}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.success, '#3A6C3E']}
                  style={styles.discardButtonGradient}
                >
                  <Text style={styles.discardButtonText}>
                    Discard ({totalSelected})
                  </Text>
                </LinearGradient>
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
                style={styles.claimRouteButton}
                onPress={() => setDiscardMode(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[THEME.burgundy, THEME.burgundyDark]}
                  style={styles.claimRouteGradient}
                >
                  <Text style={styles.claimRouteText}>Claim Route</Text>
                </LinearGradient>
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
    </LinearGradient>
  );
}

// ============ MAIN APP ============

export default function App() {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTokenRef = useRef<string | null>(null);
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
  const [toast, setToast] = useState<{ message: string; duration: number } | null>(null);
  const toastKeyRef = useRef(0);
  const [savedSession, setSavedSession] = useState<SavedGameSession | null>(null);

  // Alert state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: ThemedAlertButton[];
  }>({ visible: false, title: '' });

  const showAlert = useCallback((
    title: string,
    message?: string,
    buttons?: ThemedAlertButton[]
  ) => {
    setAlertConfig({ visible: true, title, message, buttons });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  // Check for saved session on mount
  useEffect(() => {
    getGameSession().then((session) => {
      if (session) {
        setSavedSession(session);
      }
    });
  }, []);

  const formatActionMessage = useCallback((action: {
    type: string;
    playerName: string;
    cardColor?: string;
    count?: number;
    colorBreakdown?: Record<string, number>;
  }): { message: string; duration: number } | null => {
    const COLOR_ORDER = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white', 'locomotive'];

    switch (action.type) {
      case 'drew-from-deck':
        return { message: `${action.playerName} drew a card`, duration: 3000 };
      case 'drew-face-up':
        return { message: `${action.playerName} drew a ${action.cardColor} card`, duration: 3000 };
      case 'discarded': {
        let breakdown = '';
        if (action.colorBreakdown) {
          const parts: string[] = [];
          for (const color of COLOR_ORDER) {
            const count = action.colorBreakdown[color];
            if (count) {
              parts.push(`${count} ${color}`);
            }
          }
          breakdown = parts.join(', ');
        }
        const message = breakdown
          ? `${action.playerName} claimed a route with ${action.count} cards (${breakdown})`
          : `${action.playerName} claimed a route with ${action.count} card${action.count !== 1 ? 's' : ''}`;
        return { message, duration: 8000 };
      }
      case 'turn-started':
        return { message: `${action.playerName}'s turn`, duration: 5000 };
      case 'player-disconnected':
        return { message: `${action.playerName} disconnected`, duration: 5000 };
      case 'player-reconnected':
        return { message: `${action.playerName} reconnected`, duration: 5000 };
      default:
        return null;
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
      // Ignore close events from stale sockets (we've already moved to a new connection)
      if (socketRef.current !== socket) return;
      console.log('Disconnected', event.code, event.reason);
      setState((s) => ({
        ...s,
        connected: false,
        screen: 'home',
        roomCode: null,
      }));
      setConnecting(false);
    };

    socket.onerror = () => {
      // Ignore error events from stale sockets (we've already moved to a new connection)
      if (socketRef.current !== socket) return;
      showAlert('Connection Error', 'Failed to connect to game server');
      setConnecting(false);
    };

    socket.onmessage = (event) => {
      const { type, payload } = JSON.parse(event.data);

      switch (type) {
        case 'room-created':
          setState((s) => {
            // Save session using the current state's playerName
            saveGameSession({
              roomCode: payload.roomCode,
              reconnectToken: payload.reconnectToken,
              playerName: s.playerName,
            }).then(() => setSavedSession(null));
            return { ...s, roomCode: payload.roomCode, mySocketId: payload.playerId, screen: 'lobby' };
          });
          reconnectTokenRef.current = payload.reconnectToken;
          setConnecting(false);
          break;

        case 'room-rejoined':
          setSavedSession((currentSavedSession) => {
            reconnectTokenRef.current = currentSavedSession?.reconnectToken || null;
            setState((s) => ({
              ...s,
              roomCode: currentSavedSession?.roomCode || null,
              mySocketId: payload.playerId,
              hand: payload.hand,
              faceUpCards: payload.faceUpCards,
              deckCount: payload.deckCount,
              players: payload.players,
              currentTurn: payload.currentTurn,
              screen: payload.phase === 'playing' ? 'game' : 'lobby',
              playerName: currentSavedSession?.playerName || '',
            }));
            return null; // Clear saved session
          });
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
          const result = formatActionMessage(payload);
          if (result) {
            toastKeyRef.current += 1;
            setToast(result);
          }
          break;

        case 'error':
          showAlert('Error', payload.message);
          setConnecting(false);
          // If we got an error while trying to rejoin, clear the invalid session and disconnect
          setSavedSession((current) => {
            if (current) {
              clearGameSession();
              socketRef.current?.close();
            }
            return null;
          });
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

  const handleRejoinRoom = useCallback(() => {
    if (!savedSession) return;

    setConnecting(true);
    const socket = setupSocket(savedSession.roomCode);
    setState((s) => ({ ...s, playerName: savedSession.playerName, isHost: false }));

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'rejoin-room',
        payload: { reconnectToken: savedSession.reconnectToken }
      }));
    }, { once: true });
  }, [savedSession, setupSocket]);

  const handleDismissSavedSession = useCallback(() => {
    clearGameSession();
    setSavedSession(null);
  }, []);

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
    showAlert('Leave Game', 'Are you sure you want to leave?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          socketRef.current?.close();
          clearGameSession(); // Clear saved session on intentional leave
          setSavedSession(null);
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
          onRejoinRoom={handleRejoinRoom}
          onDismissSavedSession={handleDismissSavedSession}
          connecting={connecting}
          savedSession={savedSession}
          showAlert={showAlert}
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
      {state.screen === 'game' && toast && (
        <Toast key={toastKeyRef.current} message={toast.message} duration={toast.duration} />
      )}
      <ThemedAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
      />
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
  homeContainer: {
    justifyContent: 'flex-start',
    paddingTop: 80,
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
  rejoinContainer: {
    marginBottom: SPACING.lg,
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
  lobbyContainer: {
    justifyContent: 'flex-start',
    paddingTop: 60,
  },
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
  },
  turnBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 162, 39, 0.4)',
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
    color: THEME.brass,
    marginBottom: SPACING.xs,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  drawArea: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    gap: SPACING.lg,
  },
  deckAndPlayersColumn: {
    flex: 1,
    gap: SPACING.lg,
  },
  faceUpContainer: {
    flexDirection: 'column',
    gap: 4,
    backgroundColor: 'rgba(107, 28, 35, 0.25)',
    padding: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.4)',
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
    backgroundColor: 'rgba(107, 28, 35, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.4)',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    paddingVertical: SPACING.md,
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
    backgroundColor: 'rgba(107, 28, 35, 0.2)',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.3)',
    padding: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  playerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
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
  playerInfoNameDisconnected: {
    color: THEME.textMuted,
  },
  playerInfoCards: {
    ...TYPE.bodyS,
    color: THEME.textSecondary,
  },
  playerInfoDisconnected: {
    opacity: 0.6,
  },
  disconnectedBadge: {
    ...TYPE.micro,
    color: THEME.warning,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  // Hand section
  handSection: {
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 162, 39, 0.4)',
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
  },
  claimRouteButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.brass,
    overflow: 'hidden',
  },
  claimRouteGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  claimRouteText: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  discardButton: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: THEME.brass,
    overflow: 'hidden',
  },
  discardButtonGradient: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  discardButtonText: {
    ...TYPE.bodyS,
    fontWeight: '600',
    color: THEME.textPrimary,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
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
  // Toast (Telegram style)
  toast: {
    position: 'absolute',
    bottom: 220,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: '#F5EDE0',
    borderWidth: 2,
    borderColor: THEME.brass,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    shadowColor: THEME.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  toastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  toastHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.brass,
  },
  toastHeaderText: {
    ...TYPE.micro,
    fontWeight: '700',
    color: THEME.burgundy,
    letterSpacing: 2,
    marginHorizontal: SPACING.sm,
  },
  toastText: {
    ...TYPE.bodyS,
    color: THEME.textInverse,
    textAlign: 'center',
    fontWeight: '500',
  },
  toastFooter: {
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  toastFooterText: {
    ...TYPE.micro,
    color: THEME.brass,
    letterSpacing: 1,
  },
});
