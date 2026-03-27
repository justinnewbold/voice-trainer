import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line, Circle, Ellipse, Path, Rect, Text as SvgText, G } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, SPACING, FONTS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useReferenceTone } from '../hooks/useReferenceTone';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useHaptics } from '../hooks/useHaptics';
import { useKeepAwake } from '../hooks/useKeepAwake';
import Confetti from '../components/Confetti';

// ── Music theory constants ────────────────────────────────────────────────────

// Treble clef staff positions for MIDI notes (C4=60)
// Staff lines from bottom: E4, G4, B4, D5, F5
// Each step = one staff position (line or space)
// staffPos 0 = middle C (C4), ledger below staff

function midiToStaffPos(midi: number): number {
  // Treble clef: B3=0 is just below the staff, each semitone maps to diatonic step
  const noteInOctave = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]; // C D E F G A B
  const octave = Math.floor(midi / 12) - 1;
  const semitone = midi % 12;
  return octave * 7 + noteInOctave[semitone] - 32; // -32 anchors C4 to position 0
}

function isBlackKey(midi: number): boolean {
  return [1, 3, 6, 8, 10].includes(midi % 12);
}

function noteNameFromMidi(midi: number): string {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return names[midi % 12] + octave;
}

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Staff Y position: staffPos 0 = C4, each position = STAFF_STEP px
const STAFF_W = 280;
const STAFF_H = 140;
const STAFF_TOP = 20;
const STAFF_STEP = 9; // pixels per staff position
// Treble staff: bottom line = E4 (staffPos 4), lines at pos 4,6,8,10,12
const BOTTOM_LINE_Y = STAFF_TOP + STAFF_H - 20;

function staffY(pos: number): number {
  // pos 4 = E4 = bottom line
  return BOTTOM_LINE_Y - (pos - 4) * STAFF_STEP;
}

// Sharps/flats accidental rendering
function accidental(midi: number): string | null {
  if ([1, 3, 6, 8, 10].includes(midi % 12)) return '♯';
  return null;
}

// ── Note categories ───────────────────────────────────────────────────────────

const TREBLE_NOTES_BEGINNER   = [60, 62, 64, 65, 67]; // C4–G4
const TREBLE_NOTES_INTER      = [60, 62, 64, 65, 67, 69, 71, 72]; // C4–C5
const TREBLE_NOTES_ADVANCED   = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76]; // A3–E5

const DIFFICULTY_POOL = {
  beginner:     TREBLE_NOTES_BEGINNER,
  intermediate: TREBLE_NOTES_INTER,
  advanced:     TREBLE_NOTES_ADVANCED,
};

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// ── Staff SVG component ───────────────────────────────────────────────────────

