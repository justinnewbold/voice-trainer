export interface Exercise {
  id: string;
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  notes: number[];
  bpm: number;
  description: string;
  genre?: string;
}

export const EXERCISES: Exercise[] = [
  // Beginner
  { id: 'b1', name: 'Do-Re-Mi', level: 'beginner', notes: [60,62,64,65,67,65,64,62,60], bpm: 80, description: 'Classic ascending/descending major scale', genre: 'Classical' },
  { id: 'b2', name: 'Three Note Step', level: 'beginner', notes: [60,62,64,62,60], bpm: 72, description: 'Simple 3-note pattern', genre: 'Warm-Up' },
  { id: 'b3', name: 'Octave Jump', level: 'beginner', notes: [60,67,72,67,60], bpm: 60, description: 'Jump from root to fifth to octave', genre: 'Technique' },
  { id: 'b4', name: 'Descending Steps', level: 'beginner', notes: [72,71,69,67,65,64,62,60], bpm: 80, description: 'Walk down the scale smoothly', genre: 'Technique' },
  { id: 'b5', name: 'Root-Third-Fifth', level: 'beginner', notes: [60,64,67,64,60], bpm: 72, description: 'Major chord tones', genre: 'Theory' },
  // Intermediate
  { id: 'i1', name: 'Full Major Scale', level: 'intermediate', notes: [60,62,64,65,67,69,71,72,71,69,67,65,64,62,60], bpm: 100, description: 'Complete ascending and descending', genre: 'Classical' },
  { id: 'i2', name: 'Minor Scale', level: 'intermediate', notes: [57,59,60,62,64,65,67,69,67,65,64,62,60,59,57], bpm: 92, description: 'Natural minor scale', genre: 'Classical' },
  { id: 'i3', name: 'Arpeggio Climb', level: 'intermediate', notes: [60,64,67,72,67,64,60,55,60], bpm: 88, description: 'Arpeggiate up and back', genre: 'Technique' },
  { id: 'i4', name: 'Chromatic Run', level: 'intermediate', notes: [60,61,62,63,64,65,66,67,66,65,64,63,62,61,60], bpm: 96, description: 'Half-step precision', genre: 'Technique' },
  { id: 'i5', name: 'Pentatonic Flow', level: 'intermediate', notes: [60,62,64,67,69,72,69,67,64,62,60], bpm: 92, description: 'Major pentatonic scale', genre: 'Pop' },
  { id: 'i6', name: 'Thirds Pattern', level: 'intermediate', notes: [60,64,62,65,64,67,65,69,67,72], bpm: 88, description: 'Scale in thirds', genre: 'Theory' },
  // Advanced
  { id: 'a1', name: 'Two Octave Run', level: 'advanced', notes: [48,50,52,53,55,57,59,60,62,64,65,67,69,71,72,71,69,67,65,64,62,60,59,57,55,53,52,50,48], bpm: 120, description: 'Full two-octave major scale', genre: 'Classical' },
  { id: 'a2', name: 'Jazz Licks', level: 'advanced', notes: [60,63,65,66,67,70,72,75,72,70,67,66,65,63,60], bpm: 108, description: 'Blues scale pattern', genre: 'Jazz' },
  { id: 'a3', name: 'Wide Intervals', level: 'advanced', notes: [60,67,64,72,60,69,65,76,60], bpm: 76, description: 'Large interval jumps', genre: 'Technique' },
  { id: 'a4', name: 'Melodic Minor', level: 'advanced', notes: [57,59,60,62,64,66,68,69,67,65,64,62,60,59,57], bpm: 96, description: 'Ascending melodic, descending natural', genre: 'Classical' },
  { id: 'a5', name: 'Diminished Run', level: 'advanced', notes: [60,63,66,69,72,69,66,63,60], bpm: 100, description: 'Symmetrical diminished pattern', genre: 'Jazz' },
];

export interface SongMelody {
  id: string;
  name: string;
  artist: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  notes: { midi: number; duration: number }[];
  bpm: number;
  genre: string;
  emoji: string;
}

// Duration guide: 0.5 = eighth, 1 = quarter, 1.5 = dotted quarter, 2 = half, 3 = dotted half, 4 = whole
// BPMs match the commonly performed tempo of each song

