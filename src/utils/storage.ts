import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const defaultProgress: UserProgress = {
  totalSessions: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0,
  avgAccuracy: 0, xp: 0, level: 'beginner', sessions: [], lastDate: null, completedIds: [],
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

export async function saveSession(session: SessionResult): Promise<UserProgress & { xpGained: number }> {
  const p = await loadProgress();
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (!session.date) session.date = Date.now();

  if (p.lastDate === today) { /* unchanged */ }
  else if (p.lastDate === yesterday) { p.currentStreak = (p.currentStreak || 0) + 1; }
  else { p.currentStreak = 1; }
  if (p.currentStreak > p.longestStreak) p.longestStreak = p.currentStreak;

  p.sessions = [session, ...(p.sessions || [])].slice(0, 50);
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

  // Non-blocking gamification
  updateDailyProgress(xpGained).catch(() => {});
  markCalendarDay(xpGained).catch(() => {});
  updateBest(session.exerciseId, session.accuracy, session.score || 0).catch(() => {});

  return { ...p, xpGained };
}

export async function clearProgress(): Promise<void> {
  await setItem(PROGRESS_KEY, JSON.stringify(defaultProgress));
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

// ─── Onboarding ─────────────────────────────────────────────────────────────
export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await getItem(ONBOARDED_KEY)) === 'true';
}
export async function markOnboardingComplete(): Promise<void> {
  await setItem(ONBOARDED_KEY, 'true');
}

// ─── Theme ──────────────────────────────────────────────────────────────────
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
  const next = current + amount;
  await setItem(GEMS_KEY, next.toString());
  return next;
}

// Achievements
export const ACHIEVEMENT_DEFS = [
  { id: 'first_note', name: 'First Note', desc: 'Complete your first session', icon: '🎵', gems: 10, check: (p: UserProgress) => p.totalSessions >= 1 },
  { id: 'sessions_5', name: 'Warming Up', desc: 'Complete 5 sessions', icon: '🔥', gems: 20, check: (p: UserProgress) => p.totalSessions >= 5 },
  { id: 'sessions_25', name: 'Getting Serious', desc: 'Complete 25 sessions', icon: '💪', gems: 50, check: (p: UserProgress) => p.totalSessions >= 25 },
  { id: 'acc_80', name: 'On Pitch', desc: 'Score 80%+ accuracy', icon: '🎯', gems: 15, check: (_p: UserProgress, s?: SessionResult) => (s?.accuracy || 0) >= 80 },
  { id: 'acc_95', name: 'Perfect Pitch', desc: 'Score 95%+ accuracy', icon: '⭐', gems: 50, check: (_p: UserProgress, s?: SessionResult) => (s?.accuracy || 0) >= 95 },
  { id: 'streak_3', name: 'Hat Trick', desc: '3-day practice streak', icon: '🎩', gems: 25, check: (p: UserProgress) => p.currentStreak >= 3 },
  { id: 'streak_7', name: 'Weekly Warrior', desc: '7-day practice streak', icon: '⚡', gems: 75, check: (p: UserProgress) => p.currentStreak >= 7 },
  { id: 'xp_1000', name: 'Intermediate', desc: 'Reach 1,000 XP', icon: '🎵', gems: 30, check: (p: UserProgress) => p.xp >= 1000 },
  { id: 'xp_5000', name: 'Advanced Singer', desc: 'Reach 5,000 XP', icon: '🌟', gems: 100, check: (p: UserProgress) => p.xp >= 5000 },
];

export async function getAchievements(): Promise<{ id: string; earnedAt: number }[]> {
  const raw = await getItem(ACHIEVEMENTS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return [];
}

export async function checkAchievements(progress: UserProgress, session?: SessionResult) {
  const earned = await getAchievements();
  const earnedIds = new Set(earned.map(a => a.id));
  for (const def of ACHIEVEMENT_DEFS) {
    if (earnedIds.has(def.id)) continue;
    if (def.check(progress, session)) {
      earned.push({ id: def.id, earnedAt: Date.now() });
      await addGems(def.gems);
    }
  }
  await setItem(ACHIEVEMENTS_KEY, JSON.stringify(earned));
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

export async function getCalendarData(weeks = 12) {
  const cal = await getCalendar();
  const days = [];
  const now = new Date();
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, xp: cal[key] || 0, dayOfWeek: d.getDay(), isToday: i === 0 });
  }
  return days;
}

// Bests
export async function getBests(): Promise<Record<string, any>> {
  const raw = await getItem(BESTS_KEY);
  if (raw) { try { return JSON.parse(raw); } catch {} }
  return {};
}

export async function updateBest(exerciseId: string, accuracy: number, score: number) {
  const bests = await getBests();
  const current = bests[exerciseId] || { accuracy: 0, score: 0, attempts: 0 };
  bests[exerciseId] = {
    accuracy: Math.max(current.accuracy, accuracy),
    score: Math.max(current.score || 0, score || 0),
    attempts: (current.attempts || 0) + 1,
    lastPlayed: Date.now(),
  };
  await setItem(BESTS_KEY, JSON.stringify(bests));
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
