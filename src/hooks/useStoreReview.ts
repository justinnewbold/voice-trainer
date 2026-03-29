import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REVIEW_KEY = 'vt_store_review_v1';
const MIN_SESSIONS = 10;
const MIN_ACCURACY = 75;
const DAYS_BETWEEN_PROMPTS = 60;

interface ReviewState {
  prompted: boolean;
  lastPromptDate: number | null;
  goodSessionCount: number;
}

async function getReviewState(): Promise<ReviewState> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { prompted: false, lastPromptDate: null, goodSessionCount: 0 };
}

async function saveReviewState(state: ReviewState): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Call after every session completes.
 * Will prompt for App Store review when conditions are met:
 * - At least 10 sessions with 75%+ accuracy
 * - Haven't prompted in the last 60 days
 * - Running on a native device (not web)
 */
export async function maybePromptReview(sessionAccuracy: number): Promise<void> {
  if (Platform.OS === 'web') return;

  const state = await getReviewState();

  // Count good sessions
  if (sessionAccuracy >= MIN_ACCURACY) {
    state.goodSessionCount = (state.goodSessionCount || 0) + 1;
  }

  // Check if we should prompt
  const now = Date.now();
  const daysSinceLastPrompt = state.lastPromptDate
    ? (now - state.lastPromptDate) / (1000 * 60 * 60 * 24)
    : Infinity;

  const shouldPrompt =
    state.goodSessionCount >= MIN_SESSIONS &&
    daysSinceLastPrompt >= DAYS_BETWEEN_PROMPTS;

  if (shouldPrompt) {
    try {
      const StoreReview = await import('expo-store-review');
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        // Small delay so the score card renders first
        setTimeout(async () => {
          try {
            await StoreReview.requestReview();
            state.lastPromptDate = now;
            state.prompted = true;
          } catch {}
        }, 2000);
      }
    } catch {}
  }

  await saveReviewState(state);
}

/**
 * Check if store review has ever been prompted.
 */
export async function hasBeenReviewPrompted(): Promise<boolean> {
  const state = await getReviewState();
  return state.prompted;
}
