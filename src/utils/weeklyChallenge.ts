import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionResult } from './storage';

// ─── Constants ──────────────────────────────────────────────────────────────
export const WEEKLY_REWARD_GEMS = 50;
export const WEEKLY_REWARD_XP = 200;
const WEEKLY_KEY = 'vt_weekly_challenge_v1';

// ─── Types ──────────────────────────────────────────────────────────────────
export type WeeklyChallengeType =
  | 'sessions_total'        // complete N sessions
  | 'minutes_total'         // accumulate N minutes
  | 'high_accuracy_count'   // get N sessions ≥ X% accuracy
  | 'distinct_days'         // practice on N different days
  | 'distinct_exercises'    // do N different exercises
  | 'distinct_songs'        // sing N different songs
  | 'high_combo'            // hit a combo of N notes
  | 'xp_total';             // earn N XP

export interface WeeklyChallengeDef {
  type: WeeklyChallengeType;
  title: string;
  desc: string;
  goal: number;
  // Optional accuracy threshold (used by high_accuracy_count)
  accuracyMin?: number;
  // For UI display
  emoji: string;
}

export interface WeeklyChallengeProgress {
  // ISO year-week key (e.g. "2026-W17") so we know which week this is for
  weekId: string;
  challenge: WeeklyChallengeDef;
  current: number;
  // For distinct_days / distinct_exercises / distinct_songs we need to track
  // unique items so we don't double-count
  distinctSet: string[];
  completedAt: number | null;     // ms timestamp when goal first reached
  rewardClaimed: boolean;
}

// ─── Challenge definitions (rotate weekly) ──────────────────────────────────
const CHALLENGES: WeeklyChallengeDef[] = [
  {
    type: 'sessions_total',
    title: 'Practice Marathon',
    desc: 'Complete 10 sessions this week',
    goal: 10,
    emoji: '🏃',
  },
  {
    type: 'distinct_days',
    title: 'Daily Devotion',
    desc: 'Practice on 5 different days',
    goal: 5,
    emoji: '📅',
  },
  {
    type: 'high_accuracy_count',
    title: 'Pitch Perfect Week',
    desc: 'Score 85%+ accuracy in 5 sessions',
    goal: 5,
    accuracyMin: 85,
    emoji: '🎯',
  },
  {
    type: 'minutes_total',
    title: 'Time Investment',
    desc: 'Accumulate 60 minutes of practice',
    goal: 60,
    emoji: '⏱️',
  },
  {
    type: 'distinct_exercises',
    title: 'Variety Singer',
    desc: 'Try 6 different exercises',
    goal: 6,
    emoji: '🎼',
  },
  {
    type: 'distinct_songs',
    title: 'Songbird Tour',
    desc: 'Sing 4 different songs',
    goal: 4,
    emoji: '🎶',
  },
  {
    type: 'high_combo',
    title: 'Combo King',
    desc: 'Hit a 15-note combo',
    goal: 15,
    emoji: '🔥',
  },
  {
    type: 'xp_total',
    title: 'XP Grinder',
    desc: 'Earn 800 XP this week',
    goal: 800,
    emoji: '⚡',
  },
];

// ─── Week-id helper (ISO year-week) ─────────────────────────────────────────
/**
 * Returns the ISO year-week label for a given date, e.g. "2026-W17".
 * Weeks start Monday per ISO 8601, which matches how most users think of "this week."
 */
export function getWeekId(d: Date = new Date()): string {
  // Copy date so we don't mutate
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Make Sunday → 7 so Monday = 1
  const dayOfWeek = date.getUTCDay() || 7;
  // Move to nearest Thursday (current week's Thursday determines ISO year)
  date.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * Pick a deterministic challenge for the given week. Same week → same challenge.
 */
export function getChallengeForWeek(weekId: string): WeeklyChallengeDef {
  // Hash the weekId so consecutive weeks don't trivially predict (just nicer feel)
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) {
    hash = (hash * 31 + weekId.charCodeAt(i)) >>> 0;
  }
  return CHALLENGES[hash % CHALLENGES.length];
}

/**
 * Returns end-of-week timestamp (Sunday 23:59:59 local) for use in countdowns.
 */
