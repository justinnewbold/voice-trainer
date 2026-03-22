// ─── Krumhansl-Kessler Key Profiles ──────────────────────────────────────────
// These empirically-derived profiles describe how well each pitch class
// fits within a given major or minor key. Higher = more characteristic.

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ENHARMONIC: Record<string, string> = {
  'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
};

// Major scale intervals (semitones from root): W W H W W W H
const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
// Natural minor scale intervals
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

export interface KeyResult {
  root: string;           // e.g. "G"
  mode: 'major' | 'minor';
  label: string;          // e.g. "G major"
  confidence: number;     // 0–100
  scaleNotes: string[];   // the 7 notes of the scale
  relativeKey: string;    // e.g. "E minor"
  chromagram: number[];   // 12-element normalised chromagram
  allScores: { key: string; score: number }[]; // ranked list for UI
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denomA = 0, denomB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db;
    denomA += da * da;
    denomB += db * db;
  }
  if (denomA === 0 || denomB === 0) return 0;
  return num / Math.sqrt(denomA * denomB);
}

function rotateProfile(profile: number[], semitones: number): number[] {
  const n = profile.length;
  const rot: number[] = new Array(n);
  for (let i = 0; i < n; i++) rot[i] = profile[(i - semitones + n) % n];
  return rot;
}

function getScaleNotes(rootIdx: number, intervals: number[]): string[] {
  return intervals.map(interval => {
    const idx = (rootIdx + interval) % 12;
    const note = NOTE_NAMES[idx];
    // Prefer flat notation for certain keys
    return ENHARMONIC[note] || note;
  });
}

function getRelativeKey(root: string, mode: 'major' | 'minor'): string {
  const rootIdx = NOTE_NAMES.indexOf(root) !== -1
    ? NOTE_NAMES.indexOf(root)
    : Object.entries(ENHARMONIC).findIndex(([, v]) => v === root);
  if (rootIdx === -1) return '';
  if (mode === 'major') {
    // Relative minor is 9 semitones up (or 3 semitones down)
    const relIdx = (rootIdx + 9) % 12;
    const relNote = NOTE_NAMES[relIdx];
    return `${ENHARMONIC[relNote] || relNote} minor`;
  } else {
    // Relative major is 3 semitones up
    const relIdx = (rootIdx + 3) % 12;
    const relNote = NOTE_NAMES[relIdx];
    return `${ENHARMONIC[relNote] || relNote} major`;
  }
}

export function detectKey(chromagram: number[]): KeyResult | null {
  if (chromagram.every(v => v === 0)) return null;

  // Normalise chromagram
  const total = chromagram.reduce((s, v) => s + v, 0);
  const norm = total > 0 ? chromagram.map(v => v / total) : [...chromagram];

  const scores: { rootIdx: number; mode: 'major' | 'minor'; score: number }[] = [];

  for (let root = 0; root < 12; root++) {
    const majorScore = pearsonCorrelation(norm, rotateProfile(MAJOR_PROFILE, root));
    const minorScore = pearsonCorrelation(norm, rotateProfile(MINOR_PROFILE, root));
    scores.push({ rootIdx: root, mode: 'major', score: majorScore });
    scores.push({ rootIdx: root, mode: 'minor', score: minorScore });
  }

  scores.sort((a, b) => b.score - a.score);

  const best = scores[0];
  const worst = scores[scores.length - 1];
  const range = best.score - worst.score;

  // Confidence: how much better is best vs second-best, normalised 0–100
  const secondBest = scores[1];
  const gap = best.score - secondBest.score;
  const confidence = range > 0 ? Math.min(100, Math.round((gap / range) * 200)) : 0;

  const rootNote = NOTE_NAMES[best.rootIdx];
  const displayRoot = ENHARMONIC[rootNote] || rootNote;
  const intervals = best.mode === 'major' ? MAJOR_INTERVALS : MINOR_INTERVALS;
  const scaleNotes = getScaleNotes(best.rootIdx, intervals);
  const relativeKey = getRelativeKey(rootNote, best.mode);

  // Top 6 ranked keys for UI
  const allScores = scores.slice(0, 6).map(s => {
    const n = NOTE_NAMES[s.rootIdx];
    return { key: `${ENHARMONIC[n] || n} ${s.mode}`, score: Math.round(s.score * 100) };
  });

  return {
    root: displayRoot,
    mode: best.mode,
    label: `${displayRoot} ${best.mode}`,
    confidence,
    scaleNotes,
    relativeKey,
    chromagram: norm,
    allScores,
  };
}

// ─── Rolling Chromagram Builder ───────────────────────────────────────────────
// Accumulates MIDI note detections into a 12-bin chromagram with time decay.

export function createChromaAccumulator(decayRate = 0.97) {
  // 12-bin chroma (pitch class) counts with exponential decay
  let chroma = new Array(12).fill(0);
  let noteCount = 0;

  return {
    addNote(midiNote: number, confidence: number) {
      if (midiNote <= 0) return;
      // Apply decay to existing values
      chroma = chroma.map(v => v * decayRate);
      // Add new note
      const pitchClass = ((midiNote % 12) + 12) % 12;
      chroma[pitchClass] += confidence;
      noteCount++;
    },
    getChroma(): number[] {
      return [...chroma];
    },
    reset() {
      chroma = new Array(12).fill(0);
      noteCount = 0;
    },
    getNoteCount(): number {
      return noteCount;
    },
    hasEnoughData(): boolean {
      return noteCount >= 8;
    },
  };
}

// Helper: given a detected key, is a given note in the scale?
export function isNoteInKey(noteName: string, keyResult: KeyResult): boolean {
  // Strip octave number
  const bare = noteName.replace(/\d/g, '');
  return keyResult.scaleNotes.includes(bare);
}

// Helper: get Roman numeral chord names for a key's scale degrees
export function getScaleDegrees(keyResult: KeyResult): { note: string; roman: string; quality: string }[] {
  const majorDegrees = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
  const minorDegrees = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
  const majorQualities = ['Major', 'minor', 'minor', 'Major', 'Major', 'minor', 'dim'];
  const minorQualities = ['minor', 'dim', 'Major', 'minor', 'minor', 'Major', 'Major'];

  const degrees = keyResult.mode === 'major' ? majorDegrees : minorDegrees;
  const qualities = keyResult.mode === 'major' ? majorQualities : minorQualities;

  return keyResult.scaleNotes.map((note, i) => ({
    note,
    roman: degrees[i],
    quality: qualities[i],
  }));
}
