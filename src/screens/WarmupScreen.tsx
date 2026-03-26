import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

// What to suggest after each warmup
const NEXT_SUGGESTIONS: Record<string, { label: string; desc: string; icon: string }> = {
  breathing:  { label: 'Do Lip Trills',    desc: 'Loosen your lips before singing', icon: '👄' },
  lip_trill:  { label: 'Try Humming Scale', desc: 'Warm your vocal cords gently',    icon: '🎵' },
  humming:    { label: 'Do Vocal Siren',   desc: 'Open your full range',             icon: '🚀' },
  siren:      { label: "Let's Sing! 🎤",   desc: 'Your voice is ready — start a scale or song', icon: '🎶' },
};

// ── Completion Modal ───────────────────────────────────────────────────────────
function CompletionModal({
  exercise, visible, onNext, onClose, isFullyWarmedUp,
}: {
  exercise: typeof WARMUPS[0];
  visible: boolean;
  onNext: () => void;
  onClose: () => void;
  isFullyWarmedUp: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const suggestion = NEXT_SUGGESTIONS[exercise.id];

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 180, friction: 7 }).start();
    } else {
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.modalCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.modalEmoji}>{exercise.icon}</Text>
          <Text style={styles.modalTitle}>{exercise.title} Done!</Text>
          <Text style={styles.modalSubtitle}>
            {isFullyWarmedUp
              ? '🔥 Full warmup complete! Your voice is ready to sing.'
              : 'Great work. Keep the momentum going.'}
          </Text>

          {/* Next suggestion */}
          <TouchableOpacity style={[styles.modalNextBtn, isFullyWarmedUp && styles.modalNextBtnHighlight]} onPress={onNext}>
            <Text style={styles.modalNextIcon}>{suggestion.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalNextLabel}>{suggestion.label}</Text>
              <Text style={styles.modalNextDesc}>{suggestion.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={isFullyWarmedUp ? '#fff' : COLORS.primaryLight} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.modalDismiss} onPress={onClose}>
            <Text style={styles.modalDismissText}>Stay on warmup screen</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── All Done Screen ────────────────────────────────────────────────────────────
function AllDoneScreen({ onReset, onGoSing }: { onReset: () => void; onGoSing: () => void }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.allDoneContent}>
      <Animated.Text style={[styles.allDoneEmoji, { transform: [{ scale: pulseAnim }] }]}>🎤</Animated.Text>
      <Text style={styles.allDoneTitle}>Fully Warmed Up!</Text>
      <Text style={styles.allDoneSubtitle}>
        You've completed all four warmup exercises.{'\n'}Your voice is ready to perform.
      </Text>

      <TouchableOpacity style={styles.goSingBtn} onPress={onGoSing}>
        <Ionicons name="musical-notes" size={22} color="#fff" />
        <Text style={styles.goSingBtnText}>Let's Sing! — Go to Scales</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.goSongsBtn} onPress={onGoSing}>
        <Ionicons name="headset" size={20} color={COLORS.primaryLight} />
        <Text style={styles.goSongsBtnText}>Or try a Song</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
        <Ionicons name="refresh" size={16} color={COLORS.textMuted} />
        <Text style={styles.resetBtnText}>Reset warmup</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Breathing Exercise ─────────────────────────────────────────────────────────
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
  }, [phaseIdx, round, started]);

  if (!started) return (
    <View style={styles.centeredContent}>
      <Text style={{ fontSize: 72 }}>🫁</Text>
      <Text style={styles.breathDesc}>{rounds} rounds · Follow the breathing pattern</Text>
      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#7c6af7' }]} onPress={() => setStarted(true)}>
        <Text style={styles.actionBtnText}>Begin Box Breathing</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.centeredContent}>
      <Text style={styles.roundText}>Round {round} / {rounds}</Text>
      <View style={[styles.breathCircle, { borderColor: phase.color }]}>
        <Text style={[styles.breathCount, { color: phase.color }]}>{cd}</Text>
      </View>
      <Text style={[styles.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
      <View style={styles.phaseDots}>
        {PHASE_ORDER.map((p, i) => (
          <View key={p} style={[styles.phaseDot, { width: i === phaseIdx ? 24 : 8, backgroundColor: i === phaseIdx ? phase.color : COLORS.border }]} />
        ))}
      </View>
    </View>
  );
}

