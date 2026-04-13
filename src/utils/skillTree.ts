import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress } from './storage';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SkillStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface SkillRequirement {
  minXP?: number;
  minSessions?: number;
  minStreak?: number;
  minAccuracy?: number;         // avg accuracy threshold
  completedSkillIds?: string[];  // prerequisite skill ids
  minSongsMatched?: number;
  minScaleSessions?: number;
  minIntervalSessions?: number;
  minWarmupSessions?: number;
  minDuetSessions?: number;
  minSightSingSessions?: number;
}

export interface SkillCompletionRule {
  minSessions?: number;
  minAccuracy?: number;
  minSongsMatched?: number;
  minScaleSessions?: number;
  minIntervalSessions?: number;
  minWarmupSessions?: number;
  minDuetSessions?: number;
  minSightSingSessions?: number;
  minStreak?: number;
  minXP?: number;
  allSkillsInTier?: number;     // complete all skills in a given tier number
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: 1 | 2 | 3 | 4 | 5;
  xpReward: number;
  gemReward: number;
  unlockRequires: SkillRequirement;
  completeRequires: SkillCompletionRule;
  route?: string;   // deep link to relevant screen
  routeLabel?: string;
}

export interface SkillNode extends SkillDef {
  status: SkillStatus;
  progressCurrent: number;
  progressTotal: number;
  progressPct: number;
}

export interface SkillProgress {
  completedIds: string[];
  earnedXP: number;
  earnedGems: number;
}

// ─── Skill Definitions ───────────────────────────────────────────────────────

export const TIER_LABELS: Record<number, string> = {
  1: 'Foundations',
  2: 'Pitch Basics',
  3: 'Developing Ear',
  4: 'Advanced Technique',
  5: 'Master',
};

export const TIER_COLORS: Record<number, string> = {
  1: '#10B981',  // green
  2: '#06B6D4',  // cyan
  3: '#7C3AED',  // purple
  4: '#F59E0B',  // amber
  5: '#EC4899',  // pink
};

