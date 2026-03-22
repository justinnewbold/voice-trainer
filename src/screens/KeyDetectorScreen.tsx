import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { detectKey, createChromaAccumulator, isNoteInKey, getScaleDegrees, KeyResult } from '../utils/keyDetection';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const DISPLAY_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const KEY_COLORS: Record<string, string> = {
  major: '#7c6af7',
  minor: '#ec4899',
};

const MODE_GRADIENTS: Record<string, [string, string]> = {
  major: ['#2d1b69', '#1a0a2e'],
  minor: ['#4a0d2e', '#1a0a2e'],
};

export default function KeyDetectorScreen() {
  const [isListening, setIsListening] = useState(false);
  const [keyResult, setKeyResult] = useState<KeyResult | null>(null);
  const [currentNote, setCurrentNote] = useState<string>('-');
  const [confidence, setConfidence] = useState(0);
  const [noteHistory, setNoteHistory] = useState<string[]>([]);
  const accumulatorRef = useRef(createChromaAccumulator(0.985));
  const detectIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const confidenceAnim = useRef(new Animated.Value(0)).current;

  const { noteInfo, startListening, stopListening, volume, isListening: micActive } = usePitchDetection();

  // Feed detected notes into the chromagram accumulator
  useEffect(() => {
    if (!micActive) return;
    if (noteInfo.note !== '-' && noteInfo.midiNote > 0 && Math.abs(noteInfo.cents) < 35) {
      accumulatorRef.current.addNote(noteInfo.midiNote, noteInfo.confidence || 0.8);
      setCurrentNote(`${noteInfo.note}${noteInfo.octave}`);
      setNoteHistory(prev => {
        const next = [`${noteInfo.note}${noteInfo.octave}`, ...prev].slice(0, 16);
        return next;
      });
      // Pulse animation on note detection
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 80, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
    }
  }, [noteInfo.note, noteInfo.midiNote]);

  // Re-run key detection on an interval
  useEffect(() => {
    if (!micActive) return;
    detectIntervalRef.current = setInterval(() => {
      if (!accumulatorRef.current.hasEnoughData()) return;
      const chroma = accumulatorRef.current.getChroma();
      const result = detectKey(chroma);
      if (result) {
        setKeyResult(result);
        setConfidence(result.confidence);
        Animated.timing(confidenceAnim, {
          toValue: result.confidence / 100,
          duration: 400,
          useNativeDriver: false,
        }).start();
      }
    }, 500);
    return () => {
      if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
    };
  }, [micActive]);

  const handleStart = async () => {
    accumulatorRef.current.reset();
    setKeyResult(null);
    setCurrentNote('-');
    setNoteHistory([]);
    setConfidence(0);
    await startListening();
    setIsListening(true);
  };

  const handleStop = async () => {
    await stopListening();
    setIsListening(false);
    if (detectIntervalRef.current) clearInterval(detectIntervalRef.current);
  };

  const handleReset = () => {
    accumulatorRef.current.reset();
    setKeyResult(null);
    setCurrentNote('-');
    setNoteHistory([]);
    setConfidence(0);
  };

  const chroma = accumulatorRef.current.getChroma();
  const chromaMax = Math.max(...chroma, 0.001);
  const scaleDegrees = keyResult ? getScaleDegrees(keyResult) : [];
  const modeColor = keyResult ? KEY_COLORS[keyResult.mode] : COLORS.primary;
  const headerGradient = keyResult ? MODE_GRADIENTS[keyResult.mode] : ['#1a0a2e', '#0A0A1A'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={headerGradient} style={styles.header}>
        <Text style={styles.title}>🎹 Key Detector</Text>
        <Text style={styles.subtitle}>Sing or hum — I'll find your key</Text>
      </LinearGradient>

      {/* Main key display */}
      <LinearGradient colors={headerGradient} style={styles.keyCard}>
        <Animated.View style={[styles.keyCircle, { borderColor: modeColor, shadowColor: modeColor, transform: [{ scale: pulseAnim }] }]}>
          {keyResult ? (
            <>
              <Text style={[styles.keyRoot, { color: modeColor }]}>{keyResult.root}</Text>
              <Text style={[styles.keyMode, { color: modeColor + 'cc' }]}>{keyResult.mode}</Text>
            </>
          ) : (
            <Text style={styles.keyPlaceholder}>{isListening ? '🎤' : '🎹'}</Text>
          )}
        </Animated.View>

        {keyResult && (
          <View style={styles.keyMeta}>
            <Text style={styles.keyLabel}>{keyResult.label}</Text>
            <Text style={styles.relativeKey}>Relative: {keyResult.relativeKey}</Text>
          </View>
        )}

        {/* Confidence bar */}
        <View style={styles.confSection}>
          <View style={styles.confHeader}>
            <Text style={styles.confLabel}>Confidence</Text>
            <Text style={[styles.confValue, { color: modeColor }]}>{confidence}%</Text>
          </View>
          <View style={styles.confBar}>
            <Animated.View style={[styles.confFill, {
              backgroundColor: modeColor,
              width: confidenceAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]} />
          </View>
          <Text style={styles.confHint}>
            {confidence >= 70 ? '✓ Strong match' : confidence >= 40 ? '~ Building...' : isListening ? 'Keep singing...' : 'Tap Start to begin'}
          </Text>
        </View>
      </LinearGradient>

      {/* Currently detected note + volume */}
      {isListening && (
        <View style={styles.liveRow}>
          <View style={styles.liveNote}>
            <Text style={styles.liveNoteLabel}>Now Singing</Text>
            <Text style={[styles.liveNoteVal, { color: keyResult && currentNote !== '-' && isNoteInKey(currentNote, keyResult) ? COLORS.success : COLORS.warning }]}>
              {currentNote}
            </Text>
            {keyResult && currentNote !== '-' && (
              <Text style={styles.inKeyBadge}>
                {isNoteInKey(currentNote, keyResult) ? '✓ In key' : '↯ Out of key'}
              </Text>
            )}
          </View>
          <View style={styles.volumeMeter}>
            <Text style={styles.liveNoteLabel}>Volume</Text>
            <View style={styles.volBars}>
              {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold, i) => (
                <View key={i} style={[styles.volBar, { backgroundColor: volume >= threshold ? modeColor : '#2A2A50' }]} />
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.btnRow}>
        {!isListening ? (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: modeColor }]} onPress={handleStart}>
            <Ionicons name="mic" size={22} color="#fff" />
            <Text style={styles.startBtnText}>Start Listening</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Ionicons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh" size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Scale notes display */}
      {keyResult && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scale Notes</Text>
          <View style={styles.scaleRow}>
            {keyResult.scaleNotes.map((note, i) => (
              <View key={i} style={[styles.scaleNote, { borderColor: modeColor, backgroundColor: modeColor + '22' }]}>
                <Text style={[styles.scaleNoteText, { color: modeColor }]}>{note}</Text>
                <Text style={styles.scaleDegree}>{i + 1}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Scale degrees / chords */}
      {keyResult && scaleDegrees.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chords in this Key</Text>
          <View style={styles.chordGrid}>
            {scaleDegrees.map((deg, i) => (
              <View key={i} style={[styles.chordCard, { borderColor: i === 0 || (keyResult.mode === 'major' && (i === 3 || i === 4)) || (keyResult.mode === 'minor' && (i === 2 || i === 5)) ? modeColor + '88' : '#2A2A50' }]}>
                <Text style={[styles.chordRoman, { color: modeColor }]}>{deg.roman}</Text>
                <Text style={styles.chordNote}>{deg.note}</Text>
                <Text style={styles.chordQuality}>{deg.quality}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Chromagram visualizer */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chromagram</Text>
        <Text style={styles.sectionSub}>Energy per pitch class from your singing</Text>
        <View style={styles.chromaGrid}>
          {DISPLAY_NAMES.map((name, i) => {
            const height = chromaMax > 0 ? (chroma[i] / chromaMax) * 60 : 0;
            const isInKey = keyResult && keyResult.scaleNotes.includes(name);
            const isRoot = keyResult && keyResult.root === name;
            return (
              <View key={i} style={styles.chromaBin}>
                <View style={styles.chromaBarTrack}>
                  <View style={[styles.chromaBarFill, {
                    height: Math.max(2, height),
                    backgroundColor: isRoot ? '#fbbf24' : isInKey ? modeColor : '#3A3A60',
                  }]} />
                </View>
                <Text style={[styles.chromaLabel, isRoot && { color: '#fbbf24', fontWeight: '800' }, isInKey && !isRoot && { color: modeColor }]}>
                  {name}
                </Text>
              </View>
            );
          })}
        </View>
        {keyResult && (
          <View style={styles.chromaLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} /><Text style={styles.legendText}>Root</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: modeColor }]} /><Text style={styles.legendText}>In key</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3A3A60' }]} /><Text style={styles.legendText}>Out of key</Text></View>
          </View>
        )}
      </View>

      {/* Top key candidates */}
      {keyResult && keyResult.allScores.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Possibilities</Text>
          {keyResult.allScores.slice(1).map((s, i) => (
            <View key={i} style={styles.candidateRow}>
              <Text style={styles.candidateName}>{s.key}</Text>
              <View style={styles.candidateBar}>
                <View style={[styles.candidateFill, { width: `${Math.max(0, s.score)}%`, backgroundColor: COLORS.textMuted }]} />
              </View>
              <Text style={styles.candidateScore}>{s.score}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Note history */}
      {noteHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Notes</Text>
          <View style={styles.historyRow}>
            {noteHistory.map((n, i) => {
              const bare = n.replace(/\d/g, '');
              const inKey = keyResult ? isNoteInKey(n, keyResult) : true;
              return (
                <View key={i} style={[styles.historyNote, { backgroundColor: inKey ? modeColor + '33' : '#2A2A50', opacity: 1 - i * 0.05 }]}>
                  <Text style={[styles.historyNoteText, { color: inKey ? modeColor : COLORS.textMuted }]}>{bare}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: SPACING.lg },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  keyCard: { margin: 16, borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  keyCircle: { width: 130, height: 130, borderRadius: 65, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, backgroundColor: '#0A0A1A' },
  keyRoot: { fontSize: 48, fontWeight: '900', lineHeight: 54 },
  keyMode: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  keyPlaceholder: { fontSize: 40 },
  keyMeta: { alignItems: 'center', marginBottom: 16 },
  keyLabel: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  relativeKey: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  confSection: { width: '100%' },
  confHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  confLabel: { fontSize: 13, color: COLORS.textMuted },
  confValue: { fontSize: 13, fontWeight: '700' },
  confBar: { height: 8, backgroundColor: '#2A2A50', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  confFill: { height: '100%', borderRadius: 4 },
  confHint: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  liveRow: { flexDirection: 'row', margin: 16, marginTop: 0, gap: 12 },
  liveNote: { flex: 1, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  liveNoteLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  liveNoteVal: { fontSize: 32, fontWeight: '800' },
  inKeyBadge: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  volumeMeter: { flex: 1, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  volBars: { flexDirection: 'row', gap: 5, marginTop: 8 },
  volBar: { width: 14, height: 30, borderRadius: 3 },
  btnRow: { flexDirection: 'row', margin: 16, marginTop: 0, gap: 10 },
  startBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BORDER_RADIUS.lg },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stopBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.danger },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetBtn: { width: 52, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#2A2A50' },
  section: { margin: 16, marginTop: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },
  scaleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scaleNote: { width: 44, height: 52, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scaleNoteText: { fontSize: 14, fontWeight: '800' },
  scaleDegree: { fontSize: 10, color: COLORS.textMuted },
  chordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chordCard: { width: '30%', flex: undefined, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 10, alignItems: 'center', borderWidth: 1.5 },
  chordRoman: { fontSize: 16, fontWeight: '800' },
  chordNote: { fontSize: 13, color: COLORS.text, fontWeight: '600' },
  chordQuality: { fontSize: 10, color: COLORS.textMuted },
  chromaGrid: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 0 },
  chromaBin: { flex: 1, alignItems: 'center' },
  chromaBarTrack: { width: '70%', height: 64, justifyContent: 'flex-end', backgroundColor: '#1E1E3A', borderRadius: 3 },
  chromaBarFill: { width: '100%', borderRadius: 3, minHeight: 2 },
  chromaLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 3 },
  chromaLegend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: COLORS.textMuted },
  candidateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#2A2A50' },
  candidateName: { width: 90, fontSize: 13, color: COLORS.textSecondary },
  candidateBar: { flex: 1, height: 5, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden' },
  candidateFill: { height: '100%', borderRadius: 3 },
  candidateScore: { width: 32, fontSize: 11, color: COLORS.textMuted, textAlign: 'right' },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  historyNote: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  historyNoteText: { fontSize: 12, fontWeight: '700' },
});
