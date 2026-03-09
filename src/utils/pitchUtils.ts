// Autocorrelation-based pitch detection
// Returns frequency in Hz, or -1 if no pitch detected

export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const MIN_SAMPLES = 0;
  let best_offset = -1;
  let best_correlation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  // Not enough signal
  if (rms < 0.01) return -1;

  let lastCorrelation = 1;
  for (let offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      correlation += Math.abs(buffer[i] - buffer[i + offset]);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      const shift =
        (correlations[best_offset + 1] - correlations[best_offset - 1]) /
        (2 * correlations[best_offset]);
      return sampleRate / (best_offset + 8 * shift);
    }
    lastCorrelation = correlation;
  }

  if (best_correlation > 0.01) {
    return sampleRate / best_offset;
  }
  return -1;
}

// Note names
const NOTE_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export interface NoteInfo {
  note: string;
  octave: number;
  frequency: number;
  cents: number; // -50 to +50 cents deviation
  midiNote: number;
}

export function frequencyToNoteInfo(frequency: number): NoteInfo {
  if (frequency <= 0) {
    return { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 };
  }

  // A4 = 440 Hz = MIDI 69
  const midiNote = 12 * Math.log2(frequency / 440) + 69;
  const roundedMidi = Math.round(midiNote);
  const cents = Math.round((midiNote - roundedMidi) * 100);

  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    frequency,
    cents,
    midiNote: roundedMidi,
  };
}

export function noteToFrequency(midiNote: number): number {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

export function noteNameToMidi(noteName: string, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(noteName);
  if (noteIndex === -1) return -1;
  return (octave + 1) * 12 + noteIndex;
}

// Returns a pitch accuracy score 0-100
export function getPitchAccuracy(detectedCents: number): number {
  const absCents = Math.abs(detectedCents);
  if (absCents <= 5) return 100;
  if (absCents <= 15) return 90;
  if (absCents <= 25) return 75;
  if (absCents <= 35) return 50;
  if (absCents <= 45) return 25;
  return 0;
}

// Get pitch direction hint
export function getPitchHint(cents: number): 'on-pitch' | 'too-low' | 'too-high' | 'silent' {
  if (cents === 0) return 'silent';
  if (Math.abs(cents) <= 10) return 'on-pitch';
  if (cents < 0) return 'too-low';
  return 'too-high';
}
