import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const PHASE_ORDER = ['inhale', 'hold1', 'exhale', 'hold2'] as const;
const PHASES = {
  inhale: { label: 'Breathe In', color: '#7c6af7' },
  hold1: { label: 'Hold', color: '#a78bfa' },
  exhale: { label: 'Breathe Out', color: '#4ade80' },
  hold2: { label: 'Hold', color: '#34d399' },
};

const WARMUPS = [
  { id: 'breathing', title: 'Box Breathing', subtitle: 'Calm & center', icon: '🫁', color: '#7c6af7', rounds: 4, type: 'breathing' as const,
    steps: [{ label: 'Follow the breathing circle', duration: 16 }] },
  { id: 'lip_trill', title: 'Lip Trills', subtitle: 'Loosen lips', icon: '👄', color: '#f472b6', rounds: 3, type: 'timed' as const,
    steps: [
      { label: 'Relax your face & jaw completely', duration: 5 },
      { label: 'Trill up — low note to high note', duration: 6 },
      { label: 'Trill down — high note to low note', duration: 6 },
      { label: 'Trill on "brrr" — hold steady pitch', duration: 8 },
    ] },
  { id: 'humming', title: 'Humming Scale', subtitle: 'Warm the cords', icon: '🎵', color: '#34d399', rounds: 3, type: 'timed' as const,
    steps: [
      { label: 'Hum "mmmm" — comfortable low note', duration: 6 },
      { label: 'Slide up slowly — low → mid', duration: 8 },
      { label: 'Slide up — mid → high', duration: 8 },
      { label: 'Slide all the way back down', duration: 8 },
    ] },
  { id: 'siren', title: 'Vocal Siren', subtitle: 'Full range', icon: '🚀', color: '#fb923c', rounds: 4, type: 'timed' as const,
    steps: [
      { label: 'Siren UP — lowest to highest (say "weeee")', duration: 8 },
      { label: 'Siren DOWN — highest back to lowest', duration: 8 },
      { label: 'Siren UP — go a little higher', duration: 8 },
      { label: 'Siren DOWN — land softly on low note', duration: 8 },
    ] },
];

