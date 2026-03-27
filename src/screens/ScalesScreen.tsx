import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import CountdownCircle from '../components/CountdownCircle';
import ReplayGraph from '../components/ReplayGraph';
import Confetti from '../components/Confetti';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useReferenceTone } from '../hooks/useReferenceTone';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useHaptics } from '../hooks/useHaptics';
import { EXERCISES, Exercise } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo, isNoteHit, getNoteMatchScore } from '../utils/pitchUtils';
import { saveSession, getBests } from '../utils/storage';
import { createReplayBuilder, saveReplay, SessionReplay } from '../utils/sessionReplay';
import { useKeepAwake } from '../hooks/useKeepAwake';
import ContextMenu from '../components/ContextMenu';
import { A11Y } from '../hooks/useAccessibility';

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
  const [transpose, setTranspose] = useState(0);       // semitone offset
  const [showConfetti, setShowConfetti] = useState(false);
  const startRef = useRef<Date | null>(null);
  const replayBuilderRef = useRef<ReturnType<typeof createReplayBuilder> | null>(null);
  const noteStartRef = useRef<number>(0);
  const holdStartRef = useRef<number>(0); // when we first detected the current note correctly

  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();
  const { playNote, playing: tonePlaying } = useReferenceTone();
  const { playNoteHit, playFanfare, playComplete, playCountdownBeep } = useSoundEffects();
  const { hitNote, hitCombo, completeFanfare, countdownTick } = useHaptics();

  // Keep screen awake during active exercises
  useKeepAwake(isRunning);

  useEffect(() => { getBests().then(setBests); }, []);

  const filtered = filter === 'all' ? EXERCISES : EXERCISES.filter(e => e.level === filter);

  // Apply transpose to the current note
  const transposedNote = (midi: number) => midi + transpose;
  const currentNote = selected ? transposedNote(selected.notes[noteIdx]) : undefined;

  useEffect(() => {
    if (!isRunning || !selected || currentNote === undefined) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentNote));

    if (noteInfo.note !== '-' && noteInfo.frequency > 0 && replayBuilderRef.current) {
      replayBuilderRef.current.addSample({
        note: noteInfo.note, octave: noteInfo.octave, cents: noteInfo.cents, freq: noteInfo.frequency,
        targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentNote, hit: false,
      });
    }

    // Note matches if same note name AND within 50 cents (isNoteHit)
    const noteMatches = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && isNoteHit(noteInfo.cents);

    if (noteMatches) {
      // Start hold timer on first matching frame
      if (holdStartRef.current === 0) holdStartRef.current = Date.now();
      // Require 120ms hold to count as a real hit (eliminates transient glitches)
      const holdDuration = Date.now() - holdStartRef.current;
      if (holdDuration < 120) return; // not yet
    } else {
      holdStartRef.current = 0; // reset hold if note drifts away
      return;
    }

    // Note confirmed — record with partial score based on accuracy
    const matchScore = getNoteMatchScore(noteInfo.cents);
    holdStartRef.current = 0;
    playNoteHit();
    hitNote();
    replayBuilderRef.current?.recordNoteResult({
      targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentNote,
      sungNote: noteInfo.note + noteInfo.octave, cents: noteInfo.cents, hit: true,
      timeToHit: Date.now() - noteStartRef.current,
    });
    setResults(prev => [...prev, matchScore]);
    const next = noteIdx + 1;
    if (next >= selected.notes.length) { finishExercise(); return; }
    noteStartRef.current = Date.now();
    holdStartRef.current = 0;
    setNoteIdx(next);
  }, [noteInfo, isRunning]);

  const startExercise = async () => {
    setReplay(null);
    setShowConfetti(false);
    replayBuilderRef.current = createReplayBuilder(selected!.name, 'scale');
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      playCountdownBeep(i);
      countdownTick(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);
    noteStartRef.current = Date.now();
    holdStartRef.current = 0;
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

    // Sound + confetti
    if (acc >= 80) {
      playFanfare();
      completeFanfare();
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2500);
    } else {
      playComplete();
    }

    if (selected && replayBuilderRef.current) {
      for (let i = results.length; i < selected.notes.length; i++) {
        const ti = frequencyToNoteInfo(noteToFrequency(transposedNote(selected.notes[i])));
        replayBuilderRef.current.recordNoteResult({ targetNote: ti.note + ti.octave, targetMidi: transposedNote(selected.notes[i]), sungNote: '—', cents: 0, hit: false });
      }
      const builtReplay = replayBuilderRef.current.build(acc);
      await saveReplay(builtReplay);
      setReplay(builtReplay);
    }
    if (selected) {
      await saveSession({ id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name + (transpose !== 0 ? ` (${transpose > 0 ? '+' : ''}${transpose})` : ''), type: 'scale', duration, accuracy: acc, notesHit: results.length, totalNotes: selected.notes.length });
      getBests().then(setBests);
    }
  };

  // ── Replay ──
  if (replay) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.replayHeader}>
          <Text style={styles.replayHeaderText}>Session Complete</Text>
        </LinearGradient>
        <ReplayGraph replay={replay} onPracticeAgain={() => { setReplay(null); startExercise(); }} onClose={() => { setReplay(null); setSelected(null); }} />
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Active exercise ──
  if (selected && (isRunning || countdown > 0)) {
    const targetInfo = currentNote !== undefined ? frequencyToNoteInfo(noteToFrequency(currentNote)) : null;
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>{selected.name}{transpose !== 0 ? ` ${transpose > 0 ? '+' : ''}${transpose}` : ''}</Text>
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
                frequency={noteInfo.frequency} pitchHint={pitchHint} color={color} volume={volume} isStable={false} />
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
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Exercise detail ──
  if (selected) {
    const targetNotes = selected.notes.map(m => frequencyToNoteInfo(noteToFrequency(transposedNote(m))));
    const best = bests[selected.id];
    const transposedLabel = transpose === 0 ? 'Original key' : `${transpose > 0 ? '+' : ''}${transpose} semitones`;
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

          {/* Transpose control */}
          <View style={styles.transposeCard}>
            <View style={styles.transposeHeader}>
              <Text style={styles.transposeLabel}>🎚 Transpose</Text>
              <Text style={[styles.transposeValue, { color: transpose === 0 ? COLORS.textMuted : COLORS.primaryLight }]}>{transposedLabel}</Text>
            </View>
            <View style={styles.transposeRow}>
              <TouchableOpacity style={styles.transposeBtn} onPress={() => setTranspose(t => Math.max(-12, t - 1))}>
                <Ionicons name="remove" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <View style={styles.transposeTrack}>
                {[-4,-3,-2,-1,0,1,2,3,4].map(v => (
                  <TouchableOpacity key={v} onPress={() => setTranspose(v)} style={[styles.transposePip, transpose === v && styles.transposePipActive, v === 0 && styles.transposePipCenter]} />
                ))}
              </View>
              <TouchableOpacity style={styles.transposeBtn} onPress={() => setTranspose(t => Math.min(12, t + 1))}>
                <Ionicons name="add" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {transpose !== 0 && (
              <TouchableOpacity onPress={() => setTranspose(0)} style={styles.transposeReset}>
                <Text style={styles.transposeResetText}>Reset to original</Text>
              </TouchableOpacity>
            )}
          </View>

          {best && (
            <View style={styles.bestCard}>
              <Text style={styles.bestTitle}>🏆 Your Best: {best.accuracy}% · {best.attempts} attempts</Text>
            </View>
          )}
          <View style={styles.notePreview}>
            {targetNotes.map((n, i) => (
              <TouchableOpacity key={i}
                style={[styles.previewNote, { backgroundColor: LEVEL_COLORS[selected.level] + '22', borderColor: LEVEL_COLORS[selected.level] + '44' }]}
                onPress={() => playNote(transposedNote(selected.notes[i]))}>
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

  // ── Exercise list ──
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
            <ContextMenu
              actions={[
                { label: 'Start Exercise', icon: 'play', onPress: () => { setSelected(item); setTranspose(0); } },
                { label: 'Preview Notes', icon: 'musical-notes', onPress: () => { setSelected(item); setTranspose(0); } },
                ...(best ? [{ label: `Best: ${best.accuracy}%`, icon: 'trophy' as const, onPress: () => {} }] : []),
              ]}
            >
              <TouchableOpacity
                style={styles.exerciseCard}
                onPress={() => { setSelected(item); setTranspose(0); }}
                activeOpacity={0.7}
                {...A11Y.exerciseCard(item.name, item.level, !!best)}
              >
                <View style={[styles.levelDot, { backgroundColor: LEVEL_COLORS[item.level] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exerciseName}>{item.name}</Text>
                  <Text style={styles.exerciseDesc}>{item.description} · {item.notes.length} notes · {item.bpm} BPM</Text>
                </View>
                {best ? <Text style={[styles.bestMini, { color: best.accuracy >= 80 ? COLORS.success : COLORS.warning }]}>{best.accuracy}%</Text>
                  : <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />}
              </TouchableOpacity>
            </ContextMenu>
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
  transposeCard: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#2A2A50' },
  transposeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  transposeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  transposeValue: { fontSize: 13, fontWeight: '600' },
  transposeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transposeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E1E3A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  transposeTrack: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 36 },
  transposePip: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2A2A50' },
  transposePipActive: { backgroundColor: COLORS.primaryLight, width: 14, height: 14, borderRadius: 7 },
  transposePipCenter: { borderWidth: 1.5, borderColor: COLORS.textMuted },
  transposeReset: { marginTop: 10, alignItems: 'center' },
  transposeResetText: { fontSize: 12, color: COLORS.textMuted },
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


