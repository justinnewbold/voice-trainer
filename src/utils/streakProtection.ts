import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Constants ──────────────────────────────────────────────────────────────
export const MAX_FREEZES = 3;
export const FREEZE_AWARD_INTERVAL = 7;     // award 1 freeze every N-day streak milestone
export const RESTORE_GEM_COST = 50;
export const RESTORE_WINDOW_HOURS = 48;     // can only restore within this window of breaking
export const RESTORE_COOLDOWN_DAYS = 30;    // can only restore once every N days
export const DAY_MS = 86_400_000;

// ─── Types ──────────────────────────────────────────────────────────────────
export interface StreakProtectionState {
  freezeCount: number;
  // Largest streak value at which we last awarded a freeze. Lets us award once per milestone.
  lastFreezeAwardedAtStreak: number;
  // Recent freeze/restore usage history (newest first, capped to ~30 entries)
  history: { date: string; type: 'freeze' | 'restore'; streakAfter: number }[];
  // Timestamp of last successful manual restore (for cooldown enforcement)
  lastRestoreAt: number | null;
  // When the user's most recent break occurred. If non-null and within RESTORE_WINDOW_HOURS,
  // the user can pay to restore. Cleared once they restore, dismiss, or the window expires.
  brokenAt: number | null;
  // The streak value at the moment of the most recent break (so we can restore to it).
  brokenFromStreak: number;
  // ID for the current break event, used so the recovery modal only shows once per break.
  brokenEventId: string | null;
  // Last brokenEventId the user has dismissed (so the modal won't re-pop).
  dismissedEventId: string | null;
}

const STREAK_PROTECTION_KEY = 'vt_streak_protection_v1';

const defaultState: StreakProtectionState = {
  freezeCount: 0,
  lastFreezeAwardedAtStreak: 0,
  history: [],
  lastRestoreAt: null,
  brokenAt: null,
  brokenFromStreak: 0,
  brokenEventId: null,
  dismissedEventId: null,
};