export const SONG_MELODIES: SongMelody[] = [
  // ── Beginner ──────────────────────────────────────────────────────────────

  // Twinkle Twinkle: ♩=100, 4/4, all quarters except final halves
  { id: 's1', name: 'Twinkle Twinkle', artist: 'Traditional', level: 'beginner', bpm: 100, genre: 'Children', emoji: '⭐',
    notes: [
      {midi:60,duration:1},{midi:60,duration:1},{midi:67,duration:1},{midi:67,duration:1},
      {midi:69,duration:1},{midi:69,duration:1},{midi:67,duration:2},
      {midi:65,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:64,duration:1},
      {midi:62,duration:1},{midi:62,duration:1},{midi:60,duration:2},
    ] },

  // Happy Birthday: ♩=80, 3/4 waltz feel — pickup eighth + quarters + dotted half
  { id: 's2', name: 'Happy Birthday', artist: 'Traditional', level: 'beginner', bpm: 80, genre: 'Children', emoji: '🎂',
    notes: [
      {midi:60,duration:0.5},{midi:60,duration:0.5},{midi:62,duration:1},{midi:60,duration:1},{midi:65,duration:1},{midi:64,duration:2},
      {midi:60,duration:0.5},{midi:60,duration:0.5},{midi:62,duration:1},{midi:60,duration:1},{midi:67,duration:1},{midi:65,duration:2},
      {midi:60,duration:0.5},{midi:60,duration:0.5},{midi:72,duration:1},{midi:69,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:71,duration:0.5},{midi:71,duration:0.5},{midi:69,duration:1},{midi:65,duration:1},{midi:67,duration:1},{midi:65,duration:2},
    ] },

  // Mary Had a Little Lamb: ♩=110, 4/4, mostly quarters
  { id: 's3', name: 'Mary Had a Little Lamb', artist: 'Traditional', level: 'beginner', bpm: 110, genre: 'Children', emoji: '🐑',
    notes: [
      {midi:64,duration:1},{midi:62,duration:1},{midi:60,duration:1},{midi:62,duration:1},
      {midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:2},
      {midi:62,duration:1},{midi:62,duration:1},{midi:62,duration:2},
      {midi:64,duration:1},{midi:67,duration:1},{midi:67,duration:2},
      {midi:64,duration:1},{midi:62,duration:1},{midi:60,duration:1},{midi:62,duration:1},
      {midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:1},
      {midi:62,duration:1},{midi:62,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:4},
    ] },

  // Jingle Bells: ♩=120, 4/4, bright and energetic
  { id: 's4', name: 'Jingle Bells', artist: 'Traditional', level: 'beginner', bpm: 120, genre: 'Holiday', emoji: '🔔',
    notes: [
      {midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:2},
      {midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:2},
      {midi:64,duration:1},{midi:67,duration:1},{midi:60,duration:1},{midi:62,duration:1},
      {midi:64,duration:4},
      {midi:65,duration:1},{midi:65,duration:1},{midi:65,duration:1},{midi:65,duration:1},
      {midi:65,duration:1},{midi:64,duration:1},{midi:64,duration:1},{midi:64,duration:0.5},{midi:64,duration:0.5},
      {midi:64,duration:1},{midi:62,duration:1},{midi:62,duration:1},{midi:64,duration:1},
      {midi:62,duration:2},{midi:67,duration:2},
    ] },

  // Row Your Boat: ♩=92, 3/4, gentle rowing feel
  { id: 's13', name: 'Row Your Boat', artist: 'Traditional', level: 'beginner', bpm: 92, genre: 'Children', emoji: '🚣',
    notes: [
      {midi:60,duration:1.5},{midi:60,duration:1.5},{midi:60,duration:1},{midi:62,duration:0.5},
      {midi:64,duration:3},
      {midi:64,duration:1},{midi:62,duration:0.5},{midi:64,duration:1},{midi:65,duration:0.5},
      {midi:67,duration:3},
      {midi:72,duration:0.5},{midi:72,duration:0.5},{midi:72,duration:0.5},{midi:67,duration:0.5},{midi:67,duration:0.5},{midi:67,duration:0.5},
      {midi:64,duration:0.5},{midi:64,duration:0.5},{midi:64,duration:0.5},{midi:60,duration:0.5},{midi:60,duration:0.5},{midi:60,duration:0.5},
      {midi:67,duration:1},{midi:65,duration:0.5},{midi:64,duration:1},{midi:62,duration:0.5},
      {midi:60,duration:3},
    ] },

  // London Bridge: ♩=108
  { id: 's14', name: 'London Bridge', artist: 'Traditional', level: 'beginner', bpm: 108, genre: 'Children', emoji: '🌉',
    notes: [
      {midi:67,duration:1},{midi:69,duration:0.5},{midi:67,duration:0.5},{midi:65,duration:1},
      {midi:64,duration:1},{midi:65,duration:0.5},{midi:67,duration:0.5},
      {midi:62,duration:2},{midi:64,duration:1},
      {midi:65,duration:1.5},{midi:67,duration:0.5},{midi:65,duration:1},{midi:64,duration:1},
      {midi:62,duration:2},
    ] },

  // ── Intermediate ──────────────────────────────────────────────────────────

  // Amazing Grace: ♩=66, 3/4 — slow and reverent
  { id: 's5', name: 'Amazing Grace', artist: 'Traditional', level: 'intermediate', bpm: 66, genre: 'Gospel', emoji: '🙏',
    notes: [
      {midi:60,duration:1},
      {midi:65,duration:2},{midi:65,duration:1},
      {midi:67,duration:2},{midi:65,duration:1},
      {midi:69,duration:2},{midi:65,duration:1},
      {midi:65,duration:3},
      {midi:60,duration:1},
      {midi:65,duration:2},{midi:65,duration:1},
      {midi:67,duration:2},{midi:65,duration:1},
      {midi:72,duration:3},
    ] },

  // Greensleeves: ♩=88, 3/4 waltz, dotted rhythms
  { id: 's6', name: 'Greensleeves', artist: 'Traditional', level: 'intermediate', bpm: 88, genre: 'Folk', emoji: '🌿',
    notes: [
      {midi:57,duration:1},
      {midi:60,duration:1.5},{midi:62,duration:0.5},{midi:64,duration:1},
      {midi:65,duration:1.5},{midi:64,duration:0.5},{midi:62,duration:1},
      {midi:59,duration:1.5},{midi:57,duration:0.5},{midi:55,duration:1},
      {midi:57,duration:3},
      {midi:59,duration:1},
      {midi:60,duration:1.5},{midi:59,duration:0.5},{midi:57,duration:1},
      {midi:56,duration:1.5},{midi:55,duration:0.5},{midi:57,duration:1},
      {midi:60,duration:3},
    ] },

  // Ode to Joy: ♩=108, 4/4, Beethoven's classic tempo
  { id: 's7', name: 'Ode to Joy', artist: 'Beethoven', level: 'intermediate', bpm: 108, genre: 'Classical', emoji: '🎼',
    notes: [
      {midi:64,duration:1},{midi:64,duration:1},{midi:65,duration:1},{midi:67,duration:1},
      {midi:67,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:1},{midi:60,duration:1},{midi:62,duration:1},{midi:64,duration:1},
      {midi:64,duration:1.5},{midi:62,duration:0.5},{midi:62,duration:2},
      {midi:64,duration:1},{midi:64,duration:1},{midi:65,duration:1},{midi:67,duration:1},
      {midi:67,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:1},{midi:60,duration:1},{midi:62,duration:1},{midi:64,duration:1},
      {midi:62,duration:1.5},{midi:60,duration:0.5},{midi:60,duration:2},
    ] },

  // Scarborough Fair: ♩=76, 3/4 minor
  { id: 's8', name: 'Scarborough Fair', artist: 'Traditional', level: 'intermediate', bpm: 76, genre: 'Folk', emoji: '🌾',
    notes: [
      {midi:57,duration:3},
      {midi:57,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:2},{midi:64,duration:1},
      {midi:67,duration:2},{midi:64,duration:1},
      {midi:65,duration:3},
      {midi:64,duration:2},{midi:65,duration:1},
      {midi:62,duration:3},
      {midi:57,duration:3},
    ] },

  // Danny Boy: ♩=60, slow 4/4 ballad
  { id: 's15', name: 'Danny Boy', artist: 'Traditional', level: 'intermediate', bpm: 60, genre: 'Folk', emoji: '🍀',
    notes: [
      {midi:60,duration:0.5},{midi:65,duration:1.5},{midi:65,duration:1},
      {midi:67,duration:1},{midi:65,duration:0.5},{midi:67,duration:0.5},{midi:69,duration:2},
      {midi:65,duration:1.5},{midi:64,duration:0.5},{midi:60,duration:2},
      {midi:60,duration:0.5},{midi:62,duration:1.5},{midi:64,duration:1},
      {midi:65,duration:1},{midi:67,duration:1},{midi:65,duration:1},{midi:64,duration:1},
      {midi:62,duration:4},
    ] },

  // House of the Rising Sun: ♩=76, 6/8 triplet feel
  { id: 's16', name: 'House of the Rising Sun', artist: 'Traditional', level: 'intermediate', bpm: 76, genre: 'Blues', emoji: '🌅',
    notes: [
      {midi:57,duration:1},{midi:60,duration:1},{midi:64,duration:1},
      {midi:67,duration:2},{midi:64,duration:1},
      {midi:60,duration:1},{midi:57,duration:2},
      {midi:60,duration:1},{midi:64,duration:1},{midi:67,duration:1},
      {midi:64,duration:2},{midi:60,duration:1},
      {midi:55,duration:1},{midi:59,duration:1},{midi:62,duration:1},
      {midi:67,duration:3},
    ] },

  // Stand By Me: ♩=76, 4/4 soul groove
  { id: 's17', name: 'Stand By Me', artist: 'Ben E. King', level: 'intermediate', bpm: 76, genre: 'Soul', emoji: '🤝',
    notes: [
      {midi:64,duration:1.5},{midi:64,duration:0.5},{midi:62,duration:0.5},{midi:64,duration:0.5},
      {midi:67,duration:2},{midi:67,duration:1},
      {midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:2},{midi:60,duration:1},{midi:62,duration:1},
      {midi:60,duration:4},
    ] },

  // This Land Is Your Land: ♩=96, upbeat folk-country
  { id: 's18', name: 'This Land Is Your Land', artist: 'Woody Guthrie', level: 'intermediate', bpm: 96, genre: 'Folk', emoji: '🏞️',
    notes: [
      {midi:67,duration:1},{midi:67,duration:1},{midi:67,duration:0.5},{midi:65,duration:0.5},
      {midi:64,duration:1},{midi:62,duration:1},{midi:60,duration:2},
      {midi:62,duration:1},{midi:62,duration:0.5},{midi:64,duration:0.5},{midi:65,duration:1},
      {midi:64,duration:1.5},{midi:62,duration:0.5},{midi:60,duration:2},
    ] },

  // You Are My Sunshine: ♩=96, country swing
  { id: 's19', name: 'You Are My Sunshine', artist: 'Traditional', level: 'intermediate', bpm: 96, genre: 'Country', emoji: '☀️',
    notes: [
      {midi:60,duration:1},
      {midi:64,duration:1.5},{midi:65,duration:0.5},{midi:64,duration:1},{midi:64,duration:1},
      {midi:62,duration:2},{midi:60,duration:1},{midi:60,duration:1},
      {midi:64,duration:1.5},{midi:65,duration:0.5},{midi:64,duration:1},{midi:64,duration:1},
      {midi:62,duration:4},
    ] },

  // Over the Rainbow: ♩=72, ballad 4/4
  { id: 's20', name: 'Over the Rainbow', artist: 'Harold Arlen', level: 'intermediate', bpm: 72, genre: 'Musical', emoji: '🌈',
    notes: [
      {midi:60,duration:2},{midi:72,duration:2},
      {midi:71,duration:1.5},{midi:69,duration:0.5},{midi:71,duration:1},{midi:72,duration:1},
      {midi:67,duration:3},{midi:0,duration:1},
      {midi:69,duration:1.5},{midi:67,duration:0.5},{midi:69,duration:1},{midi:71,duration:1},
      {midi:67,duration:4},
    ] },

  // ── Advanced ──────────────────────────────────────────────────────────────

  // Hallelujah: ♩=52, slow 12/8 ballad feel
  { id: 's9', name: 'Hallelujah', artist: 'Leonard Cohen', level: 'advanced', bpm: 52, genre: 'Indie', emoji: '✨',
    notes: [
      {midi:60,duration:2},{midi:60,duration:1},
      {midi:62,duration:2},{midi:64,duration:1},
      {midi:64,duration:2},{midi:62,duration:1},
      {midi:64,duration:2},{midi:65,duration:1},
      {midi:65,duration:2},{midi:64,duration:1},
      {midi:62,duration:3},
      {midi:60,duration:2},{midi:62,duration:1},
      {midi:64,duration:3},
      {midi:67,duration:4},
    ] },

  // Ave Maria (Schubert): ♩=58, very slow 4/4
  { id: 's10', name: 'Ave Maria', artist: 'Schubert', level: 'advanced', bpm: 58, genre: 'Classical', emoji: '🎻',
    notes: [
      {midi:60,duration:1.5},{midi:64,duration:0.5},{midi:67,duration:1},{midi:72,duration:1},
      {midi:72,duration:2},{midi:71,duration:0.5},{midi:69,duration:0.5},{midi:67,duration:1},
      {midi:65,duration:1.5},{midi:64,duration:0.5},{midi:60,duration:2},
      {midi:67,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:4},
    ] },

  // Bohemian Rhapsody (ballad section): ♩=72, 4/4
  { id: 's11', name: 'Bohemian Rhapsody', artist: 'Queen', level: 'advanced', bpm: 72, genre: 'Rock', emoji: '🎸',
    notes: [
      {midi:67,duration:1.5},{midi:67,duration:0.5},{midi:67,duration:0.5},{midi:65,duration:0.5},{midi:67,duration:1},
      {midi:69,duration:1},{midi:69,duration:1},{midi:65,duration:1},{midi:62,duration:1},
      {midi:60,duration:1.5},{midi:60,duration:0.5},{midi:62,duration:0.5},{midi:64,duration:0.5},{midi:65,duration:1},
      {midi:64,duration:1.5},{midi:62,duration:0.5},{midi:60,duration:2},
    ] },

  // Someone Like You (Adele): ♩=67, 4/4 ballad
  { id: 's12', name: 'Someone Like You', artist: 'Adele', level: 'advanced', bpm: 67, genre: 'Pop', emoji: '💙',
    notes: [
      {midi:64,duration:0.5},{midi:64,duration:1},{midi:67,duration:0.5},
      {midi:67,duration:1},{midi:69,duration:1},{midi:69,duration:1},
      {midi:67,duration:1.5},{midi:67,duration:0.5},
      {midi:64,duration:1},{midi:64,duration:0.5},{midi:62,duration:0.5},
      {midi:60,duration:1},{midi:60,duration:0.5},{midi:62,duration:0.5},{midi:64,duration:1},
      {midi:64,duration:4},
    ] },

  // Stairway to Heaven (intro): ♩=72, 6/8 flowing arpeggio feel
  { id: 's21', name: 'Stairway to Heaven', artist: 'Led Zeppelin', level: 'advanced', bpm: 72, genre: 'Rock', emoji: '🎚️',
    notes: [
      {midi:57,duration:1},{midi:61,duration:1},{midi:64,duration:1},
      {midi:65,duration:2},{midi:64,duration:1},
      {midi:61,duration:1},{midi:57,duration:2},
      {midi:56,duration:1},{midi:60,duration:1},{midi:64,duration:1},
      {midi:65,duration:2},{midi:64,duration:1},
      {midi:60,duration:1},{midi:56,duration:2},
    ] },

  // Creep (Radiohead): ♩=92, 4/4
  { id: 's22', name: 'Creep', artist: 'Radiohead', level: 'advanced', bpm: 92, genre: 'Alternative', emoji: '🎵',
    notes: [
      {midi:67,duration:2},{midi:67,duration:1},{midi:65,duration:1},
      {midi:65,duration:2},{midi:65,duration:1},{midi:64,duration:1},
      {midi:64,duration:2},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:4},
      {midi:60,duration:1},{midi:62,duration:1},{midi:64,duration:1},{midi:65,duration:1},
      {midi:67,duration:2},{midi:67,duration:2},
      {midi:65,duration:4},
    ] },

  // Over the Rainbow / Iz (jazz version): ♩=66, slow 4/4
  { id: 's23', name: 'Somewhere Over the Rainbow', artist: 'Iz', level: 'advanced', bpm: 66, genre: 'Jazz', emoji: '🌺',
    notes: [
      {midi:60,duration:2},{midi:72,duration:2},
      {midi:71,duration:1},{midi:69,duration:1},{midi:71,duration:1},{midi:72,duration:1},
      {midi:67,duration:4},
      {midi:0,duration:1},
      {midi:69,duration:1},{midi:67,duration:1},{midi:69,duration:1},{midi:71,duration:1},
      {midi:67,duration:4},
    ] },

  // What a Wonderful World: ♩=58, slow and warm
  { id: 's24', name: 'What a Wonderful World', artist: 'Louis Armstrong', level: 'advanced', bpm: 58, genre: 'Jazz', emoji: '🌍',
    notes: [
      {midi:60,duration:0.5},{midi:62,duration:1.5},{midi:64,duration:0.5},{midi:65,duration:1.5},
      {midi:64,duration:1},{midi:62,duration:1},{midi:60,duration:2},
      {midi:62,duration:0.5},{midi:64,duration:1.5},{midi:65,duration:0.5},{midi:67,duration:1.5},
      {midi:69,duration:1},{midi:67,duration:1},{midi:65,duration:2},
      {midi:64,duration:1},{midi:65,duration:1},{midi:64,duration:1},{midi:62,duration:1},
      {midi:60,duration:4},
    ] },

  // My Way (Sinatra): ♩=62, slow 4/4
  { id: 's25', name: 'My Way', artist: 'Frank Sinatra', level: 'advanced', bpm: 62, genre: 'Standards', emoji: '🎩',
    notes: [
      {midi:60,duration:1.5},{midi:62,duration:0.5},{midi:64,duration:1},{midi:65,duration:1},
      {midi:64,duration:2},{midi:62,duration:2},
      {midi:60,duration:2},{midi:64,duration:1},{midi:65,duration:1},
      {midi:67,duration:2},{midi:69,duration:2},
      {midi:72,duration:2},{midi:71,duration:1},{midi:69,duration:1},
      {midi:67,duration:4},
    ] },
];

