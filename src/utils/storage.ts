import * as SecureStore from 'expo-secure-store';

export interface SessionResult {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  type: 'scale' | 'song' | 'freeform';
  durationSeconds: number;
  avgAccuracy: number;
  notesHit: number;
  totalNotes: number;
  streak: number;
}

export interface UserProgress {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  longestStreak: number;
  avgAccuracy: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  xp: number;
  sessions: SessionResult[];
  lastSessionDate: string | null;
  completedExercises: string[];
}

const STORAGE_KEY = 'voice_trainer_progress';

export const defaultProgress: UserProgress = {
  totalSessions: 0,
  totalMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  avgAccuracy: 0,
  level: 'beginner',
  xp: 0,
  sessions: [],
  lastSessionDate: null,
  completedExercises: [],
};

export async function loadProgress(): Promise<UserProgress> {
  try {
    const data = await SecureStore.getItemAsync(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as UserProgress;
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return { ...defaultProgress };
}

export async function saveSession(session: SessionResult): Promise<UserProgress> {
  const progress = await loadProgress();

  const today = new Date().toDateString();
  const lastDate = progress.lastSessionDate;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  if (lastDate === today) {
    // Same day, streak unchanged
  } else if (lastDate === yesterday) {
    progress.currentStreak += 1;
  } else {
    progress.currentStreak = 1;
  }

  if (progress.currentStreak > progress.longestStreak) {
    progress.longestStreak = progress.currentStreak;
  }

  progress.sessions = [session, ...progress.sessions].slice(0, 100);
  progress.totalSessions += 1;
  progress.totalMinutes += Math.floor(session.durationSeconds / 60);
  progress.lastSessionDate = today;

  // Calculate overall avg accuracy
  const recentSessions = progress.sessions.slice(0, 10);
  progress.avgAccuracy = Math.round(
    recentSessions.reduce((acc, s) => acc + s.avgAccuracy, 0) / recentSessions.length
  );

  // XP calculation
  const xpGained = Math.round(session.avgAccuracy * (session.durationSeconds / 10));
  progress.xp += xpGained;

  // Level up
  if (progress.xp >= 5000) {
    progress.level = 'advanced';
  } else if (progress.xp >= 1000) {
    progress.level = 'intermediate';
  }

  if (!progress.completedExercises.includes(session.exerciseId)) {
    progress.completedExercises.push(session.exerciseId);
  }

  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(progress));
  return progress;
}

export async function clearProgress(): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(defaultProgress));
}

export function getLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  };
  return labels[level] || 'Beginner';
}

export function getXpForNextLevel(xp: number): { current: number; needed: number; label: string } {
  if (xp < 1000) return { current: xp, needed: 1000, label: 'Intermediate' };
  if (xp < 5000) return { current: xp - 1000, needed: 4000, label: 'Advanced' };
  return { current: xp, needed: xp, label: 'Max Level' };
}
