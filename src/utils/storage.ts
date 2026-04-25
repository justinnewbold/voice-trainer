import AsyncStorage from '@react-native-async-storage/async-storage';
import { evaluateStreakOnSession, awardFreezeIfMilestone } from './streakProtection';
import { recordWeeklyProgress, resetWeeklyChallenge } from './weeklyChallenge';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface SessionResult {
  id: string;
  date: number;
  exerciseId: string;
  exerciseName: string;
  type: 'scale' | 'song' | 'freeform' | 'warmup';
  duration: number;
  accuracy: number;
  score?: number;
  notesHit?: number;
  totalNotes?: number;
  streak?: number;
  combo?: number;
}

export interface UserProgress {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  avgAccuracy: number;
  xp: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  sessions: SessionResult[];
  lastDate: string | null;
  completedIds: string[];
}

export interface VocalRange {
  lowNote: string;
  highNote: string;
  voiceType: string;
  semitones: number;
  testedAt: number;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  reminderHour: number; // 0-23
  dailyGoalXP: number;
  theme: 'dark' | 'purple' | 'midnight';
  metronomeVolume: number; // 0-1
  droneVolume: number; // 0-1
}

// ─── Keys ───────────────────────────────────────────────────────────────────
const PROGRESS_KEY = 'vt_progress_v1';
const RANGE_KEY = 'vt_range';
const THEME_KEY = 'vt_theme';
const ONBOARDED_KEY = 'vt_onboarded_v1';
const GEMS_KEY = 'vt_gems_v1';
const ACHIEVEMENTS_KEY = 'vt_achievements_v1';
const DAILY_KEY = 'vt_daily_v1';
const CALENDAR_KEY = 'vt_calendar_v1';
const BESTS_KEY = 'vt_bests_v1';
const UNLOCKS_KEY = 'vt_unlocks_v1';
const SETTINGS_KEY = 'vt_settings_v1';
const DAILY_CHALLENGE_KEY = 'vt_daily_challenge_v1';
const COACH_HISTORY_KEY = 'vt_coach_history_v1';
const RANGE_HISTORY_KEY = 'vt_range_history_v1';

export const defaultProgress: UserProgress = {
  totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0,
  avgAccuracy: 0, xp: 0, level: 'beginner', sessions: [], lastDate: null, completedIds: [],
};

