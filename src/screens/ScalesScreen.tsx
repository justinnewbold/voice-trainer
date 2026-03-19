import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { EXERCISES, Exercise } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo } from '../utils/pitchUtils';
import { saveSession } from '../utils/storage';

type Level = 'all' | 'beginner' | 'intermediate' | 'advanced';
const LEVEL_COLORS: Record<string, string> = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.danger };

export default function ScalesScreen() {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [noteIdx, setNoteIdx] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [filter, setFilter] = useState<Level>('all');
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<Date | null>(null);
  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();

  const filtered = filter === 'all' ? EXERCISES : EXERCISES.filter(e => e.level === filter);
  const currentNote = selected?.notes[noteIdx];

  useEffect(() => {
    if (!isRunning || !selected || !currentNote) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentNote));
    const isMatch = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && Math.abs(noteInfo.cents) < 30;
    if (isMatch) {
      setResults(prev => [...prev, 100]);
      const next = noteIdx + 1;
      if (next >= selected.notes.length) { finishExercise(); return; }
      setNoteIdx(next);
    }
  }, [noteInfo, isRunning]);

  const startExercise = async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      await new Promise(r => setTimeout(r, 1000));
      setCountdown(i - 1);
    }
    setCountdown(0);
    await startListening();
    startRef.current = new Date();
    setIsRunning(true);
    setNoteIdx(0);
    setResults([]);
  };

  const finishExercise = async () => {
    setIsRunning(false);
    await stopListening();
    const duration = startRef.current ? Math.floor((Date.now() - startRef.current.getTime()) / 1000) : 0;
    const acc = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    if (selected) {
      await saveSession({
        id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name,
        type: 'scale', duration, accuracy: acc, notesHit: results.length, totalNotes: selected.notes.length,
      });
    }
  };

  if (selected && (isRunning || countdown > 0)) {
    const targetInfo = currentNote ? frequencyToNoteInfo(noteToFrequency(currentNote)) : null;
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.subtitle}>Note {noteIdx + 1} / {selected.notes.length}</Text>
        </LinearGradient>
        <View style={styles.exerciseContent}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <>
              {targetInfo && (
                <View style={styles.targetNote}>
                  <Text style={styles.targetLabel}>Sing this note:</Text>
                  <Text style={styles.targetNoteText}>{targetInfo.note}{targetInfo.octave}</Text>
                </View>
              )}
              <PitchMeter note={noteInfo.note} octave={noteInfo.octave} cents={noteInfo.cents}
                frequency={0} pitchHint={pitchHint} color={color} volume={volume} isStable={false} />
              <TouchableOpacity style={styles.stopBtn} onPress={finishExercise}>
                <Ionicons name="stop" size={20} color="#fff" />
                <Text style={styles.stopText}>End Exercise</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  if (selected) {
    const targetNotes = selected.notes.map(m => frequencyToNoteInfo(noteToFrequency(m)));
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.subtitle}>{selected.description}</Text>
        </LinearGradient>
        <ScrollView style={styles.detailContent}>
          <View style={styles.notePreview}>
            {targetNotes.map((n, i) => (
              <View key={i} style={[styles.previewNote, { backgroundColor: LEVEL_COLORS[selected.level] + '22', borderColor: LEVEL_COLORS[selected.level] + '44' }]}>
                <Text style={[styles.previewNoteText, { color: LEVEL_COLORS[selected.level] }]}>{n.note}{n.octave}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={startExercise}>
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.startText}>Start Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>Scales & Exercises</Text>
        <View style={styles.filterRow}>
          {(['all', 'beginner', 'intermediate', 'advanced'] as Level[]).map(l => (
            <TouchableOpacity key={l} style={[styles.filterBtn, filter === l && styles.filterActive]} onPress={() => setFilter(l)}>
              <Text style={[styles.filterText, filter === l && styles.filterTextActive]}>{l.charAt(0).toUpperCase() + l.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.exerciseCard} onPress={() => setSelected(item)} activeOpacity={0.7}>
            <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.exerciseName}>{item.name}</Text>
              <Text style={styles.exerciseDesc}>{item.description} · {item.notes.length} notes · {item.bpm} BPM</Text>
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
  filterRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.semibold },
  filterTextActive: { color: COLORS.primaryLight },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  exerciseName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  exerciseDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
  detailContent: { flex: 1, padding: SPACING.lg },
  notePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.xl },
  previewNote: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  previewNoteText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg },
  startText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
  exerciseContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.xl },
  countdown: { fontSize: 72, fontWeight: '900', color: COLORS.primaryLight },
  targetNote: { alignItems: 'center', gap: 4 },
  targetLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  targetNoteText: { fontSize: FONTS.sizes['3xl'], fontWeight: FONTS.weights.black, color: COLORS.primaryLight },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.danger, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg },
  stopText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
});
