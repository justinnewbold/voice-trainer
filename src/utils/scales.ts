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

export const SONG_MELODIES: SongMelody[] = [
  // Beginner
  { id: 's1', name: 'Twinkle Twinkle', artist: 'Traditional', level: 'beginner', bpm: 80, genre: 'Children', emoji: '⭐',
    notes: [60,60,67,67,69,69,67,0, 65,65,64,64,62,62,60,0].map(m => ({ midi: m, duration: 1 })) },
  { id: 's2', name: 'Happy Birthday', artist: 'Traditional', level: 'beginner', bpm: 72, genre: 'Children', emoji: '🎂',
    notes: [60,60,62,60,65,64, 60,60,62,60,67,65].map(m => ({ midi: m, duration: 1 })) },
  { id: 's3', name: 'Mary Had a Little Lamb', artist: 'Traditional', level: 'beginner', bpm: 80, genre: 'Children', emoji: '🐑',
    notes: [64,62,60,62,64,64,64, 62,62,62, 64,67,67].map(m => ({ midi: m, duration: 1 })) },
  { id: 's4', name: 'Jingle Bells', artist: 'Traditional', level: 'beginner', bpm: 88, genre: 'Holiday', emoji: '🔔',
    notes: [64,64,64,64,64,64,64,67,60,62,64].map(m => ({ midi: m, duration: 1 })) },
  { id: 's13', name: 'Row Your Boat', artist: 'Traditional', level: 'beginner', bpm: 76, genre: 'Children', emoji: '🚣',
    notes: [60,60,60,62,64,64,62,64,65,67,72,72,72,67,67,67,64,64,64,60,60].map(m => ({ midi: m, duration: 1 })) },
  { id: 's14', name: 'London Bridge', artist: 'Traditional', level: 'beginner', bpm: 80, genre: 'Children', emoji: '🌉',
    notes: [67,69,67,65,64,65,67,62,64,65,64,65,67,67,69,67,65,64,65,67,62,67,64,60].map(m => ({ midi: m, duration: 1 })) },
  // Intermediate
  { id: 's5', name: 'Amazing Grace', artist: 'Traditional', level: 'intermediate', bpm: 72, genre: 'Gospel', emoji: '🙏',
    notes: [60,65,67,65,67,65,64,60, 60,65,67,65,67,72].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's6', name: 'Greensleeves', artist: 'Traditional', level: 'intermediate', bpm: 84, genre: 'Folk', emoji: '🌿',
    notes: [57,60,62,64,65,64,62,59,55,57,59,60,59,57,56,55,57].map(m => ({ midi: m, duration: 1 })) },
  { id: 's7', name: 'Ode to Joy', artist: 'Beethoven', level: 'intermediate', bpm: 96, genre: 'Classical', emoji: '🎼',
    notes: [64,64,65,67,67,65,64,62,60,60,62,64,64,62,62].map(m => ({ midi: m, duration: 1 })) },
  { id: 's8', name: 'Scarborough Fair', artist: 'Traditional', level: 'intermediate', bpm: 76, genre: 'Folk', emoji: '🌾',
    notes: [57,57,64,62,60,64,67,69,67,64,65,62,57].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's15', name: 'Danny Boy', artist: 'Traditional', level: 'intermediate', bpm: 66, genre: 'Folk', emoji: '🍀',
    notes: [60,65,65,67,65,67,69,65,64,60,60,62,64,65,67,65,64,62,60].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's16', name: 'House of the Rising Sun', artist: 'Traditional', level: 'intermediate', bpm: 70, genre: 'Blues', emoji: '🌅',
    notes: [57,60,64,67,64,60,57,60,64,67,64,60,55,59,62,67].map(m => ({ midi: m, duration: 1 })) },
  { id: 's17', name: 'Stand By Me', artist: 'Ben E. King', level: 'intermediate', bpm: 76, genre: 'Soul', emoji: '🤝',
    notes: [64,64,62,64,67,67,64,62,60,60,62,60].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's18', name: 'This Land Is Your Land', artist: 'Woody Guthrie', level: 'intermediate', bpm: 84, genre: 'Folk', emoji: '🏞️',
    notes: [67,67,67,67,65,64,62,60,62,62,64,65,64,62,60].map(m => ({ midi: m, duration: 1 })) },
  { id: 's19', name: 'You Are My Sunshine', artist: 'Traditional', level: 'intermediate', bpm: 80, genre: 'Country', emoji: '☀️',
    notes: [60,64,65,64,64,62,60,60,64,65,64,64,62,64].map(m => ({ midi: m, duration: 1 })) },
  { id: 's20', name: 'Over the Rainbow', artist: 'Harold Arlen', level: 'intermediate', bpm: 72, genre: 'Musical', emoji: '🌈',
    notes: [60,72,71,69,67,69,71,72,67,69,71,67,65,64,62,60].map(m => ({ midi: m, duration: 1.5 })) },
  // Advanced
  { id: 's9', name: 'Hallelujah', artist: 'Leonard Cohen', level: 'advanced', bpm: 72, genre: 'Indie', emoji: '✨',
    notes: [60,60,62,64,64,62,64,65,65,64,62,60,60,62,64,67].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's10', name: 'Ave Maria', artist: 'Schubert', level: 'advanced', bpm: 64, genre: 'Classical', emoji: '🎻',
    notes: [60,64,67,72,72,71,67,64,65,64,60,67,65,64,62,60].map(m => ({ midi: m, duration: 2 })) },
  { id: 's11', name: 'Bohemian Rhapsody', artist: 'Queen', level: 'advanced', bpm: 72, genre: 'Rock', emoji: '🎸',
    notes: [67,67,67,65,67,69,69,65,62,60,60,62,64,65,64,62,60].map(m => ({ midi: m, duration: 1 })) },
  { id: 's12', name: 'Someone Like You', artist: 'Adele', level: 'advanced', bpm: 68, genre: 'Pop', emoji: '💙',
    notes: [64,64,67,67,69,69,67,67,64,64,62,60,60,62,64].map(m => ({ midi: m, duration: 1 })) },
  { id: 's21', name: 'Stairway to Heaven', artist: 'Led Zeppelin', level: 'advanced', bpm: 72, genre: 'Rock', emoji: '🎚️',
    notes: [57,61,64,65,64,61,57,56,60,64,65,64,60,56].map(m => ({ midi: m, duration: 2 })) },
  { id: 's22', name: 'Creep', artist: 'Radiohead', level: 'advanced', bpm: 76, genre: 'Alternative', emoji: '🎵',
    notes: [67,67,65,65,64,64,62,60,60,62,64,65,67,67,65].map(m => ({ midi: m, duration: 1.5 })) },
  { id: 's23', name: 'Somewhere Over the Rainbow (Jazz)', artist: 'Iz', level: 'advanced', bpm: 60, genre: 'Jazz', emoji: '🌺',
    notes: [60,72,71,69,67,69,71,72,60,71,69,67,65,64,62,60].map(m => ({ midi: m, duration: 2 })) },
  { id: 's24', name: 'What a Wonderful World', artist: 'Louis Armstrong', level: 'advanced', bpm: 58, genre: 'Jazz', emoji: '🌍',
    notes: [60,62,64,65,64,62,60,62,64,65,67,69,67,65,64,62].map(m => ({ midi: m, duration: 2 })) },
  { id: 's25', name: 'My Way', artist: 'Frank Sinatra', level: 'advanced', bpm: 64, genre: 'Standards', emoji: '🎩',
    notes: [60,62,64,65,64,62,60,64,65,67,69,72,71,69,67,65].map(m => ({ midi: m, duration: 1.5 })) },
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
