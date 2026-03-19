export interface Exercise {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  notes: number[]; // MIDI note numbers
  bpm: number;
  description: string;
}

export const EXERCISES: Exercise[] = [
  // Beginner
  { id: 'b1', name: 'Do-Re-Mi', level: 'beginner', notes: [60,62,64,65,67,65,64,62,60], bpm: 80, description: 'Classic ascending/descending major scale' },
  { id: 'b2', name: 'Three Note Step', level: 'beginner', notes: [60,62,64,62,60], bpm: 72, description: 'Simple 3-note pattern' },
  { id: 'b3', name: 'Octave Jump', level: 'beginner', notes: [60,67,72,67,60], bpm: 60, description: 'Jump from root to fifth to octave' },
  { id: 'b4', name: 'Descending Steps', level: 'beginner', notes: [72,71,69,67,65,64,62,60], bpm: 80, description: 'Walk down the scale smoothly' },
  { id: 'b5', name: 'Root-Third-Fifth', level: 'beginner', notes: [60,64,67,64,60], bpm: 72, description: 'Major chord tones' },
  // Intermediate
  { id: 'i1', name: 'Full Major Scale', level: 'intermediate', notes: [60,62,64,65,67,69,71,72,71,69,67,65,64,62,60], bpm: 100, description: 'Complete ascending and descending' },
  { id: 'i2', name: 'Minor Scale', level: 'intermediate', notes: [57,59,60,62,64,65,67,69,67,65,64,62,60,59,57], bpm: 92, description: 'Natural minor scale' },
  { id: 'i3', name: 'Arpeggio Climb', level: 'intermediate', notes: [60,64,67,72,67,64,60,55,60], bpm: 88, description: 'Arpeggiate up and back' },
  { id: 'i4', name: 'Chromatic Run', level: 'intermediate', notes: [60,61,62,63,64,65,66,67,66,65,64,63,62,61,60], bpm: 96, description: 'Half-step precision' },
  { id: 'i5', name: 'Pentatonic Flow', level: 'intermediate', notes: [60,62,64,67,69,72,69,67,64,62,60], bpm: 92, description: 'Major pentatonic scale' },
  { id: 'i6', name: 'Thirds Pattern', level: 'intermediate', notes: [60,64,62,65,64,67,65,69,67,72], bpm: 88, description: 'Scale in thirds' },
  // Advanced
  { id: 'a1', name: 'Two Octave Run', level: 'advanced', notes: [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72,71,69,67,65,64,62,60,59,57,55,53,52,50,48], bpm: 120, description: 'Full two-octave major scale' },
  { id: 'a2', name: 'Jazz Licks', level: 'advanced', notes: [60,63,65,66,67,70,72,75,72,70,67,66,65,63,60], bpm: 108, description: 'Blues scale pattern' },
  { id: 'a3', name: 'Wide Intervals', level: 'advanced', notes: [60,67,64,72,60,69,65,76,60], bpm: 76, description: 'Large interval jumps' },
  { id: 'a4', name: 'Melodic Minor', level: 'advanced', notes: [57,59,60,62,64,66,68,69,67,65,64,62,60,59,57], bpm: 96, description: 'Ascending melodic, descending natural' },
  { id: 'a5', name: 'Diminished Run', level: 'advanced', notes: [60,63,66,69,72,69,66,63,60], bpm: 100, description: 'Symmetrical diminished pattern' },
];

export interface SongMelody {
  id: string;
  name: string;
  artist: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  notes: { midi: number; duration: number }[]; // duration in beats
  bpm: number;
}

export const SONG_MELODIES: SongMelody[] = [
  // Beginner
  { id: 's1', name: 'Twinkle Twinkle', artist: 'Traditional', level: 'beginner', bpm: 80,
    notes: [60,60,67,67,69,69,67,0, 65,65,64,64,62,62,60,0].map(m => ({ midi: m, duration: 1 })) },
  { id: 's2', name: 'Happy Birthday', artist: 'Traditional', level: 'beginner', bpm: 72,
    notes: [60,60,62,60,65,64, 60,60,62,60,67,65].map(m => ({ midi: m, duration: 1 })) },
  { id: 's3', name: 'Mary Had a Little Lamb', artist: 'Traditional', level: 'beginner', bpm: 80,
    notes: [64,62,60,62,64,64,64, 62,62,62, 64,67,67].map(m => ({ midi: m, duration: 1 })) },
  { id: 's4', name: 'Jingle Bells', artist: 'Traditional', level: 'beginner', bpm: 88,
    notes: [64,64,64,64,64,64,64,67,60,62,64].map(m => ({ midi: m, duration: 1 })) },
  // Intermediate
  { id: 's5', name: 'Amazing Grace', artist: 'Traditional', level: 'intermediate', bpm: 72,
    notes: [60,65,67,65,67,65,64,60, 60,65,67,65,67,72].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's6', name: 'Greensleeves', artist: 'Traditional', level: 'intermediate', bpm: 84,
    notes: [57,60,62,64,65,64,62,59,55,57,59,60,59,57,56,55,57].map(m => ({ midi: m, duration: 1 })) },
  { id: 's7', name: 'Ode to Joy', artist: 'Beethoven', level: 'intermediate', bpm: 96,
    notes: [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62].map(m => ({ midi: m, duration: 1 })) },
  { id: 's8', name: 'Scarborough Fair', artist: 'Traditional', level: 'intermediate', bpm: 76,
    notes: [57,57,64,62,60,64,67,69,67,64,65,62,57].map(m => ({ midi: m, duration: 1.5 })) },
  // Advanced
  { id: 's9', name: 'Hallelujah', artist: 'Leonard Cohen', level: 'advanced', bpm: 72,
    notes: [60,60,62,64,64,62,64,65,65,64,62,60,60,62,64,67].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's10', name: 'Ave Maria', artist: 'Schubert', level: 'advanced', bpm: 64,
    notes: [60,64,67,72,72,71,67,64,65,64,60,67,65,64,62,60].map(m => ({ midi: m, duration: 2 })) },
  { id: 's11', name: 'Bohemian Rhapsody', artist: 'Queen', level: 'advanced', bpm: 72,
    notes: [67,67,67,65,67,69,69,65,62,60,60,62,64,65,64,62,60].map(m => ({ midi: m, duration: 1 })) },
  { id: 's12', name: 'Someone Like You', artist: 'Adele', level: 'advanced', bpm: 68,
    notes: [64,64,67,67,69,69,67,67,64,64,62,60,60,62,64].map(m => ({ midi: m, duration: 1 })) },
];
