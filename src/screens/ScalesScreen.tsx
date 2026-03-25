import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import CountdownCircle from '../components/CountdownCircle';
import ReplayGraph from '../components/ReplayGraph';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useReferenceTone } from '../hooks/useReferenceTone';
import { EXERCISES, Exercise } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo } from '../utils/pitchUtils';
import { saveSession, getBests } from '../utils/storage';
import { createReplayBuilder, saveReplay, SessionReplay } from '../utils/sessionReplay';

type Level = 'all' | 'beginner' | 'intermediate' | 'advanced';
const LEVEL_COLORS: Record<string, string> = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.danger };

export default function ScalesScreen() {
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [noteIdx, setNoteIdx] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [filter, setFilter] = useState<Level>('all');
  const [countdown, setCountdown] = useState(0);
  const [replay, setReplay] = useState<SessionReplay | null>(null);
  const [bests, setBests] = useState<Record<string, any>>({});
  const startRef = useRef<Date | null>(null);
  const replayBuilderRef = useRef<ReturnType<typeof createReplayBuilder> | null>(null);
  const noteStartRef = useRef<number>(0);
  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();
  const { playNote, playing: tonePlaying } = useReferenceTone();

  useEffect(() => { getBests().then(setBests); }, []);

  const filtered = filter === 'all' ? EXERCISES : EXERCISES.filter(e => e.level === filter);
  const currentNote = selected?.notes[noteIdx];

  useEffect(() => {
    if (!isRunning || !selected || !currentNote) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentNote));
    if (noteInfo.note !== '-' && noteInfo.frequency > 0 && replayBuilderRef.current) {
      replayBuilderRef.current.addSample({
        note: noteInfo.note, octave: noteInfo.octave, cents: noteInfo.cents, freq: noteInfo.frequency,
        targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentNote, hit: false,
      });
    }
    const isMatch = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && Math.abs(noteInfo.cents) < 30;
    if (isMatch) {
      replayBuilderRef.current?.recordNoteResult({
        targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentNote,
        sungNote: noteInfo.note + noteInfo.octave, cents: noteInfo.cents, hit: true,
        timeToHit: Date.now() - noteStartRef.current,
      });
      setResults(prev => [...prev, 100]);
      const next = noteIdx + 1;
      if (next >= selected.notes.length) { finishExercise(); return; }
      noteStartRef.current = Date.now();
      setNoteIdx(next);
    }
  }, [noteInfo, isRunning]);

  const startExercise = async () => {
    setReplay(null);
    replayBuilderRef.current = createReplayBuilder(selected!.name, 'scale');
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);
    noteStartRef.current = Date.now();
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
    if (selected && replayBuilderRef.current) {
      for (let i = results.length; i < selected.notes.length; i++) {
        const ti = frequencyToNoteInfo(noteToFrequency(selected.notes[i]));
        replayBuilderRef.current.recordNoteResult({ targetNote: ti.note + ti.octave, targetMidi: selected.notes[i], sungNote: '—', cents: 0, hit: false });
      }
      const builtReplay = replayBuilderRef.current.build(acc);
      await saveReplay(builtReplay);
      setReplay(builtReplay);
    }
    if (selected) {
      await saveSession({ id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name, type: 'scale', duration, accuracy: acc, notesHit: results.length, totalNotes: selected.notes.length });
      getBests().then(setBests);
    }
  };

  if (replay) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.replayHeader}>
          <Text style={styles.replayHeaderText}>Session Complete</Text>
        </LinearGradient>
        <ReplayGraph replay={replay} onPracticeAgain={() => { setReplay(null); startExercise(); }} onClose={() => { setReplay(null); setSelected(null); }} />
      </View>
    );
  }

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
            <CountdownCircle count={countdown} total={3} />
          ) : (
            <>
              {targetInfo && (
                <View style={styles.targetSection}>
                  <Text style={styles.targetLabel}>Sing this note</Text>
                  <View style={styles.targetNoteRow}>
                    <Text style={styles.targetNoteText}>{targetInfo.note}{targetInfo.octave}</Text>
                    <TouchableOpacity
                      style={[styles.listenBtn, tonePlaying && styles.listenBtnActive]}
                      onPress={() => playNote(currentNote!)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={tonePlaying ? 'volume-high' : 'volume-medium-outline'} size={18} color={tonePlaying ? COLORS.primaryLight : COLORS.textMuted} />
                      <Text style={[styles.listenBtnText, tonePlaying && { color: COLORS.primaryLight }]}>
                        {tonePlaying ? 'Playing…' : 'Hear it'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.targetFreq}>{Math.round(noteToFrequency(currentNote!))} Hz</Text>
                </View>
              )}
              <PitchMeter note={noteInfo.note} octave={noteInfo.octave} cents={noteInfo.cents}
                frequency={noteInfo.frequency} pitchHint={pitchHint} color={color} volume={volume} isStable={noteInfo.isStable ?? false} />
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(noteIdx / selected.notes.length) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{noteIdx} / {selected.notes.length} notes</Text>
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
    const best = bests[selected.id];
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            <Text style={styles.backText}>Scales</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.subtitle}>{selected.description}</Text>
        </LinearGradient>
        <ScrollView style={styles.detailContent}>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Level</Text><Text style={[styles.metaValue, { color: LEVEL_COLORS[selected.level] }]}>{selected.level}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>Notes</Text><Text style={styles.metaValue}>{selected.notes.length}</Text></View>
            <View style={styles.metaItem}><Text style={styles.metaLabel}>BPM</Text><Text style={styles.metaValue}>{selected.bpm}</Text></View>
          </View>
          {best && (
            <View style={styles.bestCard}>
              <Text style={styles.bestTitle}>🏆 Your Best: {best.accuracy}% · {best.attempts} attempts</Text>
            </View>
          )}
          <View style={styles.notePreview}>
            {targetNotes.map((n, i) => (
              <TouchableOpacity key={i} style={[styles.previewNote, { backgroundColor: LEVEL_COLORS[selected.level] + '22', borderColor: LEVEL_COLORS[selected.level] + '44' }]}
                onPress={() => playNote(selected.notes[i])}>
                <Text style={[styles.previewNoteText, { color: LEVEL_COLORS[selected.level] }]}>{n.note}{n.octave}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.tapHint}>Tap any note above to hear it</Text>
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
              <Text style={[styles.filterText, filter === l && styles.filterTextActive]}>{l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const best = bests[item.id];
          return (
            <TouchableOpacity style={styles.exerciseCard} onPress={() => setSelected(item)} activeOpacity={0.7}>
              <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseDesc}>{item.description} · {item.notes.length} notes · {item.bpm} BPM</Text>
              </View>
              {best ? <Text style={[styles.bestMini, { color: best.accuracy >= 80 ? COLORS.success : COLORS.warning }]}>{best.accuracy}%</Text>
                : <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  replayHeader: { paddingTop: 56, paddingBottom: 12, paddingHorizontal: SPACING.lg },
  replayHeaderText: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: SPACING.sm, flexWrap: 'wrap' },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  filterText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, fontWeight: FONTS.weights.semibold },
  filterTextActive: { color: COLORS.primaryLight },
  exerciseCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  levelDot: { width: 10, height: 10, borderRadius: 5 },
  exerciseName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  exerciseDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  bestMini: { fontSize: 14, fontWeight: '700' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
  detailContent: { flex: 1, padding: SPACING.lg },
  metaRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A50' },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  bestCard: { backgroundColor: '#1a2a1a', borderRadius: BORDER_RADIUS.lg, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: COLORS.success + '44' },
  bestTitle: { fontSize: 13, color: COLORS.success, fontWeight: '700' },
  notePreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  previewNote: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  previewNoteText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  tapHint: { fontSize: 11, color: COLORS.textMuted, marginBottom: SPACING.xl, textAlign: 'center' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: BORDER_RADIUS.lg },
  startText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
  exerciseContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  targetSection: { alignItems: 'center', gap: 4 },
  targetLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  targetNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  targetNoteText: { fontSize: 52, fontWeight: FONTS.weights.black, color: COLORS.primaryLight },
  targetFreq: { fontSize: 12, color: COLORS.textMuted },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BORDER_RADIUS.full, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50' },
  listenBtnActive: { borderColor: COLORS.primaryLight, backgroundColor: '#2A1A5E' },
  listenBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  progressBar: { width: '80%', height: 6, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textMuted },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.danger, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BORDER_RADIUS.lg },
  stopText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
});
