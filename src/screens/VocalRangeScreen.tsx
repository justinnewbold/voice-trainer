import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { freqToNoteName, classifyVoiceType, ALL_NOTES } from '../utils/pitchUtils';
import { saveVocalRange } from '../utils/storage';

type Step = 'intro' | 'low' | 'high' | 'result';

export default function VocalRangeScreen({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState<Step>('intro');
  const [lowNote, setLowNote] = useState<{ name: string; freq: number } | null>(null);
  const [highNote, setHighNote] = useState<{ name: string; freq: number } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [detectedNote, setDetectedNote] = useState<{ name: string; freq: number } | null>(null);
  const { frequency, isListening, volume, startListening, stopListening } = usePitchDetection();

  useEffect(() => {
    if (isListening && frequency > 0) {
      const note = freqToNoteName(frequency);
      if (note) setDetectedNote(note);
    }
  }, [frequency, isListening]);

  const handleStart = useCallback(async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) { await new Promise(r => setTimeout(r, 1000)); setCountdown(i - 1); }
    await startListening();
  }, [startListening]);

  const lockNote = useCallback(() => {
    if (!detectedNote) return;
    if (step === 'low') {
      setLowNote(detectedNote);
      stopListening();
      setDetectedNote(null);
      setStep('high');
    } else if (step === 'high') {
      setHighNote(detectedNote);
      stopListening();
      setDetectedNote(null);
      setStep('result');
    }
  }, [detectedNote, step, stopListening]);

  // Save results
  useEffect(() => {
    if (step === 'result' && lowNote && highNote) {
      const vt = classifyVoiceType(lowNote.name, highNote.name);
      const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote.name);
      const highIdx = ALL_NOTES.findIndex(n => n.name === highNote.name);
      saveVocalRange({
        lowNote: lowNote.name, highNote: highNote.name,
        voiceType: vt?.id || 'unknown', semitones: highIdx - lowIdx, testedAt: Date.now(),
      });
    }
  }, [step, lowNote, highNote]);

  if (step === 'intro') return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <Text style={{ fontSize: 72 }}>🎯</Text>
        <Text style={styles.heading}>Vocal Range Test</Text>
        <Text style={styles.desc}>Find your lowest and highest notes in about 2 minutes. All exercises get personalized to your voice.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('low')}>
          <Text style={styles.primaryBtnText}>Start Range Test →</Text>
        </TouchableOpacity>
        {onComplete && (
          <TouchableOpacity onPress={onComplete} style={{ marginTop: 12 }}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (step === 'low' || step === 'high') {
    const isLow = step === 'low';
    return (
      <View style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.stepLabel}>Step {isLow ? 1 : 2} of 2</Text>
          <Text style={styles.heading}>Find Your {isLow ? 'Lowest' : 'Highest'} Note</Text>
          <Text style={styles.desc}>Sing as {isLow ? 'low' : 'high'} as you comfortably can</Text>

          <View style={[styles.noteCircle, detectedNote && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' }]}>
            {countdown > 0 ? (
              <Text style={styles.countdownText}>{countdown}</Text>
            ) : isListening && detectedNote ? (
              <>
                <Text style={styles.detectedNote}>{detectedNote.name.replace(/\d/, '')}</Text>
                <Text style={styles.detectedOctave}>{detectedNote.name.match(/\d+/)?.[0]}</Text>
                <Text style={styles.detectedFreq}>{Math.round(detectedNote.freq)}Hz</Text>
              </>
            ) : isListening ? (
              <Text style={styles.listeningText}>Listening…</Text>
            ) : (
              <Text style={{ fontSize: 36 }}>{isLow ? '⬇️' : '⬆️'}</Text>
            )}
          </View>

          {isListening && (
            <View style={styles.volumeBar}>
              <View style={[styles.volumeFill, { width: `${Math.min(100, volume * 100)}%` }]} />
            </View>
          )}

          <View style={styles.btnRow}>
            {!isListening && countdown === 0 ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
                <Text style={styles.primaryBtnText}>🎤 Start Singing</Text>
              </TouchableOpacity>
            ) : isListening ? (
              <>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => { stopListening(); setDetectedNote(null); }}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: COLORS.success, opacity: detectedNote ? 1 : 0.4 }]}
                  onPress={lockNote} disabled={!detectedNote}>
                  <Text style={styles.primaryBtnText}>✓ Lock {detectedNote?.name || 'Note'}</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // Result
  const vt = lowNote && highNote ? classifyVoiceType(lowNote.name, highNote.name) : null;
  const lowIdx = ALL_NOTES.findIndex(n => n.name === lowNote?.name);
  const highIdx = ALL_NOTES.findIndex(n => n.name === highNote?.name);
  const semitones = highIdx - lowIdx;

  return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <Text style={{ fontSize: 64 }}>🎉</Text>
        <Text style={styles.heading}>Your Vocal Range</Text>

        <View style={styles.rangeCard}>
          <View style={styles.rangeRow}>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.rangeNote, { color: '#3b82f6' }]}>{lowNote?.name}</Text>
              <Text style={styles.rangeLabel}>LOWEST</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 16 }}>
              <View style={styles.rangeBar} />
              <Text style={styles.rangeInfo}>{semitones} semitones · {(semitones / 12).toFixed(1)} octaves</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.rangeNote, { color: '#ef4444' }]}>{highNote?.name}</Text>
              <Text style={styles.rangeLabel}>HIGHEST</Text>
            </View>
          </View>
        </View>

        {vt && (
          <View style={[styles.voiceTypeCard, { backgroundColor: vt.color + '22', borderColor: vt.color + '55' }]}>
            <Text style={[styles.voiceTypeLabel, { color: vt.color }]}>YOUR VOICE TYPE</Text>
            <Text style={[styles.voiceTypeName, { color: vt.color }]}>{vt.label}</Text>
            <Text style={styles.voiceTypeRange}>Typical: {vt.range}</Text>
          </View>
        )}

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setStep('intro'); setLowNote(null); setHighNote(null); }}>
            <Text style={styles.secondaryBtnText}>Retest</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={onComplete}>
            <Text style={styles.primaryBtnText}>Start Training →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.md },
  heading: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text, textAlign: 'center' },
  desc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  stepLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  noteCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.surface, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  countdownText: { fontSize: 48, fontWeight: '900', color: COLORS.primaryLight },
  detectedNote: { fontSize: 34, fontWeight: '900', color: '#fff' },
  detectedOctave: { fontSize: 14, color: COLORS.textMuted },
  detectedFreq: { fontSize: 11, color: COLORS.primaryLight, marginTop: 2 },
  listeningText: { fontSize: 13, color: COLORS.textMuted },
  volumeBar: { width: '80%', height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  volumeFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: SPACING.sm },
  primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 13, borderRadius: BORDER_RADIUS.lg },
  primaryBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  secondaryBtn: { borderWidth: 1, borderColor: COLORS.textMuted, paddingHorizontal: 20, paddingVertical: 13, borderRadius: BORDER_RADIUS.lg },
  secondaryBtnText: { color: COLORS.textMuted, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  skipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm },
  rangeCard: { backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, width: '100%' },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  rangeNote: { fontSize: 26, fontWeight: '900' },
  rangeLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rangeBar: { height: 4, borderRadius: 2, backgroundColor: COLORS.primary },
  rangeInfo: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginTop: 6 },
  voiceTypeCard: { borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, width: '100%', alignItems: 'center', borderWidth: 1 },
  voiceTypeLabel: { fontSize: 12, letterSpacing: 2, textTransform: 'uppercase' },
  voiceTypeName: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  voiceTypeRange: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
});