export const SKILL_DEFS: SkillDef[] = [
  // ── TIER 1: Foundations ──────────────────────────────────────────────────
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your very first practice session. Every great singer starts somewhere!',
    icon: '🌱',
    tier: 1,
    xpReward: 50,
    gemReward: 5,
    unlockRequires: {},
    completeRequires: { minSessions: 1 },
    route: '/(tabs)/pitch',
    routeLabel: 'Go Practice',
  },
  {
    id: 'tune_in',
    name: 'Tune In',
    description: 'Practice pitch detection and stay in tune. Get familiar with hearing yourself sing.',
    icon: '🎵',
    tier: 1,
    xpReward: 75,
    gemReward: 8,
    unlockRequires: {},
    completeRequires: { minAccuracy: 50 },
    route: '/(tabs)/pitch',
    routeLabel: 'Train Pitch',
  },
  {
    id: 'warm_body',
    name: 'Warm Body',
    description: 'Complete a vocal warmup routine. Warming up protects your voice and improves tone.',
    icon: '🔥',
    tier: 1,
    xpReward: 50,
    gemReward: 5,
    unlockRequires: {},
    completeRequires: { minWarmupSessions: 1 },
    route: '/(tabs)/warmup',
    routeLabel: 'Warm Up',
  },

  // ── TIER 2: Pitch Basics ─────────────────────────────────────────────────
  {
    id: 'pitch_seeker',
    name: 'Pitch Seeker',
    description: 'Hit 70% accuracy in pitch detection. Your ears are sharpening!',
    icon: '🎯',
    tier: 2,
    xpReward: 100,
    gemReward: 12,
    unlockRequires: { completedSkillIds: ['first_steps', 'tune_in'] },
    completeRequires: { minAccuracy: 70 },
    route: '/(tabs)/pitch',
    routeLabel: 'Train Pitch',
  },
  {
    id: 'scale_starter',
    name: 'Scale Starter',
    description: 'Complete 5 scale exercises. Scales are the foundation of every great vocalist.',
    icon: '🎼',
    tier: 2,
    xpReward: 100,
    gemReward: 12,
    unlockRequires: { completedSkillIds: ['first_steps'] },
    completeRequires: { minScaleSessions: 5 },
    route: '/(tabs)/scales',
    routeLabel: 'Practice Scales',
  },
  {
    id: 'song_bird',
    name: 'Song Bird',
    description: 'Match 3 songs. Singing real music makes practice feel like a performance.',
    icon: '🐦',
    tier: 2,
    xpReward: 100,
    gemReward: 12,
    unlockRequires: { completedSkillIds: ['first_steps', 'tune_in'] },
    completeRequires: { minSongsMatched: 3 },
    route: '/(tabs)/songs',
    routeLabel: 'Match Songs',
  },

  // ── TIER 3: Developing Ear ───────────────────────────────────────────────
  {
    id: 'interval_ear',
    name: 'Interval Ear',
    description: 'Complete 10 interval training sessions. Intervals are the secret weapon of pro singers.',
    icon: '👂',
    tier: 3,
    xpReward: 150,
    gemReward: 18,
    unlockRequires: { completedSkillIds: ['pitch_seeker', 'scale_starter'] },
    completeRequires: { minIntervalSessions: 10 },
    route: '/(tabs)/intervals',
    routeLabel: 'Train Intervals',
  },
  {
    id: 'scale_climber',
    name: 'Scale Climber',
    description: 'Complete 15 scale exercises and build muscle memory across multiple keys.',
    icon: '📈',
    tier: 3,
    xpReward: 150,
    gemReward: 18,
    unlockRequires: { completedSkillIds: ['scale_starter', 'pitch_seeker'] },
    completeRequires: { minScaleSessions: 15 },
    route: '/(tabs)/scales',
    routeLabel: 'Practice Scales',
  },
  {
    id: 'steady_streak',
    name: 'Steady Streak',
    description: 'Practice 3 days in a row. Consistency is more powerful than intensity.',
    icon: '🔗',
    tier: 3,
    xpReward: 125,
    gemReward: 15,
    unlockRequires: { completedSkillIds: ['first_steps', 'warm_body'] },
    completeRequires: { minStreak: 3 },
    route: '/(tabs)/pitch',
    routeLabel: 'Keep Practicing',
  },
  {
    id: 'song_collector',
    name: 'Song Collector',
    description: 'Match 10 songs and expand your repertoire. A great singer knows many songs.',
    icon: '💿',
    tier: 3,
    xpReward: 150,
    gemReward: 18,
    unlockRequires: { completedSkillIds: ['song_bird', 'pitch_seeker'] },
    completeRequires: { minSongsMatched: 10 },
    route: '/(tabs)/songs',
    routeLabel: 'Match Songs',
  },

  // ── TIER 4: Advanced Technique ───────────────────────────────────────────
  {
    id: 'pitch_perfect',
    name: 'Pitch Perfect',
    description: 'Achieve 85%+ average accuracy. Your intonation is becoming professional quality.',
    icon: '⭐',
    tier: 4,
    xpReward: 200,
    gemReward: 25,
    unlockRequires: { completedSkillIds: ['interval_ear', 'scale_climber'] },
    completeRequires: { minAccuracy: 85 },
    route: '/(tabs)/pitch',
    routeLabel: 'Train Pitch',
  },
  {
    id: 'harmony_singer',
    name: 'Harmony Singer',
    description: 'Complete 5 duet/harmony sessions. Two voices are better than one.',
    icon: '🎶',
    tier: 4,
    xpReward: 200,
    gemReward: 25,
    unlockRequires: { completedSkillIds: ['interval_ear', 'song_collector'] },
    completeRequires: { minDuetSessions: 5 },
    route: '/(tabs)/duet',
    routeLabel: 'Practice Harmony',
  },
  {
    id: 'key_master',
    name: 'Key Master',
    description: 'Use key detection to identify 5 keys. Knowing your key is knowing your voice.',
    icon: '🗝️',
    tier: 4,
    xpReward: 175,
    gemReward: 20,
    unlockRequires: { completedSkillIds: ['scale_climber', 'steady_streak'] },
    completeRequires: { minSessions: 30 },
    route: '/(tabs)/key',
    routeLabel: 'Detect Keys',
  },
  {
    id: 'week_warrior',
    name: 'Week Warrior',
    description: 'Hit a 7-day streak. A full week of practice means you\'re building a real habit.',
    icon: '🏆',
    tier: 4,
    xpReward: 200,
    gemReward: 25,
    unlockRequires: { completedSkillIds: ['steady_streak', 'song_collector'] },
    completeRequires: { minStreak: 7 },
    route: '/(tabs)/pitch',
    routeLabel: 'Stay Consistent',
  },

  // ── TIER 5: Master ───────────────────────────────────────────────────────
  {
    id: 'sight_reader',
    name: 'Sight Reader',
    description: 'Complete 10 sight singing exercises. Reading music unlocks an entire world of songs.',
    icon: '📖',
    tier: 5,
    xpReward: 300,
    gemReward: 40,
    unlockRequires: { completedSkillIds: ['pitch_perfect', 'harmony_singer'] },
    completeRequires: { minSightSingSessions: 10 },
    route: '/(tabs)/sightsing',
    routeLabel: 'Sight Sing',
  },
  {
    id: 'vocal_champion',
    name: 'Vocal Champion',
    description: 'Complete 100 total practice sessions. Champions are built through relentless repetition.',
    icon: '🥇',
    tier: 5,
    xpReward: 500,
    gemReward: 75,
    unlockRequires: { completedSkillIds: ['pitch_perfect', 'week_warrior'] },
    completeRequires: { minSessions: 100 },
    route: '/(tabs)/pitch',
    routeLabel: 'Keep Training',
  },
  {
    id: 'voice_master',
    name: 'Voice Master',
    description: 'Achieve all Tier 4 skills. You have mastered every dimension of vocal training.',
    icon: '👑',
    tier: 5,
    xpReward: 1000,
    gemReward: 150,
    unlockRequires: { completedSkillIds: ['sight_reader', 'vocal_champion', 'harmony_singer', 'key_master'] },
    completeRequires: { allSkillsInTier: 4 },
    routeLabel: 'Master All Skills',
  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────

const SKILL_PROGRESS_KEY = 'vt_skill_progress_v1';

export async function loadSkillProgress(): Promise<SkillProgress> {
  try {
    const raw = await AsyncStorage.getItem(SKILL_PROGRESS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { completedIds: [], earnedXP: 0, earnedGems: 0 };
}

export async function saveSkillProgress(sp: SkillProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(SKILL_PROGRESS_KEY, JSON.stringify(sp));
  } catch {}
}

export async function markSkillComplete(id: string, xp: number, gems: number): Promise<SkillProgress> {
  const sp = await loadSkillProgress();
  if (!sp.completedIds.includes(id)) {
    sp.completedIds.push(id);
    sp.earnedXP += xp;
    sp.earnedGems += gems;
    await saveSkillProgress(sp);
  }
  return sp;
}

// ─── Evaluation Helpers ───────────────────────────────────────────────────────

function countByType(sessions: any[], type: string): number {
  return sessions?.filter(s => s.type === type).length ?? 0;
}

function countSongs(progress: UserProgress): number {
  return progress.sessions?.filter(s => s.type === 'song').length ?? 0;
}

function checkCompletionRule(
  rule: SkillCompletionRule,
  progress: UserProgress,
  completedSkillIds: string[],
): { met: boolean; current: number; total: number } {
  const sessions = progress.sessions ?? [];

  if (rule.minSessions !== undefined) {
    return { met: progress.totalSessions >= rule.minSessions, current: progress.totalSessions, total: rule.minSessions };
  }
  if (rule.minAccuracy !== undefined) {
    return { met: progress.avgAccuracy >= rule.minAccuracy, current: progress.avgAccuracy, total: rule.minAccuracy };
  }
  if (rule.minSongsMatched !== undefined) {
    const n = countSongs(progress);
    return { met: n >= rule.minSongsMatched, current: n, total: rule.minSongsMatched };
  }
  if (rule.minScaleSessions !== undefined) {
    const n = countByType(sessions, 'scale');
    return { met: n >= rule.minScaleSessions, current: n, total: rule.minScaleSessions };
  }
  if (rule.minIntervalSessions !== undefined) {
    const n = sessions.filter(s => s.exerciseId?.startsWith('int_') || s.type === 'interval').length;
    return { met: n >= rule.minIntervalSessions, current: n, total: rule.minIntervalSessions };
  }
  if (rule.minWarmupSessions !== undefined) {
    const n = countByType(sessions, 'warmup');
    return { met: n >= rule.minWarmupSessions, current: n, total: rule.minWarmupSessions };
  }
  if (rule.minDuetSessions !== undefined) {
    const n = sessions.filter(s => s.exerciseId?.startsWith('duet_') || s.type === 'duet').length;
    return { met: n >= rule.minDuetSessions, current: n, total: rule.minDuetSessions };
  }
  if (rule.minSightSingSessions !== undefined) {
    const n = sessions.filter(s => s.exerciseId?.startsWith('ss_') || s.type === 'sightsing').length;
    return { met: n >= rule.minSightSingSessions, current: n, total: rule.minSightSingSessions };
  }
  if (rule.minStreak !== undefined) {
    return { met: progress.currentStreak >= rule.minStreak || progress.longestStreak >= rule.minStreak, current: Math.max(progress.currentStreak, progress.longestStreak), total: rule.minStreak };
  }
  if (rule.minXP !== undefined) {
    return { met: progress.xp >= rule.minXP, current: progress.xp, total: rule.minXP };
  }
  if (rule.allSkillsInTier !== undefined) {
    const tierDefs = SKILL_DEFS.filter(d => d.tier === rule.allSkillsInTier);
    const n = tierDefs.filter(d => completedSkillIds.includes(d.id)).length;
    return { met: n >= tierDefs.length, current: n, total: tierDefs.length };
  }
  return { met: false, current: 0, total: 1 };
}

function checkUnlockRequires(req: SkillRequirement, progress: UserProgress, completedIds: string[]): boolean {
  if (req.minXP !== undefined && progress.xp < req.minXP) return false;
  if (req.minSessions !== undefined && progress.totalSessions < req.minSessions) return false;
  if (req.minStreak !== undefined && progress.currentStreak < req.minStreak && progress.longestStreak < req.minStreak) return false;
  if (req.completedSkillIds) {
    for (const id of req.completedSkillIds) {
      if (!completedIds.includes(id)) return false;
    }
  }
  return true;
}

// ─── Main Resolver ────────────────────────────────────────────────────────────

export function resolveSkillNodes(progress: UserProgress, skillProgress: SkillProgress): SkillNode[] {
  const completedIds = skillProgress.completedIds;

  return SKILL_DEFS.map(def => {
    const alreadyCompleted = completedIds.includes(def.id);
    const unlocked = checkUnlockRequires(def.unlockRequires, progress, completedIds);

    let { met, current, total } = checkCompletionRule(def.completeRequires, progress, completedIds);

    let status: SkillStatus;
    if (alreadyCompleted) {
      status = 'completed';
    } else if (!unlocked) {
      status = 'locked';
    } else if (current > 0) {
      status = 'in_progress';
    } else {
      status = 'available';
    }

    return {
      ...def,
      status,
      progressCurrent: Math.min(current, total),
      progressTotal: total,
      progressPct: total > 0 ? Math.min(1, current / total) : 0,
    };
  });
}

// ─── Auto-complete checker ────────────────────────────────────────────────────
// Call this after every session to auto-mark newly completed skills

export async function checkAndAwardSkills(
  progress: UserProgress,
): Promise<{ newlyCompleted: SkillNode[]; skillProgress: SkillProgress }> {
  const skillProgress = await loadSkillProgress();
  const nodes = resolveSkillNodes(progress, skillProgress);
  const newlyCompleted: SkillNode[] = [];

  for (const node of nodes) {
    if (node.status !== 'completed' && node.progressPct >= 1) {
      const updated = await markSkillComplete(node.id, node.xpReward, node.gemReward);
      skillProgress.completedIds = updated.completedIds;
      skillProgress.earnedXP = updated.earnedXP;
      skillProgress.earnedGems = updated.earnedGems;
      newlyCompleted.push(node);
    }
  }

  return { newlyCompleted, skillProgress };
}
