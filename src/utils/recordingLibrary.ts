import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionReplay, loadRecentReplays, loadReplay } from './sessionReplay';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecordingMeta {
  sessionId: string;
  customTitle?: string;       // user-set name, falls back to exerciseName
  isFavorite: boolean;
  notes?: string;             // personal note
  savedAt: number;            // when they explicitly saved it to library
}

export interface LibraryEntry {
  replay: SessionReplay;
  meta: RecordingMeta;
}

export interface AccuracyPoint {
  date: number;               // unix ms
  accuracy: number;
  sessionId: string;
  label: string;              // e.g. "Jun 3"
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const META_KEY = 'vt_recording_meta_v1';   // Record<sessionId, RecordingMeta>

// ─── Meta helpers ─────────────────────────────────────────────────────────────

async function loadAllMeta(): Promise<Record<string, RecordingMeta>> {
  try {
    const raw = await AsyncStorage.getItem(META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveMeta(meta: Record<string, RecordingMeta>): Promise<void> {
  try { await AsyncStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Load all replays enriched with user metadata, newest first */
export async function loadLibrary(limit = 20): Promise<LibraryEntry[]> {
  const [replays, allMeta] = await Promise.all([
    loadRecentReplays(limit),
    loadAllMeta(),
  ]);

  return replays.map(replay => ({
    replay,
    meta: allMeta[replay.sessionId] ?? {
      sessionId: replay.sessionId,
      isFavorite: false,
      savedAt: replay.startedAt,
    },
  }));
}

/** Toggle favorite status for a recording */
export async function toggleFavorite(sessionId: string): Promise<boolean> {
  const allMeta = await loadAllMeta();
  const current = allMeta[sessionId] ?? { sessionId, isFavorite: false, savedAt: Date.now() };
  const updated = { ...current, isFavorite: !current.isFavorite };
  allMeta[sessionId] = updated;
  await saveMeta(allMeta);
  return updated.isFavorite;
}

/** Update custom title for a recording */
export async function updateTitle(sessionId: string, title: string): Promise<void> {
  const allMeta = await loadAllMeta();
  allMeta[sessionId] = {
    ...(allMeta[sessionId] ?? { sessionId, isFavorite: false, savedAt: Date.now() }),
    customTitle: title.trim() || undefined,
  };
  await saveMeta(allMeta);
}

/** Save personal notes on a recording */
export async function updateNotes(sessionId: string, notes: string): Promise<void> {
  const allMeta = await loadAllMeta();
  allMeta[sessionId] = {
    ...(allMeta[sessionId] ?? { sessionId, isFavorite: false, savedAt: Date.now() }),
    notes: notes.trim() || undefined,
  };
  await saveMeta(allMeta);
}

/** Delete metadata for a recording (replay itself stays until evicted by new saves) */
export async function deleteRecordingMeta(sessionId: string): Promise<void> {
  const allMeta = await loadAllMeta();
  delete allMeta[sessionId];
  await saveMeta(allMeta);
}

/** Get display title — custom name or exercise name */
export function getTitle(entry: LibraryEntry): string {
  return entry.meta.customTitle ?? entry.replay.exerciseName;
}

/** Get accuracy trend for a given exercise name (for comparison chart) */
export async function getAccuracyTrend(exerciseName: string, limit = 20): Promise<AccuracyPoint[]> {
  const replays = await loadRecentReplays(limit);
  return replays
    .filter(r => r.exerciseName === exerciseName)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map(r => {
      const d = new Date(r.startedAt);
      return {
        date: r.startedAt,
        accuracy: r.accuracy,
        sessionId: r.sessionId,
        label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      };
    });
}

/** Mini waveform data — downsample pitch samples to N buckets for sparkline */
export function buildSparkline(
  replay: SessionReplay,
  buckets = 40,
): number[] {
  const valid = replay.samples.filter(s => s.freq > 0 && s.note !== '-');
  if (valid.length < 2) return Array(buckets).fill(0.5);

  const result: number[] = [];
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor((i / buckets) * valid.length);
    const end = Math.floor(((i + 1) / buckets) * valid.length);
    const slice = valid.slice(start, end);
    if (slice.length === 0) { result.push(0.5); continue; }
    const avgCents = slice.reduce((a, s) => a + s.cents, 0) / slice.length;
    // Map -60..+60 cents → 0..1 (0.5 = on pitch)
    result.push(0.5 - Math.max(-0.5, Math.min(0.5, avgCents / 120)));
  }
  return result;
}

/** Format duration ms → "1m 23s" */
export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

/** Format timestamp → relative label */
export function formatRelativeDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
