// ─── YIN Pitch Detection ─────────────────────────────────────────────────────
const YIN_THRESHOLD = 0.10;

export interface PitchResult { freq: number; confidence: number; }
export interface NoteInfo { note: string; octave: number; frequency: number; cents: number; midiNote: number; }

export function detectPitch(buffer: Float32Array, sampleRate: number): PitchResult {
  const bufferSize = buffer.length;
  const halfBuffer = Math.floor(bufferSize / 2);
  let rms = 0;
  for (let i = 0; i < bufferSize; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / bufferSize);
  if (rms < 0.01) return { freq: -1, confidence: 0 };

  const yinBuf = new Float32Array(halfBuffer);
  yinBuf[0] = 1;
  for (let tau = 1; tau < halfBuffer; tau++) {
    yinBuf[tau] = 0;
    for (let i = 0; i < halfBuffer; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuf[tau] += delta * delta;
    }
  }
  let runningSum = 0;
  for (let tau = 1; tau < halfBuffer; tau++) {
    runningSum += yinBuf[tau];
    yinBuf[tau] = runningSum > 0 ? (yinBuf[tau] * tau) / runningSum : 1;
  }
  yinBuf[0] = 1;

  for (let tau = 2; tau < halfBuffer - 1; tau++) {
    if (yinBuf[tau] < YIN_THRESHOLD) {
      while (tau + 1 < halfBuffer && yinBuf[tau + 1] < yinBuf[tau]) tau++;
      const betterTau = parabolicInterp(yinBuf, tau);
      const confidence = 1 - yinBuf[tau];
      const freq = sampleRate / betterTau;
      if (freq < 70 || freq > 1100) return { freq: -1, confidence: 0 };
      return { freq, confidence };
    }
  }
  return { freq: -1, confidence: 0 };
}

function parabolicInterp(arr: Float32Array, tau: number): number {
  const x0 = tau > 0 ? tau - 1 : tau;
  const x2 = tau < arr.length - 1 ? tau + 1 : tau;
  if (x0 === tau) return arr[tau] <= arr[x2] ? tau : x2;
  if (x2 === tau) return arr[tau] <= arr[x0] ? tau : x0;
  const s0 = arr[x0], s1 = arr[tau], s2 = arr[x2];
  return tau + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
}

// ─── Median Smoother ─────────────────────────────────────────────────────────
const SMOOTH_WINDOW = 5;
export function createSmoother() {
  const history: number[] = [];
  return function smooth(freq: number, confidence: number): { smoothedFreq: number; isStable: boolean } {
    if (freq <= 0 || confidence < 0.6) {
      if (history.length > 0) history.shift();
      return { smoothedFreq: -1, isStable: false };
    }
    history.push(freq);
    if (history.length > SMOOTH_WINDOW) history.shift();
    if (history.length < 2) return { smoothedFreq: freq, isStable: false };
    const sorted = [...history].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const filtered = history.filter(f => Math.abs(f - median) / median < 0.059);
    if (!filtered.length) return { smoothedFreq: -1, isStable: false };
    const smoothedFreq = filtered.reduce((a, b) => a + b, 0) / filtered.length;
    return { smoothedFreq, isStable: filtered.length >= 3 };
  };
}

// ─── Note Utilities ───────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function frequencyToNoteInfo(frequency: number): NoteInfo {
  if (!frequency || frequency <= 0)
    return { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 };
  const midiNote = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;
  return { note: NOTE_NAMES[noteIndex], octave, frequency, cents, midiNote: roundedMidi };
}

export function noteToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function getPitchAccuracy(cents: number): number {
  const abs = Math.abs(cents);
  if (abs <= 10) return 100;
  if (abs <= 25) return 75;
  if (abs <= 40) return 40;
  return 10;
}

export function getPitchHint(cents: number): 'on-pitch' | 'too-low' | 'too-high' | 'silent' {
  if (cents === 0) return 'silent';
  if (Math.abs(cents) <= 10) return 'on-pitch';
  return cents < 0 ? 'too-low' : 'too-high';
}

export function getPitchColor(hint: string): string {
  switch (hint) {
    case 'on-pitch': return '#10B981';
    case 'too-low': return '#F59E0B';
    case 'too-high': return '#EF4444';
    default: return '#475569';
  }
}

// ─── All notes table (for vocal range) ───────────────────────────────────────
export const ALL_NOTES: { name: string; freq: number; midi: number }[] = [];
for (let oct = 2; oct <= 6; oct++) {
  NOTE_NAMES.forEach((n, i) => {
    const midi = i + oct * 12 + 12;
    ALL_NOTES.push({ name: `${n}${oct}`, freq: 440 * Math.pow(2, (midi - 69) / 12), midi });
  });
}

export function freqToNoteName(freq: number): { name: string; freq: number } | null {
  if (!freq || freq < 60) return null;
  let best: typeof ALL_NOTES[0] | null = null;
  let bestDist = Infinity;
  for (const n of ALL_NOTES) {
    const d = Math.abs(n.freq - freq);
    if (d < bestDist) { bestDist = d; best = n; }
  }
  return best;
}

// Voice type classification
export const VOICE_TYPES = [
  { id: 'bass', label: 'Bass', range: 'E2–E4', color: '#3b82f6' },
  { id: 'baritone', label: 'Baritone', range: 'A2–A4', color: '#8b5cf6' },
  { id: 'tenor', label: 'Tenor', range: 'C3–C5', color: '#ec4899' },
  { id: 'alto', label: 'Alto', range: 'G3–G5', color: '#f59e0b' },
  { id: 'mezzo', label: 'Mezzo Soprano', range: 'A3–A5', color: '#10b981' },
  { id: 'soprano', label: 'Soprano', range: 'C4–C6', color: '#f472b6' },
];

export function classifyVoiceType(lowNote: string, highNote: string) {
  const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote);
  const highIdx = ALL_NOTES.findIndex(n => n.name === highNote);
  const midIdx = Math.floor((lowIdx + highIdx) / 2);
  const midFreq = ALL_NOTES[midIdx]?.freq || 0;
  if (midFreq < 200) return VOICE_TYPES[0];
  if (midFreq < 280) return VOICE_TYPES[1];
  if (midFreq < 350) return VOICE_TYPES[2];
  if (midFreq < 430) return VOICE_TYPES[3];
  if (midFreq < 520) return VOICE_TYPES[4];
  return VOICE_TYPES[5];
}