// ── Timed Exercise ─────────────────────────────────────────────────────────────
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
          const nextStep = stepIdx + 1;
          if (nextStep >= exercise.steps.length) {
            if (round >= exercise.rounds) { setTimeout(onComplete, 300); }
            else { setRound(r => r + 1); setStepIdx(0); }
          } else {
            setStepIdx(nextStep);
          }
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

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function WarmupScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [completionModal, setCompletionModal] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);

  const exercise = WARMUPS.find(w => w.id === selected);
  const isFullyWarmedUp = completed.length >= WARMUPS.length;

  const handleComplete = (id: string) => {
    const newCompleted = completed.includes(id) ? completed : [...completed, id];
    setCompleted(newCompleted);
    setSelected(null);
    setCompletionModal(id);
  };

  const handleModalNext = (id: string) => {
    setCompletionModal(null);
    const completedNow = completed.includes(id) ? completed : [...completed, id];
    const isFullyDone = completedNow.length >= WARMUPS.length;

    if (isFullyDone) {
      setShowAllDone(true);
      return;
    }

    // Navigate to next uncompleted warmup
    const next = WARMUPS.find(w => !completedNow.includes(w.id));
    if (next) setSelected(next.id);
  };

  const handleGoSing = () => {
    router.push('/(tabs)/scales');
  };

  const handleReset = () => {
    setCompleted([]);
    setShowAllDone(false);
  };

  // Show all-done screen if fully warmed up
  if (showAllDone || isFullyWarmedUp) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>Warmup Complete 🎤</Text>
          <Text style={styles.subtitle}>All 4 exercises done</Text>
        </LinearGradient>
        <AllDoneScreen onReset={handleReset} onGoSing={handleGoSing} />
      </View>
    );
  }

  // Show active exercise
  if (exercise) {
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
          ? <BreathingExercise rounds={exercise.rounds} onComplete={() => handleComplete(exercise.id)} />
          : <TimedExercise exercise={exercise} onComplete={() => handleComplete(exercise.id)} />
        }
      </View>
    );
  }

  // Warmup list
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>Warmup</Text>
        <Text style={styles.subtitle}>
          {completed.length > 0
            ? `${completed.length} / ${WARMUPS.length} complete — ${isFullyWarmedUp ? 'voice ready!' : 'keep going!'}`
            : 'Start with breathing, then warm up'}
        </Text>
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
            <TouchableOpacity
              key={w.id}
              style={[styles.warmupCard, isDone && styles.warmupCardDone]}
              onPress={() => !isDone && setSelected(w.id)}
              disabled={isDone}
              activeOpacity={0.7}
            >
              <View style={[styles.warmupNum, { borderColor: isDone ? w.color : COLORS.border, backgroundColor: isDone ? w.color + '33' : COLORS.surface }]}>
                <Text style={[styles.warmupNumText, { color: isDone ? w.color : COLORS.textMuted }]}>{isDone ? '✓' : i + 1}</Text>
              </View>
              <Text style={{ fontSize: 28 }}>{w.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.warmupTitle, isDone && { color: COLORS.textMuted }]}>{w.title}</Text>
                <Text style={styles.warmupSub}>{w.subtitle} · {w.rounds} rounds</Text>
              </View>
              {isDone
                ? <View style={[styles.doneBadge, { backgroundColor: w.color + '22' }]}><Text style={[styles.doneBadgeText, { color: w.color }]}>Done</Text></View>
                : <Ionicons name="chevron-forward" size={18} color={w.color} />
              }
            </TouchableOpacity>
          );
        })}

        {/* Go sing shortcut if partially done */}
        {completed.length >= 2 && !isFullyWarmedUp && (
          <TouchableOpacity style={styles.earlySignBtn} onPress={handleGoSing}>
            <Ionicons name="musical-notes" size={18} color={COLORS.primaryLight} />
            <Text style={styles.earlySingText}>Start singing now (skip remaining)</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Completion modal */}
      {completionModal && (
        <CompletionModal
          exercise={WARMUPS.find(w => w.id === completionModal)!}
          visible={!!completionModal}
          onNext={() => handleModalNext(completionModal)}
          onClose={() => setCompletionModal(null)}
          isFullyWarmedUp={completed.length >= WARMUPS.length}
        />
      )}
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
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginBottom: SPACING.md },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#4ade80' },
  warmupCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border },
  warmupCardDone: { opacity: 0.65 },
  warmupNum: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  warmupNumText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  warmupTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  warmupSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  doneBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  doneBadgeText: { fontSize: 11, fontWeight: '700' },
  earlySignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, padding: 14, borderRadius: BORDER_RADIUS.lg, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: COLORS.primary + '55' },
  earlySingText: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },
  // Exercise screens
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
  // Completion modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#13132A', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  modalEmoji: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  modalNextBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.lg, padding: 14, width: '100%', marginBottom: 10, borderWidth: 1, borderColor: COLORS.primary + '55' },
  modalNextBtnHighlight: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalNextIcon: { fontSize: 24 },
  modalNextLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  modalNextDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  modalDismiss: { padding: 10 },
  modalDismissText: { fontSize: 13, color: COLORS.textMuted },
  // All done screen
  allDoneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  allDoneEmoji: { fontSize: 72 },
  allDoneTitle: { fontSize: 26, fontWeight: '900', color: COLORS.text },
  allDoneSubtitle: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  goSingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: COLORS.primary, paddingVertical: 16, paddingHorizontal: 28, borderRadius: BORDER_RADIUS.lg, width: '100%' },
  goSingBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  goSongsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E1E3A', paddingVertical: 13, paddingHorizontal: 24, borderRadius: BORDER_RADIUS.lg, width: '100%', borderWidth: 1, borderColor: COLORS.primary + '55' },
  goSongsBtnText: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '600' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  resetBtnText: { fontSize: 13, color: COLORS.textMuted },
});