function MusicStaff({ targetMidi, sungMidi, phase }: { targetMidi: number; sungMidi: number | null; phase: 'ready' | 'listening' | 'result' }) {
  const pos = midiToStaffPos(targetMidi);
  const noteY = staffY(pos);
  const noteX = STAFF_W * 0.6;
  const acc = accidental(targetMidi);

  // Ledger lines (C4 needs one below, high notes need extra)
  const ledgerLines: number[] = [];
  if (pos <= 2) { for (let lp = 2; lp >= pos - (pos % 2); lp -= 2) ledgerLines.push(lp); }
  if (pos >= 14) { for (let lp = 14; lp <= pos + (pos % 2 === 0 ? 0 : 1); lp += 2) ledgerLines.push(lp); }

  const noteColor = phase === 'result'
    ? (sungMidi !== null && Math.abs(sungMidi - targetMidi) <= 1 ? '#10b981' : '#ef4444')
    : phase === 'listening' ? '#7c6af7' : '#F1F5F9';

  return (
    <Svg width={STAFF_W} height={STAFF_H + 40}>
      {/* Staff lines (5 lines) */}
      {[4, 6, 8, 10, 12].map(lp => (
        <Line key={lp} x1={20} y1={staffY(lp)} x2={STAFF_W - 20} y2={staffY(lp)} stroke="#2A2A50" strokeWidth={1.5} />
      ))}

      {/* Treble clef (simplified as text glyph) */}
      <SvgText x={28} y={staffY(8) + 22} fontSize={52} fill="#475569" fontFamily="serif">𝄞</SvgText>

      {/* Ledger lines */}
      {ledgerLines.map(lp => (
        <Line key={lp} x1={noteX - 14} y1={staffY(lp)} x2={noteX + 14} y2={staffY(lp)} stroke={noteColor + '88'} strokeWidth={1.5} />
      ))}

      {/* Accidental */}
      {acc && (
        <SvgText x={noteX - 18} y={noteY + 5} fontSize={14} fill={noteColor} textAnchor="middle">{acc}</SvgText>
      )}

      {/* Target note (filled ellipse) */}
      <Ellipse cx={noteX} cy={noteY} rx={9} ry={7} fill={noteColor} opacity={0.9} />

      {/* Note stem */}
      {pos < 8
        ? <Line x1={noteX + 9} y1={noteY} x2={noteX + 9} y2={noteY - 35} stroke={noteColor} strokeWidth={1.5} />
        : <Line x1={noteX - 9} y1={noteY} x2={noteX - 9} y2={noteY + 35} stroke={noteColor} strokeWidth={1.5} />
      }

      {/* Sung note indicator */}
      {phase === 'result' && sungMidi !== null && (
        <>
          <Ellipse
            cx={noteX + 30}
            cy={staffY(midiToStaffPos(sungMidi))}
            rx={9} ry={7}
            fill="none"
            stroke={Math.abs(sungMidi - targetMidi) <= 1 ? '#10b981' : '#ef4444'}
            strokeWidth={2}
            opacity={0.8}
          />
          <SvgText x={noteX + 30} y={staffY(midiToStaffPos(sungMidi)) + 18} fontSize={9} fill="#475569" textAnchor="middle">sung</SvgText>
        </>
      )}

      {/* Note label below staff */}
      <SvgText x={noteX} y={STAFF_H + 32} fontSize={12} fill={noteColor} textAnchor="middle" fontWeight="700">
        {noteNameFromMidi(targetMidi)}
      </SvgText>
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function SightSingingScreen() {
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const totalRounds = 8;
  const [targetMidi, setTargetMidi] = useState<number>(60);
  const [phase, setPhase] = useState<'ready' | 'listening' | 'result'>('ready');
  const [sungMidi, setSungMidi] = useState<number | null>(null);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<{ midi: number; sungMidi: number | null; correct: boolean }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bestSungRef = useRef<number | null>(null);

  const { noteInfo, startListening, stopListening } = usePitchDetection();
  const { playTone } = useReferenceTone();
  const { playNoteHit, playMiss, playFanfare, playComplete } = useSoundEffects();
  const { hitNote, miss: hapticMiss, completeFanfare } = useHaptics();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  function pickNote(): number {
    const pool = DIFFICULTY_POOL[difficulty];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ── Start session ──
  const handleStart = async () => {
    setStarted(true);
    setRound(1);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setShowConfetti(false);
    const midi = pickNote();
    setTargetMidi(midi);
    setPhase('ready');
    setSungMidi(null);
    setCorrect(null);
    bestSungRef.current = null;
    await playTone(midiToFreq(midi), 800, 0.35);
  };

  // ── Hear the note ──
  const handleHearNote = async () => {
    await playTone(midiToFreq(targetMidi), 700, 0.35);
  };

  // ── Start singing ──
  const handleStartSinging = async () => {
    setPhase('listening');
    setSungMidi(null);
    bestSungRef.current = null;
    await startListening();
    listenTimerRef.current = setTimeout(async () => {
      await stopListening();
      setPhase('result');
    }, 4000);
  };

  // Track best detected note while singing
  useEffect(() => {
    if (phase !== 'listening' || noteInfo.note === '-' || noteInfo.midiNote <= 0) return;
    // Keep the reading closest to target
    if (
      bestSungRef.current === null ||
      Math.abs(noteInfo.midiNote - targetMidi) < Math.abs(bestSungRef.current - targetMidi)
    ) {
      bestSungRef.current = Math.round(noteInfo.midiNote);
      setSungMidi(Math.round(noteInfo.midiNote));
    }
  }, [noteInfo.midiNote, phase, targetMidi]);

  // When phase becomes 'result', evaluate
  useEffect(() => {
    if (phase !== 'result') return;
    const sung = bestSungRef.current;
    const isCorrect = sung !== null && Math.abs(sung - targetMidi) <= 1;
    setCorrect(isCorrect);

    if (isCorrect) {
      playNoteHit(); hitNote();
      setScore(s => s + 10 + streak * 2);
      setStreak(s => s + 1);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
        Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
      ]).start();
    } else {
      playMiss(); hapticMiss();
      setStreak(0);
    }
    setHistory(h => [...h, { midi: targetMidi, sungMidi: sung, correct: isCorrect }]);
  }, [phase]);

  // ── Next round ──
  const handleNext = async () => {
    if (round >= totalRounds) {
      const correct = history.filter(h => h.correct).length + (phase === 'result' && bestSungRef.current !== null && Math.abs(bestSungRef.current - targetMidi) <= 1 ? 1 : 0);
      const pct = Math.round((correct / totalRounds) * 100);
      if (pct >= 80) { playFanfare(); completeFanfare(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500); }
      else playComplete();
      setStarted(false);
      return;
    }
    const nextRound = round + 1;
    setRound(nextRound);
    const midi = pickNote();
    setTargetMidi(midi);
    setPhase('ready');
    setSungMidi(null);
    setCorrect(null);
    bestSungRef.current = null;
    await playTone(midiToFreq(midi), 800, 0.35);
  };

  useEffect(() => () => { if (listenTimerRef.current) clearTimeout(listenTimerRef.current); }, []);

  // ── Session complete ──
  if (!started && history.length > 0) {
    const correctCount = history.filter(h => h.correct).length;
    const pct = Math.round((correctCount / totalRounds) * 100);
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>👁 Sight Singing</Text>
          <Text style={styles.subtitle}>Session Complete!</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
          <View style={styles.resultCard}>
            <Text style={styles.resultPct}>{pct}%</Text>
            <Text style={styles.resultLabel}>{correctCount} / {totalRounds} correct</Text>
            <Text style={styles.resultScore}>Score: {score} pts · Streak: {streak}🔥</Text>
          </View>
          <View style={styles.historyGrid}>
            {history.map((h, i) => (
              <View key={i} style={[styles.historyNote, { borderColor: h.correct ? COLORS.success + '66' : '#ef444466', backgroundColor: h.correct ? '#10b98111' : '#ef444411' }]}>
                <Text style={[styles.historyNoteText, { color: h.correct ? COLORS.success : '#ef4444' }]}>{noteNameFromMidi(h.midi)}</Text>
                <Text style={{ fontSize: 11 }}>{h.correct ? '✓' : '✗'}</Text>
                {!h.correct && h.sungMidi && <Text style={styles.historyWrong}>sang {noteNameFromMidi(h.sungMidi)}</Text>}
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => setHistory([])}>
            <Text style={styles.backText}>← Back to setup</Text>
          </TouchableOpacity>
        </ScrollView>
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Active session ──
  if (started) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <View style={styles.sessionHeader}>
            <Text style={styles.title}>👁 Sight Singing</Text>
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{round}/{totalRounds}</Text>
              <Text style={styles.stat}>🔥{streak}</Text>
              <Text style={styles.stat}>⭐{score}</Text>
            </View>
          </View>
          <View style={styles.roundBar}>
            <View style={[styles.roundFill, { width: `${((round - 1) / totalRounds) * 100}%` }]} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.sessionContent}>
          <Text style={styles.instruction}>
            {phase === 'ready' ? 'Look at the note, then sing it!' : phase === 'listening' ? '🎤 Sing the note!' : correct ? '🎯 Correct!' : '😅 Not quite'}
          </Text>

          {/* Staff */}
          <Animated.View style={[styles.staffWrap, { transform: [{ scale: pulseAnim }] }]}>
            <MusicStaff targetMidi={targetMidi} sungMidi={sungMidi} phase={phase} />
          </Animated.View>

          {/* Result feedback */}
          {phase === 'result' && (
            <View style={[styles.resultFeedback, { borderColor: correct ? COLORS.success : '#ef4444' }]}>
              <Text style={styles.resultFeedbackEmoji}>{correct ? '✅' : '❌'}</Text>
              <View>
                <Text style={[styles.resultFeedbackTitle, { color: correct ? COLORS.success : '#ef4444' }]}>
                  {correct ? 'Nice!' : 'Target was ' + noteNameFromMidi(targetMidi)}
                </Text>
                {!correct && sungMidi && (
                  <Text style={styles.resultFeedbackSub}>You sang {noteNameFromMidi(sungMidi)}</Text>
                )}
                {!correct && !sungMidi && (
                  <Text style={styles.resultFeedbackSub}>No pitch detected — try again!</Text>
                )}
              </View>
            </View>
          )}

          {/* Listening indicator */}
          {phase === 'listening' && (
            <View style={styles.listeningIndicator}>
              <View style={styles.micPulse}>
                <Ionicons name="mic" size={24} color={COLORS.success} />
              </View>
              {noteInfo.note !== '-' && (
                <Text style={styles.detectedNote}>Hearing: {noteInfo.note}{noteInfo.octave}</Text>
              )}
              <Text style={styles.listeningHint}>Sing clearly and hold the note steady</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionRow}>
            {phase === 'ready' && (
              <>
                <TouchableOpacity style={styles.hearBtn} onPress={handleHearNote}>
                  <Ionicons name="volume-medium-outline" size={20} color={COLORS.primaryLight} />
                  <Text style={styles.hearBtnText}>Hear Note</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.singBtn} onPress={handleStartSinging}>
                  <Ionicons name="mic" size={20} color="#fff" />
                  <Text style={styles.singBtnText}>I'm Ready to Sing</Text>
                </TouchableOpacity>
              </>
            )}
            {phase === 'result' && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>{round >= totalRounds ? '🏁 See Results' : 'Next Note →'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Setup screen ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>👁 Sight Singing</Text>
        <Text style={styles.subtitle}>Read a note on the staff and sing it</Text>
      </LinearGradient>

      {/* How it works */}
      <View style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>How it works</Text>
        {[
          ['👁', 'A note appears on the treble clef staff'],
          ['🔊', 'Tap "Hear Note" to listen first (optional)'],
          ['🎤', 'Tap "I\'m Ready" and sing the note'],
          ['🎯', 'Hold it steady — we detect your pitch'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.howRow}>
            <Text style={styles.howIcon}>{icon}</Text>
            <Text style={styles.howText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* Difficulty */}
      <View style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>Difficulty</Text>
        {([
          ['beginner', 'C4–G4', '5 notes — great starting point'],
          ['intermediate', 'C4–C5', '8 notes — full octave'],
          ['advanced', 'A3–E5', '12 notes — wide range'],
        ] as [Difficulty, string, string][]).map(([d, range, desc]) => (
          <TouchableOpacity key={d} style={[styles.diffCard, difficulty === d && styles.diffCardActive]} onPress={() => setDifficulty(d)}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.diffName, difficulty === d && styles.diffNameActive]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
              <Text style={styles.diffRange}>{range} · {desc}</Text>
            </View>
            {difficulty === d && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Staff preview */}
      <View style={styles.setupCard}>
        <Text style={styles.setupCardTitle}>Staff Preview</Text>
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <MusicStaff targetMidi={60} sungMidi={null} phase="ready" />
        </View>
        <Text style={styles.staffHint}>Middle C (C4) shown above — one ledger line below the staff</Text>
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Ionicons name="play" size={22} color="#fff" />
        <Text style={styles.startBtnText}>Start Session</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: SPACING.lg },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  roundBar: { height: 4, backgroundColor: '#2A2A50', borderRadius: 2, overflow: 'hidden' },
  roundFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  sessionContent: { padding: 16, gap: 16, paddingBottom: 40, alignItems: 'center' },
  instruction: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600', textAlign: 'center' },
  staffWrap: { backgroundColor: '#0d0d20', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2A2A50', width: '100%', alignItems: 'center' },
  resultFeedback: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1.5, width: '100%' },
  resultFeedbackEmoji: { fontSize: 28 },
  resultFeedbackTitle: { fontSize: 16, fontWeight: '700' },
  resultFeedbackSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  listeningIndicator: { alignItems: 'center', gap: 8 },
  micPulse: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.success + '22', alignItems: 'center', justifyContent: 'center' },
  detectedNote: { fontSize: 20, fontWeight: '800', color: COLORS.success },
  listeningHint: { fontSize: 12, color: COLORS.textMuted },
  actionRow: { flexDirection: 'column', gap: 10, width: '100%' },
  hearBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E1E3A', padding: 14, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary + '55' },
  hearBtnText: { color: COLORS.primaryLight, fontSize: 15, fontWeight: '600' },
  singBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, padding: 16, borderRadius: BORDER_RADIUS.lg },
  singBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  nextBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  resultPct: { fontSize: 52, fontWeight: '900', color: COLORS.primaryLight },
  resultLabel: { fontSize: 15, color: COLORS.textSecondary },
  resultScore: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyNote: { minWidth: 64, borderRadius: 10, borderWidth: 1.5, padding: 8, alignItems: 'center', gap: 2 },
  historyNoteText: { fontSize: 13, fontWeight: '800' },
  historyWrong: { fontSize: 9, color: COLORS.textMuted },
  setupCard: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  setupCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  howIcon: { fontSize: 20, width: 28 },
  howText: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  diffCard: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#2A2A50', marginBottom: 8 },
  diffCardActive: { borderColor: COLORS.primary },
  diffName: { fontSize: 15, fontWeight: '700', color: COLORS.textMuted },
  diffNameActive: { color: COLORS.text },
  diffRange: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  staffHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center', marginTop: 8 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, padding: 18, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtnFull: { padding: 14, alignItems: 'center' },
  backText: { color: COLORS.textSecondary, fontSize: 14 },
});
