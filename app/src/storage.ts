import AsyncStorage from '@react-native-async-storage/async-storage';

const GAME_SESSION_KEY = 'shuffle-to-ride-session';
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

export interface SavedGameSession {
  roomCode: string;
  reconnectToken: string;
  playerName: string;
  savedAt: number;
}

export async function saveGameSession(session: Omit<SavedGameSession, 'savedAt'>): Promise<void> {
  const data: SavedGameSession = {
    ...session,
    savedAt: Date.now(),
  };
  await AsyncStorage.setItem(GAME_SESSION_KEY, JSON.stringify(data));
}

export async function getGameSession(): Promise<SavedGameSession | null> {
  try {
    const data = await AsyncStorage.getItem(GAME_SESSION_KEY);
    if (!data) return null;

    const session = JSON.parse(data) as SavedGameSession;

    // Check if session has expired
    const age = Date.now() - session.savedAt;
    if (age > SESSION_EXPIRY_MS) {
      await clearGameSession();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export async function clearGameSession(): Promise<void> {
  await AsyncStorage.removeItem(GAME_SESSION_KEY);
}
