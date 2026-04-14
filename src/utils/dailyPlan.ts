import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProgress, loadProgress, loadVocalRange, getBests } from './storage';
import { loadSkillProgress, resolveSkillNodes, SKILL_DEFS } from './skillTree';
import { EXERCISES, SONG_MELODIES } from './scales';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlanStepType = 'warmup' | 'scale' | 'song' | 'pitch' | 'intervals' | 'sightsing' | 'duet' | 'key';

export interface PlanStep {
  id: string;
  type: PlanStepType;
  title: string;
  subtitle: string;
  duration: string;       // e.g. "3 min"
  icon: string;
  route: string;
  tip: string;
  xpBonus: number;
}

export interface DailyPlan {
  date: string;           // YYYY-MM-DD
  greeting: string;       // e.g. "Good morning, Justin!"
  focusArea: string;      // e.g. "Pitch Accuracy"
  summary: string;        // 1-2 sentence overview
  totalDuration: string;  // e.g. "15 min"
  steps: PlanStep[];
  generatedAt: number;
  completedStepIds: string[];
  motivationalNote: string;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

const DAILY_PLAN_KEY = 'vt_daily_plan_v1';

export async function loadDailyPlan(): Promise<DailyPlan | null> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_PLAN_KEY);
    if (!raw) return null;
    const plan: DailyPlan = JSON.parse(raw);
    const today = getTodayKey();
    if (plan.date !== today) return null; // Expired — new day
    return plan;
  } catch { return null; }
}

export async function saveDailyPlan(plan: DailyPlan): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(plan));
  } catch {}
}

export async function markStepComplete(stepId: string): Promise<void> {
  const plan = await loadDailyPlan();
  if (!plan) return;
  if (!plan.completedStepIds.includes(stepId)) {
    plan.completedStepIds.push(stepId);
    await saveDailyPlan(plan);
  }
}