export const defaultSettings: AppSettings = {
  notificationsEnabled: false,
  reminderHour: 18,
  dailyGoalXP: 100,
  theme: 'dark',
  metronomeVolume: 0.7,
  droneVolume: 0.5,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
async function getItem(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
async function setItem(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

// ─── Progress ───────────────────────────────────────────────────────────────
export async function loadProgress(): Promise<UserProgress> {
  const raw = await getItem(PROGRESS_KEY);
  if (raw) { try { return { ...defaultProgress, ...JSON.parse(raw) }; } catch {} }
  return { ...defaultProgress };
}

export interface SaveSessionResult extends UserProgress {
  xpGained: number;
  freezesConsumed: number;
  streakBroken: boolean;
  freezeEarned: boolean;
  newAchievements: string[];
  isPersonalBest: boolean;
  weeklyJustCompleted: boolean;
  weeklyChallengeTitle?: string;
  prevLevel: UserProgress['level'];
}

export async function saveSession(session: SessionResult): Promise<SaveSessionResult> {
  const p = await loadProgress();
  const today = new Date().toDateString();
  if (!session.date) session.date = Date.now();

  // Capture previous level so the UI can detect a level-up after this session.
  const prevLevel = p.level;

  // Delegate streak evaluation to streakProtection module — auto-consumes
  // freezes if user missed days, marks the break recoverable if not.
  const evalResult = await evaluateStreakOnSession(p.currentStreak || 0, p.lastDate, today);
  p.currentStreak = evalResult.newStreak;
  if (p.currentStreak > p.longestStreak) p.longestStreak = p.currentStreak;

  p.sessions = [session, ...(p.sessions || [])].slice(0, 100);
  p.totalSessions = (p.totalSessions || 0) + 1;
  p.totalMinutes = (p.totalMinutes || 0) + Math.floor(session.duration / 60);
  p.lastDate = today;

  const recent = p.sessions.slice(0, 10);
  p.avgAccuracy = Math.round(recent.reduce((a, s) => a + s.accuracy, 0) / recent.length);

  const xpGained = Math.round(session.accuracy * (session.duration / 8));
  p.xp = (p.xp || 0) + xpGained;
  p.level = p.xp >= 5000 ? 'advanced' : p.xp >= 1000 ? 'intermediate' : 'beginner';

  if (!p.completedIds.includes(session.exerciseId)) {
    p.completedIds = [...(p.completedIds || []), session.exerciseId];
  }

  await setItem(PROGRESS_KEY, JSON.stringify(p));

  // Award streak freeze when crossing a milestone (every 7-day streak, capped at 3).
  // Awaited so we know whether to celebrate.
  const freezeEarned = await awardFreezeIfMilestone(p.currentStreak).catch(() => false);

  // Track weekly challenge progress (awaited for completion detection).
  const weeklyResult = await recordWeeklyProgress(session, xpGained).catch(() => null);

  // Personal-best detection (awaited).
  const bestResult = await updateBest(session.exerciseId, session.accuracy, session.score || 0)
    .catch(() => ({ isPersonalBest: false, firstAttempt: true }));

  // Achievements (awaited so we can surface the new unlocks).
  const newAchievements = await checkAchievements(p, session).catch(() => [] as string[]);

  // Non-blocking — these don't produce celebration signal so they stay fire-and-forget.
  updateDailyProgress(xpGained).catch(() => {});
  markCalendarDay(xpGained).catch(() => {});

  return {
    ...p,
    xpGained,
    freezesConsumed: evalResult.freezesConsumed,
    streakBroken: evalResult.broken,
    freezeEarned,
    newAchievements,
    isPersonalBest: bestResult.isPersonalBest,
    weeklyJustCompleted: weeklyResult?.justCompleted ?? false,
    weeklyChallengeTitle: weeklyResult?.progress.challenge.title,
    prevLevel,
  };
}

export async function setCurrentStreak(value: number): Promise<UserProgress> {
  const p = await loadProgress();
  p.currentStreak = value;
  if (p.currentStreak > p.longestStreak) p.longestStreak = p.currentStreak;
  await setItem(PROGRESS_KEY, JSON.stringify(p));
  return p;
}

export async function addXP(amount: number): Promise<UserProgress> {
  const p = await loadProgress();
  p.xp = (p.xp || 0) + amount;
  p.level = p.xp >= 5000 ? 'advanced' : p.xp >= 1000 ? 'intermediate' : 'beginner';
  await setItem(PROGRESS_KEY, JSON.stringify(p));
  return p;
}

export async function clearProgress(): Promise<void> {
  await setItem(PROGRESS_KEY, JSON.stringify(defaultProgress));
  await setItem(GEMS_KEY, '0');
  await setItem(ACHIEVEMENTS_KEY, '[]');
  await setItem(BESTS_KEY, '{}');
  await setItem(CALENDAR_KEY, '{}');
  await setItem(DAILY_CHALLENGE_KEY, '{}');
  // Reset streak protection state too (freeze inventory + break records)
  const { resetStreakProtection } = await import('./streakProtection');
  await resetStreakProtection();
  // Reset weekly challenge progress too
  await resetWeeklyChallenge();
  // Reset favorites too
  const { resetFavorites } = await import('./favorites');
  await resetFavorites();
}

export async function deleteSession(sessionId: string): Promise<void> {
  const p = await loadProgress();
  p.sessions = (p.sessions || []).filter(s => s.id !== sessionId);
  p.totalSessions = Math.max(0, (p.totalSessions || 1) - 1);
  const recent = p.sessions.slice(0, 10);
  p.avgAccuracy = recent.length > 0 ? Math.round(recent.reduce((a, s) => a + s.accuracy, 0) / recent.length) : 0;
  await setItem(PROGRESS_KEY, JSON.stringify(p));
}

// ─── Vocal Range ────────────────────────────────────────────────────────────
export async function loadVocalRange(): Promise<VocalRange | null> {
  const raw = await getItem(RANGE_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return null;
}

export async function saveVocalRange(range: VocalRange): Promise<void> {
  await setItem(RANGE_KEY, JSON.stringify(range));
}



// ─── Vocal Range History ────────────────────────────────────────────────────
export interface RangeSnapshot {
  lowNote: string;
  highNote: string;
  voiceType: string;
  semitones: number;
  testedAt: number;
}

export async function loadRangeHistory(): Promise<RangeSnapshot[]> {
  const raw = await getItem(RANGE_HISTORY_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return [];
}

export async function saveRangeSnapshot(snapshot: RangeSnapshot): Promise<void> {
  const history = await loadRangeHistory();
  // Add new snapshot, keep last 50
  history.push(snapshot);
  const trimmed = history.slice(-50);
  await setItem(RANGE_HISTORY_KEY, JSON.stringify(trimmed));
}

export async function clearRangeHistory(): Promise<void> {
  await setItem(RANGE_HISTORY_KEY, '[]');
}

// ─── Onboarding ─────────────────────────────────────────────────────────────
export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await getItem(ONBOARDED_KEY)) === 'true';
}
export async function markOnboardingComplete(): Promise<void> {
  await setItem(ONBOARDED_KEY, 'true');
}

// ─── Settings ────────────────────────────────────────────────────────────────
export async function loadSettings(): Promise<AppSettings> {
  const raw = await getItem(SETTINGS_KEY);
  if (raw) { try { return { ...defaultSettings, ...JSON.parse(raw) }; } catch {} }
  return { ...defaultSettings };
}
export async function saveSettings(settings: AppSettings): Promise<void> {
  await setItem(SETTINGS_KEY, JSON.stringify(settings));
  // Keep legacy theme key in sync
  await setItem(THEME_KEY, settings.theme);
}

// ─── Theme (legacy) ─────────────────────────────────────────────────────────
export async function getTheme(): Promise<string> {
  return (await getItem(THEME_KEY)) || 'dark';
}
export async function setThemeValue(theme: string): Promise<void> {
  await setItem(THEME_KEY, theme);
}

// ─── Level Info ─────────────────────────────────────────────────────────────
export function levelInfo(xp: number) {
  if (xp < 1000) return { label: 'Beginner', emoji: '🌱', next: 'Intermediate', needed: 1000, current: xp };
  if (xp < 5000) return { label: 'Intermediate', emoji: '🎵', next: 'Advanced', needed: 4000, current: xp - 1000 };
  return { label: 'Advanced', emoji: '🌟', next: null, needed: 0, current: 0 };
}

// ─── Gamification ───────────────────────────────────────────────────────────
export async function getGems(): Promise<number> {
  const raw = await getItem(GEMS_KEY);
  return raw ? parseInt(raw) || 0 : 0;
}
export async function addGems(amount: number): Promise<number> {
  const current = await getGems();
  const next = Math.max(0, current + amount);
  await setItem(GEMS_KEY, next.toString());
  return next;
}

// Achievements
export const ACHIEVEMENT_DEFS = [
  { id: 'first_note', name: 'First Note', desc: 'Complete your first session', icon: '🎵', gems: 10, check: (p: UserProgress) => p.totalSessions >= 1 },
  { id: 'sessions_5', name: 'Warming Up', desc: 'Complete 5 sessions', icon: '🔥', gems: 20, check: (p: UserProgress) => p.totalSessions >= 5 },
  { id: 'sessions_25', name: 'Getting Serious', desc: 'Complete 25 sessions', icon: '💪', gems: 50, check: (p: UserProgress) => p.totalSessions >= 25 },
  { id: 'sessions_100', name: 'Voice Master', desc: 'Complete 100 sessions', icon: '👑', gems: 200, check: (p: UserProgress) => p.totalSessions >= 100 },
  { id: 'acc_80', name: 'On Pitch', desc: 'Score 80%+ accuracy', icon: '🎯', gems: 15, check: (_p: UserProgress, s?: SessionResult) => (s?.accuracy || 0) >= 80 },
  { id: 'acc_95', name: 'Perfect Pitch', desc: 'Score 95%+ accuracy', icon: '⭐', gems: 50, check: (_p: UserProgress, s?: SessionResult) => (s?.accuracy || 0) >= 95 },
  { id: 'streak_3', name: 'Hat Trick', desc: '3-day practice streak', icon: '🎩', gems: 25, check: (p: UserProgress) => p.currentStreak >= 3 },
  { id: 'streak_7', name: 'Weekly Warrior', desc: '7-day practice streak', icon: '⚡', gems: 75, check: (p: UserProgress) => p.currentStreak >= 7 },
  { id: 'streak_30', name: 'Monthly Legend', desc: '30-day practice streak', icon: '🏆', gems: 300, check: (p: UserProgress) => p.currentStreak >= 30 },
  { id: 'xp_1000', name: 'Intermediate', desc: 'Reach 1,000 XP', icon: '🎵', gems: 30, check: (p: UserProgress) => p.xp >= 1000 },
  { id: 'xp_5000', name: 'Advanced Singer', desc: 'Reach 5,000 XP', icon: '🌟', gems: 100, check: (p: UserProgress) => p.xp >= 5000 },
  { id: 'combo_10', name: 'Combo King', desc: 'Hit a 10-note combo', icon: '🔥', gems: 30, check: (_p: UserProgress, s?: SessionResult) => (s?.combo || 0) >= 10 },
  { id: 'songs_5', name: 'Song Bird', desc: 'Complete 5 different songs', icon: '🎶', gems: 40, check: (p: UserProgress) => p.completedIds.filter(id => id.startsWith('s')).length >= 5 },
  { id: 'all_beginner', name: 'Foundations', desc: 'Complete all beginner exercises', icon: '🏅', gems: 60, check: (p: UserProgress) => ['b1','b2','b3','b4','b5'].every(id => p.completedIds.includes(id)) },
  { id: 'daily_7', name: 'Challenge Seeker', desc: 'Complete 7 daily challenges', icon: '📅', gems: 80, check: (p: UserProgress) => (p as any).dailyChallengesCompleted >= 7 },
];

export async function getAchievements(): Promise<{ id: string; earnedAt: number }[]> {
  const raw = await getItem(ACHIEVEMENTS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return [];
}

export async function checkAchievements(progress: UserProgress, session?: SessionResult) {
  const earned = await getAchievements();
  const earnedIds = new Set(earned.map(a => a.id));
  const newOnes: string[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (earnedIds.has(def.id)) continue;
    if (def.check(progress, session)) {
      earned.push({ id: def.id, earnedAt: Date.now() });
      await addGems(def.gems);
      newOnes.push(def.id);
    }
  }
  await setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
  return newOnes;
}

// Daily progress
export async function getDailyProgress() {
  const today = new Date().toDateString();
  const raw = await getItem(DAILY_KEY);
  if (raw) { try { const d = JSON.parse(raw); if (d.date === today) return d; } catch {} }
  return { date: today, xp: 0, sessions: 0, claimed: false };
}

export async function updateDailyProgress(xpGained: number) {
  const today = new Date().toDateString();
  const daily = await getDailyProgress();
  if (daily.date !== today) { daily.date = today; daily.xp = 0; daily.sessions = 0; daily.claimed = false; }
  daily.xp += xpGained;
  daily.sessions += 1;
  await setItem(DAILY_KEY, JSON.stringify(daily));
}

// Daily Challenge completion
export async function getDailyChallengeStatus(): Promise<{ completedToday: boolean; totalCompleted: number }> {
  const raw = await getItem(DAILY_CHALLENGE_KEY);
  const data = raw ? JSON.parse(raw) : { completedDates: [], totalCompleted: 0 };
  const today = new Date().toDateString();
  return {
    completedToday: (data.completedDates || []).includes(today),
    totalCompleted: data.totalCompleted || 0,
  };
}

export async function markDailyChallengeComplete(): Promise<void> {
  const raw = await getItem(DAILY_CHALLENGE_KEY);
  const data = raw ? JSON.parse(raw) : { completedDates: [], totalCompleted: 0 };
  const today = new Date().toDateString();
  if (!data.completedDates.includes(today)) {
    data.completedDates = [today, ...data.completedDates].slice(0, 60);
    data.totalCompleted = (data.totalCompleted || 0) + 1;
    await setItem(DAILY_CHALLENGE_KEY, JSON.stringify(data));
    await addGems(10);
  }
}

// Calendar
export async function getCalendar(): Promise<Record<string, number>> {
  const raw = await getItem(CALENDAR_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return {};
}

export async function markCalendarDay(xp: number) {
  const cal = await getCalendar();
  const key = new Date().toISOString().slice(0, 10);
  cal[key] = (cal[key] || 0) + xp;
  await setItem(CALENDAR_KEY, JSON.stringify(cal));
}

export interface CalendarDay {
  date: string;          // YYYY-MM-DD
  xp: number;            // 0 if no practice (or freeze-protected)
  dayOfWeek: number;     // 0-6 (Sun-Sat)
  isToday: boolean;
  isFuture: boolean;     // dates after today (only relevant when callers ask for full grid)
  /** Whether this day was bridged by an auto-consumed streak freeze. */
  freezeProtected: boolean;
  /** Whether this day was a manual streak restore. */
  restored: boolean;
}

export async function getCalendarData(weeks = 12): Promise<CalendarDay[]> {
  const cal = await getCalendar();
  // Pull freeze/restore history from streak protection so we can mark
  // those days distinctly in the heatmap.
  const { loadStreakProtection } = await import('./streakProtection');
  const sp = await loadStreakProtection().catch(() => null);
  // Build a date → 'freeze' | 'restore' lookup
  const protectionByDate: Record<string, 'freeze' | 'restore'> = {};
  if (sp?.history) {
    for (const h of sp.history) {
      // history.date is `new Date().toDateString()` format e.g. "Mon Apr 21 2026"
      const d = new Date(h.date);
      if (!isNaN(d.getTime())) {
        const key = d.toISOString().slice(0, 10);
        // Don't overwrite if multiple entries hit the same day
        if (!protectionByDate[key]) protectionByDate[key] = h.type;
      }
    }
  }

  const days: CalendarDay[] = [];
  const now = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const protection = protectionByDate[key];
    days.push({
      date: key,
      xp: cal[key] || 0,
      dayOfWeek: d.getDay(),
      isToday: i === 0,
      isFuture: false,
      freezeProtected: protection === 'freeze',
      restored: protection === 'restore',
    });
  }
  return days;
}

// Bests
export async function getBests(): Promise<Record<string, any>> {
  const raw = await getItem(BESTS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return {};
}

export async function updateBest(exerciseId: string, accuracy: number, score: number): Promise<{ isPersonalBest: boolean; firstAttempt: boolean }> {
  const bests = await getBests();
  const current = bests[exerciseId] || { accuracy: 0, score: 0, attempts: 0 };
  const firstAttempt = (current.attempts || 0) === 0;
  // A "personal best" means strictly better than the previous best. First attempt
  // doesn't count — that's just an opening result, not a PR.
  const isPersonalBest = !firstAttempt && (
    accuracy > (current.accuracy || 0) || (score || 0) > (current.score || 0)
  );
  bests[exerciseId] = {
    accuracy: Math.max(current.accuracy, accuracy),
    score: Math.max(current.score || 0, score || 0),
    attempts: (current.attempts || 0) + 1,
    lastPlayed: Date.now(),
  };
  await setItem(BESTS_KEY, JSON.stringify(bests));
  return { isPersonalBest, firstAttempt };
}

// Unlocks
export async function getUnlocks(): Promise<string[]> {
  const raw = await getItem(UNLOCKS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return ['beginner'];
}

export async function checkUnlocks(progress: UserProgress) {
  const unlocks = await getUnlocks();
  if (progress.xp >= 500 && !unlocks.includes('intermediate')) unlocks.push('intermediate');
  if (progress.xp >= 2500 && !unlocks.includes('advanced')) unlocks.push('advanced');
  await setItem(UNLOCKS_KEY, JSON.stringify(unlocks));
}

// Coach message history
export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export async function getCoachHistory(): Promise<CoachMessage[]> {
  const raw = await getItem(COACH_HISTORY_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return [];
}

export async function saveCoachMessage(msg: CoachMessage): Promise<void> {
  const history = await getCoachHistory();
  history.push(msg);
  // Keep last 50 messages
  const trimmed = history.slice(-50);
  await setItem(COACH_HISTORY_KEY, JSON.stringify(trimmed));
}

export async function clearCoachHistory(): Promise<void> {
  await setItem(COACH_HISTORY_KEY, '[]');
}
