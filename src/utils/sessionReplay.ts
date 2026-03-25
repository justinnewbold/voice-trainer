// ─── Session Replay Types ─────────────────────────────────────────────────────

export interface PitchSample {
  t: number;          // timestamp ms from session start
  note: string;       // detected note name e.g. "C"
  octave: number;
  cents: number;      // deviation from target (-100 to +100)
  freq: number;       // raw frequency Hz
  targetNote: string; // expected note name
  targetMidi: number; // expected MIDI note
  hit: boolean;       // was this note correctly matched?
}

export interface SessionReplay {
  sessionId: string;
  exerciseName: string;
  type: 'scale' | 'song';
  startedAt: number;
  durationMs: number;
  samples: PitchSample[];
  noteResults: NoteResult[]; // one entry per target note
  accuracy: number;
  score?: number;
}

export interface NoteResult {
  targetNote: string;
  targetMidi: number;
  sungNote: string;
  cents: number;
  hit: boolean;
  timeToHit?: number; // ms it took to hit
}

// ─── Replay Builder ───────────────────────────────────────────────────────────
// Created once per exercise session, accumulates pitch samples.

export function createReplayBuilder(exerciseName: string, type: 'scale' | 'song') {
  const startedAt = Date.now();
  const samples: PitchSample[] = [];
  const noteResults: NoteResult[] = [];

  return {
    addSample(sample: Omit<PitchSample, 't'>) {
      samples.push({ ...sample, t: Date.now() - startedAt });
    },

    recordNoteResult(result: NoteResult) {
      noteResults.push(result);
    },

    build(accuracy: number, score?: number): SessionReplay {
      return {
        sessionId: `${startedAt}`,
        exerciseName,
        type,
        startedAt,
        durationMs: Date.now() - startedAt,
        samples: samples.slice(-500), // cap at 500 samples
        noteResults,
        accuracy,
        score,
      };
    },
  };
}

// ─── Replay Storage ───────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPLAY_PREFIX = 'vt_replay_';
const REPLAY_INDEX_KEY = 'vt_replay_index';
const MAX_REPLAYS = 20;

export async function saveReplay(replay: SessionReplay): Promise<void> {
  try {
    // Get index
    const raw = await AsyncStorage.getItem(REPLAY_INDEX_KEY);
    const index: string[] = raw ? JSON.parse(raw) : [];

    // Save replay
    await AsyncStorage.setItem(REPLAY_PREFIX + replay.sessionId, JSON.stringify(replay));

    // Update index (newest first, cap at MAX_REPLAYS)
    const newIndex = [replay.sessionId, ...index.filter(id => id !== replay.sessionId)].slice(0, MAX_REPLAYS);

    // Clean up evicted replays
    const evicted = index.slice(MAX_REPLAYS - 1);
    for (const id of evicted) {
      await AsyncStorage.removeItem(REPLAY_PREFIX + id).catch(() => {});
    }

    await AsyncStorage.setItem(REPLAY_INDEX_KEY, JSON.stringify(newIndex));
  } catch {}
}

export async function loadReplay(sessionId: string): Promise<SessionReplay | null> {
  try {
    const raw = await AsyncStorage.getItem(REPLAY_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function loadRecentReplays(limit = 10): Promise<SessionReplay[]> {
  try {
    const raw = await AsyncStorage.getItem(REPLAY_INDEX_KEY);
    const index: string[] = raw ? JSON.parse(raw) : [];
    const replays = await Promise.all(index.slice(0, limit).map(id => loadReplay(id)));
    return replays.filter(Boolean) as SessionReplay[];
  } catch { return []; }
}

// ─── Replay Analysis Helpers ──────────────────────────────────────────────────

export function analyzeReplay(replay: SessionReplay) {
  const { samples, noteResults } = replay;

  // Average cents deviation (absolute)
  const validSamples = samples.filter(s => s.note !== '-' && s.freq > 0);
  const avgCentsOff = validSamples.length > 0
    ? Math.round(validSamples.reduce((a, s) => a + Math.abs(s.cents), 0) / validSamples.length)
    : 0;

  // Worst notes (consistently off)
  const noteCounts: Record<string, { total: number; offTotal: number }> = {};
  for (const s of validSamples) {
    if (!noteCounts[s.targetNote]) noteCounts[s.targetNote] = { total: 0, offTotal: 0 };
    noteCounts[s.targetNote].total++;
    if (Math.abs(s.cents) > 20) noteCounts[s.targetNote].offTotal++;
  }
  const worstNotes = Object.entries(noteCounts)
    .filter(([, v]) => v.total >= 2)
    .map(([note, v]) => ({ note, offPct: Math.round((v.offTotal / v.total) * 100) }))
    .sort((a, b) => b.offPct - a.offPct)
    .slice(0, 3);

  // Sharp vs flat tendency
  const signedAvg = validSamples.length > 0
    ? validSamples.reduce((a, s) => a + s.cents, 0) / validSamples.length
    : 0;
  const tendency = Math.abs(signedAvg) < 5 ? 'centered' : signedAvg > 0 ? 'sharp' : 'flat';

  // Miss streak (longest consecutive misses)
  let maxMissStreak = 0, streak = 0;
  for (const nr of noteResults) {
    if (!nr.hit) { streak++; maxMissStreak = Math.max(maxMissStreak, streak); }
    else streak = 0;
  }

  return { avgCentsOff, worstNotes, tendency, maxMissStreak };
}

// ─── SVG Path Generator for pitch graph ──────────────────────────────────────

export function buildPitchPath(samples: PitchSample[], width: number, height: number): string {
  if (samples.length < 2) return '';
  const validSamples = samples.filter(s => s.note !== '-');
  if (validSamples.length < 2) return '';

  const maxT = validSamples[validSamples.length - 1].t || 1;
  const points = validSamples.map(s => {
    const x = (s.t / maxT) * width;
    // Map cents -60..+60 to height..0
    const y = height / 2 - (Math.max(-60, Math.min(60, s.cents)) / 60) * (height / 2 - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return 'M ' + points.join(' L ');
}
