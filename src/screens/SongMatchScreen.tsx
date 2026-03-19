import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { SONG_MELODIES, SongMelody } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo } from '../utils/pitchUtils';
import { saveSession } from '../utils/storage';

const LEVEL_COLORS: Record<string, string> = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.danger };

export default function SongMatchScreen() {
  const [selected, setSelected] = useState<SongMelody | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [noteIdx, setNoteIdx] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const startRef = useRef<Date | null>(null);
  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();

  const currentSongNote = selected?.notes[noteIdx];

  useEffect(() => {
    if (!isRunning || !selected || !currentSongNote || currentSongNote.midi === 0) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentSongNote.midi));
    const isMatch = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && Math.abs(noteInfo.cents) < 30;
    if (isMatch) {
      const newCombo = combo + 1;
      const points = 100 + (newCombo > 1 ? newCombo * 10 : 0);
      setScore(s => s + points);
      setCombo(newCombo);
      setResults(prev => [...prev, 100]);
      const next = noteIdx + 1;
      if (next >= selected.notes.length) { finishSong(); return; }
      setNoteIdx(next);
    }
  }, [noteInfo, isRunning]);

  const startSong = async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) { await new Promise(r => setTimeout(r, 1000)); setCountdown(i - 1); }
    await startListening();
    startRef.current = new Date();
    setIsRunning(true);
    setNoteIdx(0);
    setResults([]);
    setScore(0);
    setCombo(0);
  };

  const finishSong = async () => {
    setIsRunning(false);
    await stopListening();
    const duration = startRef.current ? Math.floor((Date.now() - startRef.current.getTime()) / 1000) : 0;
    const acc = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    if (selected) {
      await saveSession({
        id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name,
        type: 'song', duration, accuracy: acc, score, notesHit: results.length, totalNotes: selected.notes.length,
      });
    }
  };

  if (selected && (isRunning || countdown > 0)) {
    const targetInfo = currentSongNote && currentSongNote.midi > 0 ? frequencyToNoteInfo(noteToFrequency(currentSongNote.midi)) : null;
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2a0a1e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.subtitle}>Note {noteIdx + 1} / {selected.notes.length} · Score: {score} · Combo: {combo}x</Text>
        </LinearGradient>
        <View style={styles.exerciseContent}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <>
              {targetInfo && (
                <View style={styles.targetNote}>
                  <Text style={styles.targetLabel}>Sing:</Text>
                  <Text style={styles.targetNoteText}>{targetInfo.note}{targetInfo.octave}</Text>
                </View>
              )}
              <PitchMeter note={noteInfo.note} octave={noteInfo.octave} cents={noteInfo.cents}
                frequency={0} pitchHint={pitchHint} color={color} volume={volume} isStable={false} />
              <TouchableOpacity style={styles.stopBtn} onPress={finishSong}>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={styles.stopText}>End Song</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (selected) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2a0a1e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.subtitle}>{selected.artist} · {selected.notes.length} notes · {selected.bpm} BPM</Text>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
          <TouchableOpacity style={styles.startBtn} onPress={startSong}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.startText}>Start Song</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2a0a1e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>Song Match</Text>
        <Text style={styles.subtitle}>Match the melody note by note</Text>
      </LinearGradient>
      <FlatList
        data={SONG_MELODIES}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.songCard} onPress={() => setSelected(item)} activeOpacity={0.7}>
            <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.songName}>{item.name}</Text>
              <Text style={styles.songArtist}>{item.artist} · {item.level} · {item.notes.length} notes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  songCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  songName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  songArtist: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ec4899', paddingHorizontal: 28, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg },
  startText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
  exerciseContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  countdown: { fontSize: 72, fontWeight: '900', color: '#ec4899' },
  targetNote: { alignItems: 'center', gap: 4 },
  targetLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  targetNoteText: { fontSize: FONTS.sizes['3xl'], fontWeight: FONTS.weights.black, color: '#ec4899' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.danger, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg },
  stopText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
});