// Daily challenge pool - rotates by day of year
export const DAILY_CHALLENGES = [
  { exerciseId: 'b1', type: 'scale' as const, title: 'Do-Re-Mi Master', desc: 'Complete Do-Re-Mi with 85%+ accuracy', target: 85, bonusXp: 50, bonusGems: 5 },
  { exerciseId: 'i5', type: 'scale' as const, title: 'Pentatonic Power', desc: 'Nail the Pentatonic Flow exercise', target: 80, bonusXp: 75, bonusGems: 8 },
  { exerciseId: 's7', type: 'song' as const, title: 'Classical Champion', desc: 'Sing Ode to Joy with 80%+ accuracy', target: 80, bonusXp: 80, bonusGems: 10 },
  { exerciseId: 'b3', type: 'scale' as const, title: 'Octave Leap', desc: 'Master the Octave Jump pattern', target: 90, bonusXp: 60, bonusGems: 6 },
  { exerciseId: 'i1', type: 'scale' as const, title: 'Full Scale Hero', desc: 'Complete the Full Major Scale', target: 85, bonusXp: 70, bonusGems: 7 },
  { exerciseId: 's5', type: 'song' as const, title: 'Gospel Spirit', desc: 'Sing Amazing Grace beautifully', target: 75, bonusXp: 85, bonusGems: 9 },
  { exerciseId: 'a2', type: 'scale' as const, title: 'Jazz Musician', desc: 'Tackle the Jazz Licks exercise', target: 70, bonusXp: 100, bonusGems: 12 },
  { exerciseId: 's3', type: 'song' as const, title: 'Simple Start', desc: 'Perfect Mary Had a Little Lamb', target: 90, bonusXp: 40, bonusGems: 4 },
  { exerciseId: 'i3', type: 'scale' as const, title: 'Arpeggio Artist', desc: 'Flow through the Arpeggio Climb', target: 80, bonusXp: 65, bonusGems: 7 },
  { exerciseId: 's9', type: 'song' as const, title: 'Hallelujah Moment', desc: 'Perform Hallelujah with feeling', target: 75, bonusXp: 90, bonusGems: 10 },
];

export function getDailyChallenge() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_CHALLENGES[dayOfYear % DAILY_CHALLENGES.length];
}
