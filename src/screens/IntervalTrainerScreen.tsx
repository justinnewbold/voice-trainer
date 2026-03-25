import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useReferenceTone } from '../hooks/useReferenceTone';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { useHaptics } from '../hooks/useHaptics';
import Confetti from '../components/Confetti';

// ── Interval definitions ──────────────────────────────────────────────────────
const INTERVALS = [
  { semitones: 0,  name: 'Unison',          abbr: 'P1',  color: '#94a3b8', example: 'Same note' },
  { semitones: 1,  name: 'Minor 2nd',        abbr: 'm2',  color: '#ef4444', example: 'Jaws theme' },
  { semitones: 2,  name: 'Major 2nd',        abbr: 'M2',  color: '#f97316', example: 'Happy Birthday' },
  { semitones: 3,  name: 'Minor 3rd',        abbr: 'm3',  color: '#f59e0b', example: 'Smoke on the Water' },
  { semitones: 4,  name: 'Major 3rd',        abbr: 'M3',  color: '#eab308', example: 'When the Saints' },
  { semitones: 5,  name: 'Perfect 4th',      abbr: 'P4',  color: '#84cc16', example: 'Here Comes the Bride' },
  { semitones: 6,  name: 'Tritone',          abbr: 'TT',  color: '#10b981', example: 'The Simpsons' },
  { semitones: 7,  name: 'Perfect 5th',      abbr: 'P5',  color: '#06b6d4', example: 'Star Wars' },
  { semitones: 8,  name: 'Minor 6th',        abbr: 'm6',  color: '#3b82f6', example: 'The Entertainer' },
  { semitones: 9,  name: 'Major 6th',        abbr: 'M6',  color: '#6366f1', example: 'My Way' },
  { semitones: 10, name: 'Minor 7th',        abbr: 'm7',  color: '#8b5cf6', example: 'Somewhere' },
  { semitones: 11, name: 'Major 7th',        abbr: 'M7',  color: '#a855f7', example: 'Take On Me' },
  { semitones: 12, name: 'Octave',           abbr: 'P8',  color: '#ec4899', example: 'Somewhere Over the Rainbow' },
];

const MODES = [
  { id: 'listen', label: 'Listen & Identify', desc: 'Hear an interval, choose what it is' },
  { id: 'sing',   label: 'Sing the Interval', desc: 'See an interval, sing it back' },
];

const DIFFICULTY_SETS = {
  beginner:     [2, 4, 5, 7, 12],           // M2, M3, P4, P5, P8
  intermediate: [1, 2, 3, 4, 5, 7, 9, 12],  // adds m2, m3, M6
  advanced:     INTERVALS.map(i => i.semitones),
};

type Mode = 'listen' | 'sing';
type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROOT_MIDI = 60; // C4 — root note always C4 for consistency