function BreathingExercise({ rounds, onComplete }: { rounds: number; onComplete: () => void }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [round, setRound] = useState(1);
  const [cd, setCd] = useState(4);
  const [started, setStarted] = useState(false);
  const phase = PHASES[PHASE_ORDER[phaseIdx]];

  useEffect(() => {
    if (!started) return;
    setCd(4);
    const t = setInterval(() => {
      setCd(prev => {
        if (prev <= 1) {
          clearInterval(t);
          setPhaseIdx(pi => {
            const next = pi + 1;
            if (next >= PHASE_ORDER.length) {
              setRound(r => { if (r >= rounds) { setTimeout(onComplete, 300); return r; } return r + 1; });
              return 0;
            }
            return next;
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [started, phaseIdx, round]);

  if (!started) return (
    <View style={styles.centeredContent}>
      <Text style={{ fontSize: 72 }}>🫁</Text>
      <Text style={styles.breathDesc}>4 counts in · 4 hold · 4 out · 4 hold · {rounds} rounds</Text>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7c6af7' }]} onPress={() => setStarted(true)}>
        <Text style={styles.actionBtnText}>Start Breathing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.centeredContent}>
      <Text style={styles.roundText}>Round {round} / {rounds}</Text>
      <View style={[styles.breathCircle, { borderColor: phase.color, backgroundColor: phase.color + '22' }]}>
        <Text style={[styles.breathCount, { color: phase.color }]}>{cd}</Text>
      </View>
      <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
      <View style={styles.phaseDots}>
        {PHASE_ORDER.map((p, i) => (
          <View key={p} style={[styles.phaseDot, { backgroundColor: i === phaseIdx ? phase.color : COLORS.border, width: i === phaseIdx ? 20 : 8 }]} />
        ))}
      </View>
    </View>
  );
}

function TimedExercise({ exercise, onComplete }: { exercise: typeof WARMUPS[0]; onComplete: () => void }) {
  const [stepIdx, setStepIdx] = useState(-1);
  const [round, setRound] = useState(1);
  const [cd, setCd] = useState(0);

  useEffect(() => {
    if (stepIdx < 0) return;
    const step = exercise.steps[stepIdx];
    setCd(step.duration);
    const t = setInterval(() => {
      setCd(prev => {
        if (prev <= 1) {
          clearInterval(t);
          const next = stepIdx + 1;
          if (next >= exercise.steps.length) {
            if (round + 1 > exercise.rounds) { setTimeout(onComplete, 300); }
            else { setRound(r => r + 1); setStepIdx(0); }
          } else { setStepIdx(next); }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stepIdx, round]);

  if (stepIdx < 0) return (
    <View style={styles.centeredContent}>
      <Text style={{ fontSize: 72 }}>{exercise.icon}</Text>
      <Text style={styles.breathDesc}>{exercise.rounds} rounds · {exercise.steps.length} steps</Text>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: exercise.color }]} onPress={() => setStepIdx(0)}>
        <Text style={styles.actionBtnText}>Begin {exercise.title}</Text>
      </TouchableOpacity>
    </View>
  );

  const step = exercise.steps[stepIdx];
  return (
    <View style={styles.centeredContent}>
      <Text style={styles.roundText}>Round {round} / {exercise.rounds}</Text>
      <View style={[styles.breathCircle, { borderColor: exercise.color }]}>
        <Text style={[styles.breathCount, { color: exercise.color }]}>{cd}</Text>
      </View>
      <View style={[styles.stepCard, { borderColor: exercise.color + '44' }]}>
        <Text style={[styles.stepLabel, { color: exercise.color }]}>Step {stepIdx + 1} / {exercise.steps.length}</Text>
        <Text style={styles.stepText}>{step.label}</Text>
      </View>
    </View>
  );
}

export default function WarmupScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  const exercise = WARMUPS.find(w => w.id === selected);

  if (exercise) {
    const Component = exercise.type === 'breathing' ? BreathingExercise : TimedExercise;
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{exercise.title}</Text>
        </LinearGradient>
        {exercise.type === 'breathing'
          ? <BreathingExercise rounds={exercise.rounds} onComplete={() => { setCompleted(p => [...p, exercise.id]); setSelected(null); }} />
          : <TimedExercise exercise={exercise} onComplete={() => { setCompleted(p => [...p, exercise.id]); setSelected(null); }} />
        }
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>Warmup</Text>
        <Text style={styles.subtitle}>{completed.length > 0 ? `${completed.length} / ${WARMUPS.length} complete` : 'Start with breathing, then warm up'}</Text>
      </LinearGradient>
      <ScrollView contentContainerStyle={{ padding: SPACING.md, paddingBottom: 100 }}>
        {completed.length > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed.length / WARMUPS.length) * 100}%` }]} />
          </View>
        )}
        {WARMUPS.map((w, i) => {
          const isDone = completed.includes(w.id);
          return (
            <TouchableOpacity key={w.id} style={[styles.warmupCard, isDone && { opacity: 0.6 }]}
              onPress={() => !isDone && setSelected(w.id)} disabled={isDone} activeOpacity={0.7}>
              <View style={[styles.warmupNum, { borderColor: isDone ? w.color : COLORS.border, backgroundColor: isDone ? w.color + '33' : COLORS.surface }]}>
                <Text style={[styles.warmupNumText, { color: isDone ? w.color : COLORS.textMuted }]}>{isDone ? '✓' : i + 1}</Text>
              </View>
              <Text style={{ fontSize: 28 }}>{w.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.warmupTitle}>{w.title}</Text>
                <Text style={styles.warmupSub}>{w.subtitle} · {w.rounds} rounds</Text>
              </View>
              {!isDone && <Ionicons name="chevron-forward" size={18} color={w.color} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: SPACING.md, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  backText: { color: COLORS.text, fontSize: FONTS.sizes.sm },
  progressBar: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', marginBottom: SPACING.md },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#4ade80' },
  warmupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  warmupNum: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  warmupNumText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  warmupTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  warmupSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.lg, padding: SPACING.lg },
  breathDesc: { color: COLORS.textSecondary, textAlign: 'center', fontSize: FONTS.sizes.sm },
  actionBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg },
  actionBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  roundText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  breathCircle: { width: 140, height: 140, borderRadius: 70, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  breathCount: { fontSize: 48, fontWeight: '900' },
  phaseLabel: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold },
  phaseDots: { flexDirection: 'row', gap: 6 },
  phaseDot: { height: 8, borderRadius: 4 },
  stepCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, width: '100%', maxWidth: 320, alignItems: 'center' },
  stepLabel: { fontSize: FONTS.sizes.xs, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' },
  stepText: { fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: FONTS.weights.semibold, textAlign: 'center' },
});
