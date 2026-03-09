export interface ScaleNote {
  note: string;
  octave: number;
  midiNote: number;
  syllable: string; // Do, Re, Mi, etc.
  duration: number; // in ms
}

export interface Exercise {
  id: string;
  name: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  type: 'scale' | 'interval' | 'arpeggio' | 'chromatic';
  notes: ScaleNote[];
  bpm: number;
  category: string;
}

const C_MAJOR_SCALE: ScaleNote[] = [
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Do', duration: 500 },
  { note: 'D', octave: 4, midiNote: 62, syllable: 'Re', duration: 500 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'Mi', duration: 500 },
  { note: 'F', octave: 4, midiNote: 65, syllable: 'Fa', duration: 500 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'Sol', duration: 500 },
  { note: 'A', octave: 4, midiNote: 69, syllable: 'La', duration: 500 },
  { note: 'B', octave: 4, midiNote: 71, syllable: 'Ti', duration: 500 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'Do', duration: 800 },
];

const C_MAJOR_ARPEGGIO: ScaleNote[] = [
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Do', duration: 600 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'Mi', duration: 600 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'Sol', duration: 600 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'Do', duration: 800 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'Sol', duration: 600 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'Mi', duration: 600 },
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Do', duration: 800 },
];

const PENTATONIC_SCALE: ScaleNote[] = [
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Do', duration: 500 },
  { note: 'D', octave: 4, midiNote: 62, syllable: 'Re', duration: 500 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'Mi', duration: 500 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'Sol', duration: 500 },
  { note: 'A', octave: 4, midiNote: 69, syllable: 'La', duration: 500 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'Do', duration: 800 },
];

const OCTAVE_JUMP: ScaleNote[] = [
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Low', duration: 700 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'High', duration: 700 },
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Low', duration: 700 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'High', duration: 700 },
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Low', duration: 1000 },
];

const CHROMATIC_SCALE: ScaleNote[] = [
  { note: 'C', octave: 4, midiNote: 60, syllable: 'C', duration: 400 },
  { note: 'C#', octave: 4, midiNote: 61, syllable: 'C#', duration: 400 },
  { note: 'D', octave: 4, midiNote: 62, syllable: 'D', duration: 400 },
  { note: 'D#', octave: 4, midiNote: 63, syllable: 'D#', duration: 400 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'E', duration: 400 },
  { note: 'F', octave: 4, midiNote: 65, syllable: 'F', duration: 400 },
  { note: 'F#', octave: 4, midiNote: 66, syllable: 'F#', duration: 400 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'G', duration: 400 },
  { note: 'G#', octave: 4, midiNote: 68, syllable: 'G#', duration: 400 },
  { note: 'A', octave: 4, midiNote: 69, syllable: 'A', duration: 400 },
  { note: 'A#', octave: 4, midiNote: 70, syllable: 'A#', duration: 400 },
  { note: 'B', octave: 4, midiNote: 71, syllable: 'B', duration: 400 },
  { note: 'C', octave: 5, midiNote: 72, syllable: 'C', duration: 600 },
];

const G_MAJOR_SCALE: ScaleNote[] = [
  { note: 'G', octave: 3, midiNote: 55, syllable: 'Do', duration: 500 },
  { note: 'A', octave: 3, midiNote: 57, syllable: 'Re', duration: 500 },
  { note: 'B', octave: 3, midiNote: 59, syllable: 'Mi', duration: 500 },
  { note: 'C', octave: 4, midiNote: 60, syllable: 'Fa', duration: 500 },
  { note: 'D', octave: 4, midiNote: 62, syllable: 'Sol', duration: 500 },
  { note: 'E', octave: 4, midiNote: 64, syllable: 'La', duration: 500 },
  { note: 'F#', octave: 4, midiNote: 66, syllable: 'Ti', duration: 500 },
  { note: 'G', octave: 4, midiNote: 67, syllable: 'Do', duration: 800 },
];

