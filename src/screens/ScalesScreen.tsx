import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import PitchMeter from '../../src/components/PitchMeter';
import WaveformDisplay from '../../src/components/WaveformDisplay';
import { usePitchDetection } from '../../src/hooks/usePitchDetection';
import { EXERCISES, Exercise } from '../../src/utils/scales';
import { noteToFrequency } from '../../src/utils/pitchUtils';
import { saveSession } from '../../src/utils/storage';

type Level = 'all' | 'beginner' | 'intermediate' | 'advanced';

export default function ScalesScreen() {
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [noteResults, setNoteResults] = useState<number[]>([]);
  const [filter, setFilter] = useState<Level>('all');
  const [countdown, setCountdown] = useState(0);

  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const {
    noteInfo,
    pitchHint,
    isListening,
    volume,
    startListening,
    stopListening,
  } = usePitchDetection();

  const filteredExercises = filter === 'all'
    ? EXERCISES
    : EXERCISES.filter(e => e.level === filter);

  const currentNote = selectedExercise?.notes[currentNoteIndex];

  // When note changes during exercise, check pitch accuracy
  useEffect(() => {
    if (!isRunning || !currentNote || pitchHint === 'silent') return;

    const targetMidi = currentNote.midiNote;
    const detectedMidi = noteInfo.midiNote;
    const diff = Math.abs(targetMidi - detectedMidi);
    const accuracy = diff === 0 ? 100 : diff === 1 ? 70 : diff === 2 ? 40 : 0;

    setNoteResults(prev => [...prev, accuracy]);
  }, [pitchHint, currentNoteIndex, isRunning]);

  const startExercise = async (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setCurrentNoteIndex(0);
    setNoteResults([]);
    setCountdown(3);
    await startListening();

    // Countdown
    let count = 3;
    const cdInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(cdInterval);
        setIsRunning(true);
        sessionStartRef.current = new Date();
        runNote(exercise, 0);
      }
    }, 1000);
  };

  const runNote = (exercise: Exercise, index: number) => {
    if (index >= exercise.notes.length) {
      finishExercise(exercise);
      return;
    }

    setCurrentNoteIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    noteTimerRef.current = setTimeout(() => {
      runNote(exercise, index + 1);
    }, exercise.notes[index].duration + 200);
  };

  const finishExercise = async (exercise: Exercise) => {
    setIsRunning(false);
    await stopListening();

    const durationSeconds = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      : 10;

    const avgAccuracy =
      noteResults.length > 0
        ? Math.round(noteResults.reduce((a, b) => a + b, 0) / noteResults.length)
        : 0;

    await saveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      type: 'scale',
      durationSeconds,
      avgAccuracy,
      notesHit: noteResults.filter(r => r >= 70).length,
      totalNotes: exercise.notes.length,
      streak: 0,
    });

    Alert.alert(
      '🎵 Exercise Complete!',
      `${exercise.name}\nAccuracy: ${avgAccuracy}%\nNotes hit: ${noteResults.filter(r => r >= 70).length}/${exercise.notes.length}`,
      [
        { text: 'Try Again', onPress: () => startExercise(exercise) },
        { text: 'Done', style: 'cancel', onPress: () => setSelectedExercise(null) },
      ]
    );
  };

  const stopExercise = async () => {
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    setIsRunning(false);
    setCountdown(0);
    await stopListening();
    setSelectedExercise(null);
  };

  const levelColors: Record<Level, string> = {
    all: COLORS.primary,
    beginner: COLORS.success,
    intermediate: COLORS.warning,
    advanced: COLORS.danger,
  };

  if (selectedExercise) {
    const targetFreq = currentNote ? noteToFrequency(currentNote.midiNote) : 0;

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A1A35', '#0A0A1A']} style={styles.exerciseHeader}>
          <TouchableOpacity onPress={stopExercise} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
            <Text style={styles.backText}>Stop</Text>
          </TouchableOpacity>
          <Text style={styles.exerciseTitle}>{selectedExercise.name}</Text>
        </LinearGradient>

        {/* Countdown overlay */}
        {countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownSub}>Get ready to sing!</Text>
          </View>
        )}

        {/* Current note display */}
        <View style={styles.noteProgressContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.noteScroll}>
            {selectedExercise.notes.map((n, i) => (
              <View
                key={i}
                style={[
                  styles.noteChip,
                  i === currentNoteIndex && styles.noteChipActive,
                  i < currentNoteIndex && styles.noteChipDone,
                ]}
              >
                <Text style={[
                  styles.noteChipText,
                  i === currentNoteIndex && { color: COLORS.primary },
                  i < currentNoteIndex && { color: COLORS.success },
                ]}>
                  {n.syllable}
                </Text>
                <Text style={[styles.noteChipNote, i === currentNoteIndex && { color: COLORS.primaryLight }]}>
                  {n.note}{n.octave}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Target note */}
        {currentNote && isRunning && (
          <View style={styles.targetNote}>
            <Text style={styles.targetLabel}>Sing this note:</Text>
            <Text style={styles.targetNoteName}>{currentNote.note}{currentNote.octave}</Text>
            <Text style={styles.targetSyllable}>{currentNote.syllable}</Text>
            <Text style={styles.targetFreq}>{Math.round(targetFreq)} Hz</Text>
          </View>
        )}

        {/* Waveform */}
        <View style={styles.waveformSmall}>
          <WaveformDisplay volume={volume} isActive={isListening} color={COLORS.accent} />
        </View>

        {/* Pitch Meter */}
        <PitchMeter
          cents={noteInfo.cents}
          pitchHint={pitchHint}
          note={noteInfo.note}
          octave={noteInfo.octave}
          frequency={noteInfo.frequency}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#0A1A35', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title}>🎵 Scale Exercises</Text>
        <Text style={styles.subtitle}>Practice scales and patterns to improve pitch accuracy</Text>
      </LinearGradient>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as Level[]).map(level => (
          <TouchableOpacity
            key={level}
            style={[styles.filterTab, filter === level && { backgroundColor: levelColors[level] }]}
            onPress={() => setFilter(level)}
          >
            <Text style={[styles.filterText, filter === level && { color: '#fff' }]}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise List */}
      <View style={styles.exerciseList}>
        {filteredExercises.map(exercise => (
          <TouchableOpacity
            key={exercise.id}
            style={styles.exerciseCard}
            onPress={() => startExercise(exercise)}
            activeOpacity={0.8}
          >
            <View style={styles.exerciseCardContent}>
              <View style={styles.exerciseIcon}>
                <Ionicons
                  name={
                    exercise.type === 'scale' ? 'musical-notes' :
                    exercise.type === 'arpeggio' ? 'sparkles' :
                    exercise.type === 'interval' ? 'swap-vertical' : 'grid'
                  }
                  size={24}
                  color={levelColors[exercise.level]}
                />
              </View>
              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseDesc}>{exercise.description}</Text>
                <View style={styles.exerciseMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: levelColors[exercise.level] + '30' }]}>
                    <Text style={[styles.levelText, { color: levelColors[exercise.level] }]}>
                      {exercise.level}
                    </Text>
                  </View>
                  <Text style={styles.noteCount}>{exercise.notes.length} notes</Text>
                  <Text style={styles.noteCount}>{exercise.bpm} BPM</Text>
                </View>
              </View>
              <Ionicons name="play-circle" size={32} color={levelColors[exercise.level]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING['2xl'] },
  header: { padding: SPACING.xl, paddingTop: SPACING['2xl'] },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  filterRow: { paddingHorizontal: SPACING.md, marginVertical: SPACING.md },
  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.card,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, color: COLORS.textSecondary },
  exerciseList: { padding: SPACING.md, gap: SPACING.sm },
  exerciseCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  exerciseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  exerciseDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, marginBottom: SPACING.xs },
  exerciseMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  noteCount: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  // Exercise active view
  exerciseHeader: { padding: SPACING.lg, paddingTop: SPACING.xl, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: COLORS.text, fontSize: FONTS.sizes.md },
  exerciseTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, flex: 1, textAlign: 'center' },
  countdownOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
  },
  countdownText: { fontSize: 100, fontWeight: FONTS.weights.black, color: COLORS.primary },
  countdownSub: { fontSize: FONTS.sizes.xl, color: COLORS.textSecondary, marginTop: SPACING.md },
  noteProgressContainer: { paddingVertical: SPACING.md },
  noteScroll: { paddingHorizontal: SPACING.md },
  noteChip: {
    alignItems: 'center',
    padding: SPACING.sm,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  noteChipDone: { borderColor: COLORS.success + '50', opacity: 0.6 },
  noteChipText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.textSecondary },
  noteChipNote: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  targetNote: { alignItems: 'center', paddingVertical: SPACING.md },
  targetLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  targetNoteName: { fontSize: FONTS.sizes['5xl'], fontWeight: FONTS.weights.black, color: COLORS.primary, marginTop: SPACING.xs },
  targetSyllable: { fontSize: FONTS.sizes.xl, color: COLORS.primaryLight, fontWeight: FONTS.weights.semibold },
  targetFreq: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, marginTop: SPACING.xs },
  waveformSmall: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
  },
});
