import type { Celebration } from '../contexts/CelebrationContext';
import { ACHIEVEMENT_DEFS, type SessionResult, type UserProgress } from './storage';

/**
 * Streak milestones we want to celebrate (in addition to streak-7 awarding a freeze).
 * Hat-trick (3), 14, 30, 50, 100 — keep moments meaningful, not noisy.
 */
const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100]);

interface BuildSessionCelebrationsArgs {
  /** New achievement IDs unlocked this session (from saveSession.newAchievements). */
  newAchievements: string[];
  /** Whether a freeze was just awarded for crossing a milestone. */
  freezeEarned: boolean;
  /** How many freezes were auto-consumed to bridge missed days. */
  freezesConsumed: number;
  /** Streak after this session (for milestone detection). */
  currentStreak: number;
  /** XP level before/after — used to detect level-up. */
  prevLevel?: UserProgress['level'];
  newLevel?: UserProgress['level'];
  /** Whether the weekly challenge crossed completion this session. */
  weeklyJustCompleted?: boolean;
  /** Title of the weekly challenge (for the body text). */
  weeklyChallengeTitle?: string;
  /** Whether the user just set a new personal best on this exercise. */
  personalBest?: boolean;
  /** The session itself, used for personal-best context. */
  session?: SessionResult;
}

/**
 * Build a list of celebrations to enqueue, in the right order, deduplicated.
 *
 * Order priority (the toast queue plays them in this order so the biggest
 * reward shows last and lingers in memory):
 *   1. freezes auto-used      (informational)
 *   2. personal best          (small purple)
 *   3. freeze earned          (small blue)
 *   4. streak milestone       (orange + confetti)
 *   5. level up               (purple + confetti)
 *   6. achievements           (gold + confetti, one per achievement)
 *   7. weekly challenge done  (green + confetti — biggest celebration)
 */
export function buildSessionCelebrations(
  args: BuildSessionCelebrationsArgs
): Omit<Celebration, 'id'>[] {
  const out: Omit<Celebration, 'id'>[] = [];

  // 1. Freezes consumed (informational)
  if (args.freezesConsumed > 0) {
    const days = args.freezesConsumed;
    out.push({
      kind: 'freeze_used',
      title: days === 1 ? 'Streak Freeze used' : `${days} Streak Freezes used`,
      body: days === 1
        ? 'A frozen day protected your streak — keep it going!'
        : `${days} frozen days protected your streak — welcome back!`,
      durationMs: 4000,
    });
  }

  // 2. Personal best
  if (args.personalBest && args.session) {
    out.push({
      kind: 'personal_best',
      title: 'New Personal Best!',
      body: `${args.session.exerciseName} • ${args.session.accuracy}% accuracy`,
      durationMs: 3500,
    });
  }

  // 3. Freeze earned
  if (args.freezeEarned) {
    out.push({
      kind: 'freeze_earned',
      title: 'Streak Freeze earned!',
      body: 'You can miss a day without losing your streak. Use it wisely.',
      durationMs: 3800,
    });
  }

  // 4. Streak milestone
  if (STREAK_MILESTONES.has(args.currentStreak)) {
    out.push({
      kind: 'streak_milestone',
      title: `${args.currentStreak}-Day Streak! 🔥`,
      body: streakBodyFor(args.currentStreak),
      durationMs: 4000,
    });
  }

  // 5. Level up
  if (args.prevLevel && args.newLevel && args.prevLevel !== args.newLevel) {
    const labels: Record<UserProgress['level'], string> = {
      beginner: 'Beginner',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
    };
    out.push({
      kind: 'level_up',
      title: `Level Up! ${labels[args.newLevel]}`,
      body: `You've leveled up from ${labels[args.prevLevel]}. Bigger challenges unlocked.`,
      durationMs: 4500,
    });
  }

  // 6. Achievements
  for (const id of args.newAchievements) {
    const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
    if (!def) continue;
    out.push({
      kind: 'achievement',
      title: 'Achievement Unlocked!',
      body: `${def.name} — ${def.desc}`,
      emoji: def.icon,
      rewards: { gems: def.gems },
      durationMs: 4000,
    });
  }

  // 7. Weekly challenge complete
  if (args.weeklyJustCompleted) {
    out.push({
      kind: 'weekly_complete',
      title: 'Weekly Challenge Complete!',
      body: args.weeklyChallengeTitle
        ? `${args.weeklyChallengeTitle} — claim your reward on the home screen.`
        : 'Claim your reward on the home screen.',
      rewards: { gems: 50, xp: 200 },
      durationMs: 5000,
    });
  }

  return out;
}

function streakBodyFor(days: number): string {
  if (days === 3) return "Three days in a row — you're building the habit!";
  if (days === 7) return 'A full week of practice. Consistency is everything.';
  if (days === 14) return 'Two weeks running. This is what mastery looks like.';
  if (days === 30) return "A whole month! You're a Voice Trainer regular now.";
  if (days === 50) return '50 days. Your dedication is genuinely impressive.';
  if (days === 100) return '💯 days. You are officially a force of nature.';
  return `${days} days of practice — incredible consistency.`;
}