export async function clearDailyPlan(): Promise<void> {
  try { await AsyncStorage.removeItem(DAILY_PLAN_KEY); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function greetingFromTime(time: 'morning' | 'afternoon' | 'evening'): string {
  if (time === 'morning') return 'Good morning!';
  if (time === 'afternoon') return 'Good afternoon!';
  return 'Good evening!';
}

const ROUTE_MAP: Record<PlanStepType, string> = {
  warmup:    '/(tabs)/warmup',
  scale:     '/(tabs)/scales',
  song:      '/(tabs)/songs',
  pitch:     '/(tabs)/pitch',
  intervals: '/(tabs)/intervals',
  sightsing: '/(tabs)/sightsing',
  duet:      '/(tabs)/duet',
  key:       '/(tabs)/key',
};

const ICON_MAP: Record<PlanStepType, string> = {
  warmup:    '🔥',
  scale:     '🎼',
  song:      '🎶',
  pitch:     '🎵',
  intervals: '👂',
  sightsing: '📖',
  duet:      '🎤',
  key:       '🗝️',
};

// ─── Fallback plan builder (no API key needed) ────────────────────────────────

function buildFallbackPlan(progress: UserProgress): DailyPlan {
  const time = getTimeOfDay();
  const sessions = progress.sessions ?? [];
  const scaleSessions = sessions.filter(s => s.type === 'scale').length;
  const songSessions = sessions.filter(s => s.type === 'song').length;
  const avgAcc = progress.avgAccuracy;

  const steps: PlanStep[] = [];

  // Always start with warmup
  steps.push({
    id: 'warmup_daily',
    type: 'warmup',
    title: 'Vocal Warmup',
    subtitle: 'Prep your voice before anything else',
    duration: '3 min',
    icon: '🔥',
    route: ROUTE_MAP.warmup,
    tip: 'Start slow — hum on a comfortable pitch and let your voice wake up naturally.',
    xpBonus: 15,
  });

  // Pitch if accuracy < 80
  if (avgAcc < 80 || progress.totalSessions < 5) {
    steps.push({
      id: 'pitch_daily',
      type: 'pitch',
      title: 'Pitch Accuracy',
      subtitle: 'Real-time pitch detection training',
      duration: '5 min',
      icon: '🎵',
      route: ROUTE_MAP.pitch,
      tip: 'Focus on landing the note cleanly rather than speed. Precision beats rushing.',
      xpBonus: 20,
    });
  }

  // Scales
  steps.push({
    id: 'scale_daily',
    type: 'scale',
    title: 'Scale Exercises',
    subtitle: scaleSessions < 10 ? 'Build your foundation' : 'Reinforce muscle memory',
    duration: '5 min',
    icon: '🎼',
    route: ROUTE_MAP.scale,
    tip: scaleSessions < 5
      ? 'Start with Do-Re-Mi to lock in the major scale pattern.'
      : 'Try a new scale today — minor or pentatonic adds color to your voice.',
    xpBonus: 20,
  });

  // Song if they've done some sessions
  if (progress.totalSessions >= 2) {
    steps.push({
      id: 'song_daily',
      type: 'song',
      title: 'Song Matching',
      subtitle: songSessions < 5 ? 'Try your first songs' : 'Hit a new personal best',
      duration: '5 min',
      icon: '🎶',
      route: ROUTE_MAP.song,
      tip: 'Pick a song slightly easier than your hardest — nail it perfectly, then push harder.',
      xpBonus: 25,
    });
  }

  // Intervals if advanced enough
  if (progress.totalSessions >= 10) {
    steps.push({
      id: 'interval_daily',
      type: 'intervals',
      title: 'Interval Training',
      subtitle: 'Sharpen your ear',
      duration: '4 min',
      icon: '👂',
      route: ROUTE_MAP.intervals,
      tip: 'Interval training is the fastest way to improve sight-reading and harmonizing.',
      xpBonus: 20,
    });
  }

  const totalMins = steps.reduce((acc, s) => acc + parseInt(s.duration), 0);

  return {
    date: getTodayKey(),
    greeting: greetingFromTime(time),
    focusArea: avgAcc < 70 ? 'Pitch Accuracy' : scaleSessions < 10 ? 'Scale Foundations' : 'Song Repertoire',
    summary: avgAcc < 70
      ? "Today's focus is pitch accuracy — your ear is the most important instrument you own."
      : "You're building solid foundations. Stay consistent and you'll see a big jump in range this week.",
    totalDuration: `${totalMins} min`,
    steps,
    generatedAt: Date.now(),
    completedStepIds: [],
    motivationalNote: progress.currentStreak > 3
      ? `🔥 ${progress.currentStreak}-day streak! Keep the fire burning.`
      : "Every great singer started exactly where you are right now.",
  };
}

// ─── Claude-powered plan generation ──────────────────────────────────────────

async function buildSystemContext(progress: UserProgress): Promise<string> {
  const [range, bests, skillProg] = await Promise.all([
    loadVocalRange(), getBests(), loadSkillProgress(),
  ]);

  const sessions = progress.sessions ?? [];
  const weakSpots = Object.entries(bests)
    .filter(([, b]: any) => b.accuracy < 75 && b.attempts >= 2)
    .map(([id]: any) => {
      const ex = EXERCISES.find(e => e.id === id) || SONG_MELODIES.find(s => s.id === id);
      return ex ? `${ex.name} (${(bests[id] as any).accuracy}% best accuracy)` : null;
    })
    .filter(Boolean)
    .slice(0, 4);

  const nodes = resolveSkillNodes(progress, skillProg);
  const inProgress = nodes.filter(n => n.status === 'in_progress').map(n => n.name);
  const available = nodes.filter(n => n.status === 'available').map(n => n.name);

  const scaleSessions = sessions.filter(s => s.type === 'scale').length;
  const songSessions  = sessions.filter(s => s.type === 'song').length;
  const warmupSessions = sessions.filter(s => s.type === 'warmup').length;

  return `Singer profile for daily plan generation:
- Level: ${progress.level} (${progress.xp} XP total)
- Total sessions: ${progress.totalSessions} | Avg accuracy: ${progress.avgAccuracy}%
- Current streak: ${progress.currentStreak} days | Best streak: ${progress.longestStreak} days
- Scale sessions: ${scaleSessions} | Song sessions: ${songSessions} | Warmup sessions: ${warmupSessions}
- Vocal range: ${range ? `${range.lowNote}–${range.highNote} (${range.voiceType})` : 'not tested yet'}
- Weak spots: ${weakSpots.length > 0 ? weakSpots.join(', ') : 'none identified yet'}
- Skill tree in progress: ${inProgress.length > 0 ? inProgress.join(', ') : 'none yet'}
- Next available skills to unlock: ${available.slice(0, 3).join(', ') || 'none'}
- Time of day: ${getTimeOfDay()}`;
}

export async function generateDailyPlan(forceRegenerate = false): Promise<DailyPlan> {
  // Return cached plan if same day and not forcing regeneration
  if (!forceRegenerate) {
    const cached = await loadDailyPlan();
    if (cached) return cached;
  }

  const progress = await loadProgress();

  // Try Claude API
  try {
    const systemCtx = await buildSystemContext(progress);
    const time = getTimeOfDay();

    const prompt = `Generate a personalized daily vocal practice plan for this singer. 
Return ONLY valid JSON matching this exact TypeScript interface (no markdown, no explanation):

{
  "greeting": "string (e.g. 'Good ${time}!')",
  "focusArea": "string (2-4 words, e.g. 'Pitch Accuracy')",
  "summary": "string (1-2 sentences explaining today's focus and why)",
  "totalDuration": "string (e.g. '15 min')",
  "motivationalNote": "string (short motivational line referencing their streak or progress)",
  "steps": [
    {
      "id": "unique_id",
      "type": "one of: warmup|scale|song|pitch|intervals|sightsing|duet|key",
      "title": "string (exercise title)",
      "subtitle": "string (short description)",
      "duration": "string (e.g. '3 min')",
      "tip": "string (one specific actionable tip for this step)"
    }
  ]
}

Rules:
- Always start with warmup as step 1
- 3-5 steps total, totaling 12-18 minutes
- Choose types based on their weak spots and skill tree gaps
- Keep tips specific and actionable, not generic
- The motivational note should mention their ${progress.currentStreak}-day streak if > 0
- Make xpBonus appropriate: warmup=15, pitch=20, scale=20, song=25, others=20`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemCtx,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = (data.content?.[0]?.text ?? '').replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(text);

      // Enrich steps with route, icon, xpBonus from type
      const enrichedSteps: PlanStep[] = (parsed.steps ?? []).map((s: any) => ({
        ...s,
        icon: ICON_MAP[s.type as PlanStepType] ?? '🎵',
        route: ROUTE_MAP[s.type as PlanStepType] ?? '/(tabs)/pitch',
        xpBonus: s.xpBonus ?? (s.type === 'song' ? 25 : 20),
      }));

      const plan: DailyPlan = {
        date: getTodayKey(),
        greeting: parsed.greeting ?? greetingFromTime(time),
        focusArea: parsed.focusArea ?? 'Vocal Training',
        summary: parsed.summary ?? '',
        totalDuration: parsed.totalDuration ?? '15 min',
        steps: enrichedSteps,
        generatedAt: Date.now(),
        completedStepIds: [],
        motivationalNote: parsed.motivationalNote ?? '',
      };

      await saveDailyPlan(plan);
      return plan;
    }
  } catch (_) {
    // Fall through to fallback
  }

  // Fallback plan (works without API key)
  const fallback = buildFallbackPlan(progress);
  await saveDailyPlan(fallback);
  return fallback;
}