// ─── Storage helpers ────────────────────────────────────────────────────────
async function getItem(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
async function setItem(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

export async function loadStreakProtection(): Promise<StreakProtectionState> {
  const raw = await getItem(STREAK_PROTECTION_KEY);
  if (raw) {
    try { return { ...defaultState, ...JSON.parse(raw) }; } catch {}
  }
  return { ...defaultState };
}

export async function saveStreakProtection(state: StreakProtectionState): Promise<void> {
  await setItem(STREAK_PROTECTION_KEY, JSON.stringify(state));
}

// ─── Date helpers ───────────────────────────────────────────────────────────
function daysBetween(lastDateStr: string | null, todayStr: string): number {
  // Returns # of full days between lastDate and today. 0 if same day, 1 if yesterday, etc.
  if (!lastDateStr) return Infinity;
  const last = new Date(lastDateStr).getTime();
  const today = new Date(todayStr).getTime();
  if (isNaN(last) || isNaN(today)) return Infinity;
  return Math.round((today - last) / DAY_MS);
}

// ─── Core: evaluate streak at session save ──────────────────────────────────
/**
 * Decides what currentStreak should be when a new session is recorded.
 * Implements freeze auto-consumption when the user missed days.
 *
 * Returns:
 *   newStreak — the value to set on UserProgress.currentStreak
 *   freezesConsumed — how many freezes were spent to bridge missed days (0 if same/yesterday)
 *   broken — true if user's streak ended (insufficient freezes to bridge the gap)
 *   prevStreak — the streak value before this session (for restore-eligibility tracking)
 */
export interface StreakEvaluation {
  newStreak: number;
  freezesConsumed: number;
  broken: boolean;
  prevStreak: number;
}

export async function evaluateStreakOnSession(
  prevStreak: number,
  prevLastDate: string | null,
  todayStr: string
): Promise<StreakEvaluation> {
  const state = await loadStreakProtection();
  const gap = daysBetween(prevLastDate, todayStr);

  // Same day — streak unchanged
  if (gap <= 0) {
    return { newStreak: prevStreak, freezesConsumed: 0, broken: false, prevStreak };
  }

  // Yesterday — normal increment
  if (gap === 1) {
    // If a previous break was still pending and this session bridges that gap,
    // it doesn't apply (this is just a normal next-day session). But let's be
    // safe and clear any stale broken flag.
    if (state.brokenAt) {
      const next = { ...state, brokenAt: null, brokenFromStreak: 0, brokenEventId: null };
      await saveStreakProtection(next);
    }
    return { newStreak: prevStreak + 1, freezesConsumed: 0, broken: false, prevStreak };
  }

  // gap >= 2  →  user missed (gap - 1) full days. Try to consume freezes to bridge.
  const missedDays = gap - 1;
  let freezesConsumed = 0;
  let nextState = { ...state };

  if (state.freezeCount > 0 && missedDays <= state.freezeCount) {
    // Enough freezes to bridge — auto-consume, streak continues + 1 for today's session
    freezesConsumed = missedDays;
    nextState.freezeCount = state.freezeCount - missedDays;
    nextState.history = [
      ...Array.from({ length: missedDays }).map((_, i) => ({
        date: new Date(new Date(todayStr).getTime() - (i + 1) * DAY_MS).toDateString(),
        type: 'freeze' as const,
        streakAfter: prevStreak,
      })),
      ...state.history,
    ].slice(0, 30);
    // Clear any stale broken flag
    nextState.brokenAt = null;
    nextState.brokenFromStreak = 0;
    nextState.brokenEventId = null;

    await saveStreakProtection(nextState);
    return { newStreak: prevStreak + 1, freezesConsumed, broken: false, prevStreak };
  }

  // Not enough freezes — streak breaks
  // Mark a recoverable break event so the user can choose to restore.
  const eventId = `brk_${Date.now()}`;
  nextState.brokenAt = Date.now();
  nextState.brokenFromStreak = prevStreak;
  nextState.brokenEventId = eventId;
  await saveStreakProtection(nextState);

  return { newStreak: 1, freezesConsumed: 0, broken: true, prevStreak };
}

// ─── Award freeze on milestones ─────────────────────────────────────────────
/**
 * Award a streak freeze when the user crosses a multiple of FREEZE_AWARD_INTERVAL,
 * capped at MAX_FREEZES in inventory. Returns true if a freeze was awarded.
 */
export async function awardFreezeIfMilestone(currentStreak: number): Promise<boolean> {
  if (currentStreak < FREEZE_AWARD_INTERVAL) return false;

  const state = await loadStreakProtection();

  // Only award once per milestone — figure out the highest milestone reached
  const newestMilestone = Math.floor(currentStreak / FREEZE_AWARD_INTERVAL) * FREEZE_AWARD_INTERVAL;
  if (newestMilestone <= state.lastFreezeAwardedAtStreak) return false;

  if (state.freezeCount >= MAX_FREEZES) {
    // Inventory full — still mark the milestone so we don't keep checking
    await saveStreakProtection({ ...state, lastFreezeAwardedAtStreak: newestMilestone });
    return false;
  }

  await saveStreakProtection({
    ...state,
    freezeCount: state.freezeCount + 1,
    lastFreezeAwardedAtStreak: newestMilestone,
  });
  return true;
}

// ─── Recoverable break detection ────────────────────────────────────────────
export interface RecoverableBreak {
  brokenAt: number;
  prevStreak: number;
  hoursLeft: number;
  eventId: string;
  cooldownActive: boolean;
  cooldownDaysLeft: number;
}

/**
 * Returns info about a restorable streak break, or null if none / expired / dismissed.
 */
export async function getRecoverableBreak(): Promise<RecoverableBreak | null> {
  const state = await loadStreakProtection();
  if (!state.brokenAt || !state.brokenEventId) return null;

  // User already dismissed this specific event
  if (state.dismissedEventId === state.brokenEventId) return null;

  const hoursSinceBreak = (Date.now() - state.brokenAt) / (1000 * 60 * 60);
  if (hoursSinceBreak > RESTORE_WINDOW_HOURS) {
    // Window expired — clear the flag
    await saveStreakProtection({
      ...state,
      brokenAt: null,
      brokenFromStreak: 0,
      brokenEventId: null,
    });
    return null;
  }

  let cooldownActive = false;
  let cooldownDaysLeft = 0;
  if (state.lastRestoreAt) {
    const daysSinceRestore = (Date.now() - state.lastRestoreAt) / DAY_MS;
    if (daysSinceRestore < RESTORE_COOLDOWN_DAYS) {
      cooldownActive = true;
      cooldownDaysLeft = Math.ceil(RESTORE_COOLDOWN_DAYS - daysSinceRestore);
    }
  }

  return {
    brokenAt: state.brokenAt,
    prevStreak: state.brokenFromStreak,
    hoursLeft: Math.ceil(RESTORE_WINDOW_HOURS - hoursSinceBreak),
    eventId: state.brokenEventId,
    cooldownActive,
    cooldownDaysLeft,
  };
}

/**
 * Mark a recoverable break event as dismissed — stops the recovery modal from re-popping.
 */
export async function dismissRecoverableBreak(eventId: string): Promise<void> {
  const state = await loadStreakProtection();
  if (state.brokenEventId === eventId) {
    await saveStreakProtection({ ...state, dismissedEventId: eventId });
  }
}

/**
 * Attempt to restore the streak. Caller is responsible for spending gems
 * (we just check & bookkeep here so this module stays storage-pure).
 *
 * Returns the streak value to restore TO, or null if not eligible.
 */
export async function consumeRestore(eventId: string): Promise<number | null> {
  const state = await loadStreakProtection();
  if (state.brokenEventId !== eventId || !state.brokenAt) return null;

  const hoursSinceBreak = (Date.now() - state.brokenAt) / (1000 * 60 * 60);
  if (hoursSinceBreak > RESTORE_WINDOW_HOURS) return null;

  if (state.lastRestoreAt) {
    const daysSinceRestore = (Date.now() - state.lastRestoreAt) / DAY_MS;
    if (daysSinceRestore < RESTORE_COOLDOWN_DAYS) return null;
  }

  // Restore = previous streak + 1 (you also did today's session)
  const restored = state.brokenFromStreak + 1;

  await saveStreakProtection({
    ...state,
    lastRestoreAt: Date.now(),
    brokenAt: null,
    brokenFromStreak: 0,
    brokenEventId: null,
    dismissedEventId: eventId,
    history: [
      { date: new Date().toDateString(), type: 'restore', streakAfter: restored },
      ...state.history,
    ].slice(0, 30),
  });

  return restored;
}

// ─── Test helpers (used by Settings screen for debugging only) ──────────────
export async function resetStreakProtection(): Promise<void> {
  await saveStreakProtection({ ...defaultState });
}