function midiToFreq(midi: number) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function noteNameFromMidi(midi: number) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[((midi % 12) + 12) % 12] + Math.floor(midi / 12 - 1);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectIntervalFromCents(sungMidi: number, rootMidi: number): number {
  return Math.max(0, Math.min(12, Math.round(sungMidi - rootMidi)));
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function IntervalTrainerScreen() {
  const [mode, setMode] = useState<Mode>('listen');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  const [started, setStarted] = useState(false);

  // Session state
  const [round, setRound] = useState(0);
  const [totalRounds] = useState(10);
  const [currentInterval, setCurrentInterval] = useState<typeof INTERVALS[0] | null>(null);
  const [choices, setChoices] = useState<typeof INTERVALS[0][]>([]);
  const [answered, setAnswered] = useState<'correct' | 'wrong' | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<{ interval: number; correct: boolean }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Sing mode
  const [singingPhase, setSingingPhase] = useState<'listen' | 'sing' | 'result'>('listen');
  const [sungSemitones, setSungSemitones] = useState<number | null>(null);
  const listenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { noteInfo, startListening, stopListening, isListening } = usePitchDetection();
  const { playTone } = useReferenceTone();
  const { playNoteHit, playMiss, playFanfare, playComplete } = useSoundEffects();
  const { hitNote, miss: hapticMiss, completeFanfare } = useHaptics();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  const pulseCorrect = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
      Animated.spring(pulseAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  };

  // ── Generate a new question ──
  const generateQuestion = useCallback(() => {
    const pool = DIFFICULTY_SETS[difficulty];
    const semitones = pickRandom(pool);
    const interval = INTERVALS.find(i => i.semitones === semitones)!;
    setCurrentInterval(interval);
    setAnswered(null);
    setSelectedChoice(null);
    setSungSemitones(null);
    setSingingPhase('listen');

    // Build 4 choices (correct + 3 distractors)
    const distractorPool = DIFFICULTY_SETS[difficulty].filter(s => s !== semitones);
    const distractors: number[] = [];
    while (distractors.length < Math.min(3, distractorPool.length)) {
      const d = pickRandom(distractorPool);
      if (!distractors.includes(d)) distractors.push(d);
    }
    const choicesSemitones = [semitones, ...distractors].sort(() => Math.random() - 0.5);
    setChoices(choicesSemitones.map(s => INTERVALS.find(i => i.semitones === s)!));

    return interval;
  }, [difficulty]);

  // ── Play the interval sound ──
  const playInterval = useCallback(async (interval: typeof INTERVALS[0]) => {
    const rootFreq = midiToFreq(ROOT_MIDI);
    const upperFreq = midiToFreq(ROOT_MIDI + interval.semitones);
    await playTone(rootFreq, 600, 0.35);
    await new Promise(r => setTimeout(r, 650));
    await playTone(upperFreq, 600, 0.35);
  }, [playTone]);

  // ── Start session ──
  const handleStart = async () => {
    setStarted(true);
    setRound(1);
    setScore(0);
    setStreak(0);
    setHistory([]);
    setShowConfetti(false);
    const interval = generateQuestion();
    if (mode === 'listen') {
      await playInterval(interval);
    }
  };

  // ── Listen mode: user picks an answer ──
  const handleChoice = async (choice: typeof INTERVALS[0]) => {
    if (answered) return;
    const correct = choice.semitones === currentInterval!.semitones;
    setSelectedChoice(choice.semitones);
    setAnswered(correct ? 'correct' : 'wrong');

    if (correct) {
      playNoteHit();
      hitNote();
      pulseCorrect();
      setScore(s => s + (10 + streak * 2));
      setStreak(s => s + 1);
    } else {
      playMiss();
      hapticMiss();
      setStreak(0);
    }
    setHistory(h => [...h, { interval: currentInterval!.semitones, correct }]);
  };

  // ── Advance to next round ──
  const handleNext = async () => {
    if (round >= totalRounds) {
      // Session complete
      const finalScore = score + (answered === 'correct' ? 10 : 0);
      const correctCount = history.filter(h => h.correct).length + (answered === 'correct' ? 1 : 0);
      const pct = Math.round((correctCount / totalRounds) * 100);
      if (pct >= 80) { playFanfare(); completeFanfare(); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 2500); }
      else playComplete();
      setStarted(false);
      return;
    }
    const nextRound = round + 1;
    setRound(nextRound);
    const interval = generateQuestion();
    if (mode === 'listen') {
      await playInterval(interval);
    }
  };

  // ── Sing mode: play root, let user sing, auto-detect ──
  useEffect(() => {
    if (mode !== 'sing' || !started || !currentInterval || singingPhase !== 'listen') return;
    (async () => {
      await playTone(midiToFreq(ROOT_MIDI), 800, 0.35);
      await new Promise(r => setTimeout(r, 900));
      setSingingPhase('sing');
      await startListening();
      // Collect pitch for 3 seconds
      listenTimeoutRef.current = setTimeout(async () => {
        await stopListening();
        setSingingPhase('result');
      }, 3000);
    })();
    return () => { if (listenTimeoutRef.current) clearTimeout(listenTimeoutRef.current); };
  }, [singingPhase, currentInterval, started, mode]);

  // Detect interval while singing
  useEffect(() => {
    if (mode !== 'sing' || singingPhase !== 'sing' || noteInfo.note === '-') return;
    const detected = Math.round(noteInfo.midiNote - ROOT_MIDI);
    if (detected >= 0 && detected <= 13) setSungSemitones(detected);
  }, [noteInfo, singingPhase, mode]);

  useEffect(() => {
    if (mode !== 'sing' || singingPhase !== 'result' || sungSemitones === null) return;
    const correct = Math.abs(sungSemitones - currentInterval!.semitones) <= 1;
    setAnswered(correct ? 'correct' : 'wrong');
    if (correct) { playNoteHit(); pulseCorrect(); setScore(s => s + 10); setStreak(s => s + 1); }
    else { playMiss(); setStreak(0); }
    setHistory(h => [...h, { interval: currentInterval!.semitones, correct }]);
  }, [singingPhase]);

  // ── Session complete screen ──
  const correctCount = history.filter(h => h.correct).length;
  if (!started && history.length > 0) {
    const pct = Math.round((correctCount / totalRounds) * 100);
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>🎵 Interval Trainer</Text>
          <Text style={styles.subtitle}>Session Complete!</Text>
        </LinearGradient>
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <View style={styles.resultScore}>
            <Text style={styles.resultScoreVal}>{pct}%</Text>
            <Text style={styles.resultScoreLabel}>{correctCount} / {totalRounds} correct</Text>
            <Text style={styles.resultScorePoints}>Score: {score} pts</Text>
          </View>
          <View style={styles.historyGrid}>
            {history.map((h, i) => {
              const iv = INTERVALS.find(iv => iv.semitones === h.interval)!;
              return (
                <View key={i} style={[styles.historyItem, { borderColor: h.correct ? COLORS.success + '66' : '#ef444466', backgroundColor: h.correct ? '#10b98111' : '#ef444411' }]}>
                  <Text style={[styles.historyAbbr, { color: iv.color }]}>{iv.abbr}</Text>
                  <Text style={{ fontSize: 12 }}>{h.correct ? '✓' : '✗'}</Text>
                </View>
              );
            })}
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.startBtnText}>Play Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => setHistory([])}>
            <Text style={styles.backBtnText}>← Back to setup</Text>
          </TouchableOpacity>
        </ScrollView>
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Active session ──
  if (started && currentInterval) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <View style={styles.sessionHeader}>
            <Text style={styles.title}>🎵 Intervals</Text>
            <View style={styles.sessionStats}>
              <Text style={styles.sessionStat}>Round {round}/{totalRounds}</Text>
              <Text style={styles.sessionStat}>🔥 {streak}</Text>
              <Text style={styles.sessionStat}>⭐ {score}</Text>
            </View>
          </View>
          <View style={styles.roundBar}>
            <View style={[styles.roundFill, { width: `${((round - 1) / totalRounds) * 100}%` }]} />
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.sessionContent}>
          {mode === 'listen' ? (
            <>
              {/* Play button */}
              <TouchableOpacity style={styles.playIntervalBtn} onPress={() => playInterval(currentInterval)}>
                <Ionicons name="musical-notes" size={36} color={COLORS.primaryLight} />
                <Text style={styles.playIntervalText}>Tap to hear the interval again</Text>
              </TouchableOpacity>

              {/* Answer choices */}
              <Text style={styles.choicePrompt}>What interval is this?</Text>
              <View style={styles.choiceGrid}>
                {choices.map(choice => {
                  const isSelected = selectedChoice === choice.semitones;
                  const isCorrect = answered && choice.semitones === currentInterval.semitones;
                  const isWrong = answered && isSelected && !isCorrect;
                  return (
                    <TouchableOpacity
                      key={choice.semitones}
                      style={[
                        styles.choiceBtn,
                        { borderColor: choice.color + '55' },
                        isCorrect && styles.choiceBtnCorrect,
                        isWrong && styles.choiceBtnWrong,
                      ]}
                      onPress={() => handleChoice(choice)}
                      disabled={!!answered}
                    >
                      <Text style={[styles.choiceName, { color: choice.color }]}>{choice.name}</Text>
                      <Text style={styles.choiceAbbr}>{choice.abbr}</Text>
                      {isCorrect && <Text style={styles.choiceTick}>✓</Text>}
                      {isWrong && <Text style={styles.choiceCross}>✗</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {answered && (
                <Animated.View style={[styles.feedbackCard, { transform: [{ scale: pulseAnim }], borderColor: answered === 'correct' ? COLORS.success : '#ef4444' }]}>
                  <Text style={styles.feedbackEmoji}>{answered === 'correct' ? '🎯' : '😅'}</Text>
                  <View>
                    <Text style={[styles.feedbackTitle, { color: answered === 'correct' ? COLORS.success : '#ef4444' }]}>
                      {answered === 'correct' ? 'Correct!' : `That was a ${currentInterval.name}`}
                    </Text>
                    <Text style={styles.feedbackHint}>"{currentInterval.example}"</Text>
                  </View>
                </Animated.View>
              )}
            </>
          ) : (
            <>
              {/* Sing mode */}
              <View style={styles.singTarget}>
                <Text style={styles.singRoot}>Root: {noteNameFromMidi(ROOT_MIDI)}</Text>
                <Text style={styles.singInterval}>{currentInterval.name}</Text>
                <Text style={[styles.singAbbr, { color: currentInterval.color }]}>{currentInterval.abbr}</Text>
                <Text style={styles.singTarget2}>+{currentInterval.semitones} semitones above {noteNameFromMidi(ROOT_MIDI)}</Text>
                <Text style={styles.singExample}>"{currentInterval.example}"</Text>
              </View>

              {singingPhase === 'listen' && (
                <View style={styles.phaseIndicator}>
                  <Ionicons name="volume-high" size={28} color={COLORS.primaryLight} />
                  <Text style={styles.phaseText}>Listen to the root note…</Text>
                </View>
              )}
              {singingPhase === 'sing' && (
                <View style={styles.phaseIndicator}>
                  <View style={styles.micPulse}>
                    <Ionicons name="mic" size={28} color={COLORS.success} />
                  </View>
                  <Text style={[styles.phaseText, { color: COLORS.success }]}>Now sing the interval!</Text>
                  {noteInfo.note !== '-' && (
                    <Text style={styles.detectedNote}>Hearing: {noteInfo.note}{noteInfo.octave}</Text>
                  )}
                </View>
              )}
              {singingPhase === 'result' && answered && (
                <Animated.View style={[styles.feedbackCard, { transform: [{ scale: pulseAnim }], borderColor: answered === 'correct' ? COLORS.success : '#ef4444' }]}>
                  <Text style={styles.feedbackEmoji}>{answered === 'correct' ? '🎯' : '😅'}</Text>
                  <View>
                    <Text style={[styles.feedbackTitle, { color: answered === 'correct' ? COLORS.success : '#ef4444' }]}>
                      {answered === 'correct' ? 'Perfect!' : `You sang ${sungSemitones} semitones`}
                    </Text>
                    <Text style={styles.feedbackHint}>Target was {currentInterval.semitones} semitones</Text>
                  </View>
                </Animated.View>
              )}
            </>
          )}

          {answered && (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>{round >= totalRounds ? '🏁 See Results' : 'Next →'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        <Confetti trigger={showConfetti} />
      </View>
    );
  }

  // ── Setup screen ──
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>🎵 Interval Trainer</Text>
        <Text style={styles.subtitle}>Train your ear to recognize musical intervals</Text>
      </LinearGradient>

      {/* Mode picker */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Mode</Text>
        <View style={styles.modeRow}>
          {MODES.map(m => (
            <TouchableOpacity key={m.id} style={[styles.modeCard, mode === m.id && styles.modeCardActive]} onPress={() => setMode(m.id as Mode)}>
              <Text style={[styles.modeName, mode === m.id && styles.modeNameActive]}>{m.label}</Text>
              <Text style={styles.modeDesc}>{m.desc}</Text>
              {mode === m.id && <View style={styles.modeCheck}><Ionicons name="checkmark-circle" size={18} color={COLORS.primary} /></View>}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Difficulty picker */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Difficulty</Text>
        <View style={styles.diffRow}>
          {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
            <TouchableOpacity key={d} style={[styles.diffBtn, difficulty === d && styles.diffBtnActive]} onPress={() => setDifficulty(d)}>
              <Text style={[styles.diffText, difficulty === d && styles.diffTextActive]}>{d.charAt(0).toUpperCase() + d.slice(1)}</Text>
              <Text style={styles.diffCount}>{DIFFICULTY_SETS[d].length} intervals</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Intervals in this difficulty */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Intervals You'll Practice</Text>
        <View style={styles.intervalGrid}>
          {DIFFICULTY_SETS[difficulty].map(s => {
            const iv = INTERVALS.find(i => i.semitones === s)!;
            return (
              <View key={s} style={[styles.intervalChip, { borderColor: iv.color + '66', backgroundColor: iv.color + '11' }]}>
                <Text style={[styles.intervalChipAbbr, { color: iv.color }]}>{iv.abbr}</Text>
                <Text style={styles.intervalChipName}>{iv.name}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Reference card */}
      <View style={styles.setupSection}>
        <Text style={styles.setupLabel}>Quick Reference</Text>
        {INTERVALS.filter(iv => DIFFICULTY_SETS[difficulty].includes(iv.semitones)).map(iv => (
          <View key={iv.semitones} style={styles.refRow}>
            <View style={[styles.refAbbr, { backgroundColor: iv.color + '22' }]}>
              <Text style={[styles.refAbbrText, { color: iv.color }]}>{iv.abbr}</Text>
            </View>
            <Text style={styles.refName}>{iv.name}</Text>
            <Text style={styles.refExample}>"{iv.example}"</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
        <Ionicons name="play" size={22} color="#fff" />
        <Text style={styles.startBtnText}>Start Training</Text>
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
  sessionStats: { flexDirection: 'row', gap: 12 },
  sessionStat: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  roundBar: { height: 4, backgroundColor: '#2A2A50', borderRadius: 2, overflow: 'hidden' },
  roundFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  // Setup
  setupSection: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  setupLabel: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  modeRow: { gap: 10 },
  modeCard: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 14, borderWidth: 1.5, borderColor: '#2A2A50' },
  modeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  modeName: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 2 },
  modeNameActive: { color: COLORS.text },
  modeDesc: { fontSize: 12, color: COLORS.textMuted },
  modeCheck: { position: 'absolute', top: 12, right: 12 },
  diffRow: { flexDirection: 'row', gap: 8 },
  diffBtn: { flex: 1, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  diffBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '11' },
  diffText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  diffTextActive: { color: COLORS.primaryLight },
  diffCount: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  intervalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  intervalChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: BORDER_RADIUS.sm, borderWidth: 1 },
  intervalChipAbbr: { fontSize: 12, fontWeight: '800' },
  intervalChipName: { fontSize: 9, color: COLORS.textMuted },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: 1, borderTopColor: '#2A2A50' },
  refAbbr: { width: 36, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  refAbbrText: { fontSize: 11, fontWeight: '800' },
  refName: { width: 110, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  refExample: { flex: 1, fontSize: 11, color: COLORS.textMuted, fontStyle: 'italic' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, padding: 18, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  // Session
  sessionContent: { padding: 16, paddingBottom: 40, gap: 16 },
  playIntervalBtn: { backgroundColor: '#1a0a3e', borderRadius: BORDER_RADIUS.lg, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.primary + '55' },
  playIntervalText: { color: COLORS.textSecondary, fontSize: 14 },
  choicePrompt: { fontSize: 15, color: COLORS.textMuted, textAlign: 'center' },
  choiceGrid: { gap: 10 },
  choiceBtn: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5 },
  choiceBtnCorrect: { backgroundColor: '#10b98122', borderColor: COLORS.success },
  choiceBtnWrong: { backgroundColor: '#ef444422', borderColor: '#ef4444' },
  choiceName: { flex: 1, fontSize: 16, fontWeight: '700' },
  choiceAbbr: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  choiceTick: { fontSize: 16, color: COLORS.success },
  choiceCross: { fontSize: 16, color: '#ef4444' },
  feedbackCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1.5 },
  feedbackEmoji: { fontSize: 28 },
  feedbackTitle: { fontSize: 16, fontWeight: '700' },
  feedbackHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  nextBtn: { backgroundColor: COLORS.primary, padding: 16, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Sing mode
  singTarget: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50', gap: 4 },
  singRoot: { fontSize: 13, color: COLORS.textMuted },
  singInterval: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  singAbbr: { fontSize: 18, fontWeight: '800' },
  singTarget2: { fontSize: 13, color: COLORS.textSecondary },
  singExample: { fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' },
  phaseIndicator: { alignItems: 'center', gap: 8, padding: 20 },
  micPulse: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.success + '22', alignItems: 'center', justifyContent: 'center' },
  phaseText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  detectedNote: { fontSize: 14, color: COLORS.success, fontWeight: '700' },
  // Results
  resultsContent: { padding: 16, gap: 16, paddingBottom: 40 },
  resultScore: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  resultScoreVal: { fontSize: 56, fontWeight: '900', color: COLORS.primaryLight },
  resultScoreLabel: { fontSize: 16, color: COLORS.textSecondary, marginTop: 4 },
  resultScorePoints: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyItem: { width: 52, height: 52, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  historyAbbr: { fontSize: 12, fontWeight: '800' },
  backBtnFull: { padding: 14, alignItems: 'center' },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});