export function getWeekEndsAt(d: Date = new Date()): number {
  const date = new Date(d);
  const dayOfWeek = date.getDay() || 7; // Sun → 7, so Mon = 1
  const daysUntilSunday = 7 - dayOfWeek;
  date.setDate(date.getDate() + daysUntilSunday);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

// ─── Storage helpers ────────────────────────────────────────────────────────
async function getItem(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
async function setItem(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

/**
 * Load (or create) the progress entry for the current week.
 * If the stored entry is for a previous week, create a fresh entry for now.
 */
export async function loadWeeklyChallenge(): Promise<WeeklyChallengeProgress> {
  const todayWeek = getWeekId();
  const raw = await getItem(WEEKLY_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as WeeklyChallengeProgress;
      if (parsed.weekId === todayWeek) {
        return parsed;
      }
      // Stale (different week) — fall through to create a fresh one
    } catch {}
  }

  const challenge = getChallengeForWeek(todayWeek);
  const fresh: WeeklyChallengeProgress = {
    weekId: todayWeek,
    challenge,
    current: 0,
    distinctSet: [],
    completedAt: null,
    rewardClaimed: false,
  };
  await setItem(WEEKLY_KEY, JSON.stringify(fresh));
  return fresh;
}

async function saveWeeklyChallenge(p: WeeklyChallengeProgress): Promise<void> {
  await setItem(WEEKLY_KEY, JSON.stringify(p));
}

// ─── Session integration ────────────────────────────────────────────────────
/**
 * Update weekly progress based on a completed session. Called from saveSession().
 *
 * Returns true if the challenge transitioned from incomplete → complete on this
 * call (caller may want to celebrate). Awards gems automatically if it does.
 */
export async function recordWeeklyProgress(
  session: SessionResult,
  xpGained: number
): Promise<{ progress: WeeklyChallengeProgress; justCompleted: boolean }> {
  const p = await loadWeeklyChallenge();
  const wasComplete = !!p.completedAt;

  switch (p.challenge.type) {
    case 'sessions_total':
      p.current += 1;
      break;

    case 'minutes_total':
      // session.duration is in seconds
      p.current += Math.floor(session.duration / 60);
      break;

    case 'high_accuracy_count':
      if (session.accuracy >= (p.challenge.accuracyMin || 85)) {
        p.current += 1;
      }
      break;

    case 'distinct_days': {
      const dayKey = new Date(session.date).toDateString();
      if (!p.distinctSet.includes(dayKey)) {
        p.distinctSet.push(dayKey);
        p.current = p.distinctSet.length;
      }
      break;
    }

    case 'distinct_exercises': {
      if (!p.distinctSet.includes(session.exerciseId)) {
        p.distinctSet.push(session.exerciseId);
        p.current = p.distinctSet.length;
      }
      break;
    }

    case 'distinct_songs': {
      if (session.type === 'song' && !p.distinctSet.includes(session.exerciseId)) {
        p.distinctSet.push(session.exerciseId);
        p.current = p.distinctSet.length;
      }
      break;
    }

    case 'high_combo':
      // Use the highest combo seen this week
      if ((session.combo || 0) > p.current) {
        p.current = session.combo || 0;
      }
      break;

    case 'xp_total':
      p.current += xpGained;
      break;
  }

  let justCompleted = false;
  if (!wasComplete && p.current >= p.challenge.goal) {
    p.completedAt = Date.now();
    justCompleted = true;
  }

  await saveWeeklyChallenge(p);
  return { progress: p, justCompleted };
}

/**
 * Mark the reward as claimed. Caller is responsible for actually awarding gems
 * (so we keep this module storage-pure and the UI controls when celebration happens).
 */
export async function claimWeeklyReward(): Promise<{ claimed: boolean; gems: number; xp: number }> {
  const p = await loadWeeklyChallenge();
  if (!p.completedAt || p.rewardClaimed) {
    return { claimed: false, gems: 0, xp: 0 };
  }
  p.rewardClaimed = true;
  await saveWeeklyChallenge(p);
  return { claimed: true, gems: WEEKLY_REWARD_GEMS, xp: WEEKLY_REWARD_XP };
}

/**
 * Resets the weekly challenge — used by clearProgress.
 */
export async function resetWeeklyChallenge(): Promise<void> {
  try { await AsyncStorage.removeItem(WEEKLY_KEY); } catch {}
}

// ─── Display helpers ────────────────────────────────────────────────────────
export function getProgressPercent(p: WeeklyChallengeProgress): number {
  return Math.min(100, Math.round((p.current / p.challenge.goal) * 100));
}

export function getTimeLeftString(): string {
  const ms = getWeekEndsAt() - Date.now();
  if (ms <= 0) return 'ends today';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}