export const EXERCISES: Exercise[] = [
  {
    id: 'c-major-scale',
    name: 'C Major Scale',
    description: 'The classic Do-Re-Mi scale. Perfect for beginners.',
    level: 'beginner',
    type: 'scale',
    notes: C_MAJOR_SCALE,
    bpm: 60,
    category: 'Scales',
  },
  {
    id: 'pentatonic-scale',
    name: 'C Pentatonic Scale',
    description: 'A 5-note scale used in almost every style of music.',
    level: 'beginner',
    type: 'scale',
    notes: PENTATONIC_SCALE,
    bpm: 60,
    category: 'Scales',
  },
  {
    id: 'c-major-arpeggio',
    name: 'C Major Arpeggio',
    description: 'Sing the notes of a C chord one at a time.',
    level: 'intermediate',
    type: 'arpeggio',
    notes: C_MAJOR_ARPEGGIO,
    bpm: 60,
    category: 'Arpeggios',
  },
  {
    id: 'octave-jump',
    name: 'Octave Jump',
    description: 'Practice jumping a full octave up and down.',
    level: 'intermediate',
    type: 'interval',
    notes: OCTAVE_JUMP,
    bpm: 60,
    category: 'Intervals',
  },
  {
    id: 'g-major-scale',
    name: 'G Major Scale',
    description: 'A common key for singing, slightly lower than C major.',
    level: 'intermediate',
    type: 'scale',
    notes: G_MAJOR_SCALE,
    bpm: 72,
    category: 'Scales',
  },
  {
    id: 'chromatic-scale',
    name: 'Chromatic Scale',
    description: 'All 12 notes in an octave. Great for ear training.',
    level: 'advanced',
    type: 'chromatic',
    notes: CHROMATIC_SCALE,
    bpm: 80,
    category: 'Advanced',
  },
];

export const SONG_MELODIES = [
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle',
    artist: 'Traditional',
    level: 'beginner' as const,
    notes: [
      { midiNote: 60, duration: 400, syllable: 'Twin-' },
      { midiNote: 60, duration: 400, syllable: '-kle' },
      { midiNote: 67, duration: 400, syllable: 'Twin-' },
      { midiNote: 67, duration: 400, syllable: '-kle' },
      { midiNote: 69, duration: 400, syllable: 'lit-' },
      { midiNote: 69, duration: 400, syllable: '-tle' },
      { midiNote: 67, duration: 700, syllable: 'star' },
      { midiNote: 65, duration: 400, syllable: 'how' },
      { midiNote: 65, duration: 400, syllable: 'I' },
      { midiNote: 64, duration: 400, syllable: 'won-' },
      { midiNote: 64, duration: 400, syllable: '-der' },
      { midiNote: 62, duration: 400, syllable: 'what' },
      { midiNote: 62, duration: 400, syllable: 'you' },
      { midiNote: 60, duration: 700, syllable: 'are' },
    ],
  },
  {
    id: 'happy-birthday',
    name: 'Happy Birthday',
    artist: 'Traditional',
    level: 'beginner' as const,
    notes: [
      { midiNote: 60, duration: 300, syllable: 'Hap-' },
      { midiNote: 60, duration: 300, syllable: '-py' },
      { midiNote: 62, duration: 600, syllable: 'birth-' },
      { midiNote: 60, duration: 600, syllable: '-day' },
      { midiNote: 65, duration: 600, syllable: 'to' },
      { midiNote: 64, duration: 900, syllable: 'you' },
      { midiNote: 60, duration: 300, syllable: 'Hap-' },
      { midiNote: 60, duration: 300, syllable: '-py' },
      { midiNote: 62, duration: 600, syllable: 'birth-' },
      { midiNote: 60, duration: 600, syllable: '-day' },
      { midiNote: 67, duration: 600, syllable: 'to' },
      { midiNote: 65, duration: 900, syllable: 'you' },
    ],
  },
  {
    id: 'mary-had-lamb',
    name: 'Mary Had a Little Lamb',
    artist: 'Traditional',
    level: 'intermediate' as const,
    notes: [
      { midiNote: 64, duration: 400, syllable: 'Ma-' },
      { midiNote: 62, duration: 400, syllable: '-ry' },
      { midiNote: 60, duration: 400, syllable: 'had' },
      { midiNote: 62, duration: 400, syllable: 'a' },
      { midiNote: 64, duration: 400, syllable: 'lit-' },
      { midiNote: 64, duration: 400, syllable: '-tle' },
      { midiNote: 64, duration: 700, syllable: 'lamb' },
      { midiNote: 62, duration: 400, syllable: 'lit-' },
      { midiNote: 62, duration: 400, syllable: '-tle' },
      { midiNote: 62, duration: 700, syllable: 'lamb' },
      { midiNote: 64, duration: 400, syllable: 'lit-' },
      { midiNote: 67, duration: 400, syllable: '-tle' },
      { midiNote: 67, duration: 700, syllable: 'lamb' },
    ],
  },
];
