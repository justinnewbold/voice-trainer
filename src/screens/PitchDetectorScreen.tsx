import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import WaveformDisplay from '../components/WaveformDisplay';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { maybePromptReview } from '../hooks/useStoreReview';
import { A11Y } from '../hooks/useAccessibility';
import { saveSession } from '../utils/storage';
import { buildSessionCelebrations } from '../utils/celebrationBuilder';
import { useCelebrate } from '../contexts/CelebrationContext';
import MetronomeBadge from '../components/MetronomeBadge';
import { useMetronome } from '../hooks/useMetronome';

export default function PitchDetectorScreen() {
  const celebrate = useCelebrate();
  const { frequency, noteInfo, pitchHint, color, isListening, volume, startListening, stopListening, error } = usePitchDetection();
  const metronome = useMetronome(80);
  const [sessionAccuracies, setSessionAccuracies] = useState<number[]>([]);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [onPitchCount, setOnPitchCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // 🔒 Keep screen awake during active pitch sessions
  useKeepAwake(isListening);

  useEffect(() => {
    if (isListening && pitchHint !== 'silent') {
      const isGood = pitchHint === 'on-pitch';
      const accuracy = isGood ? 100 : Math.abs(noteInfo.cents) < 25 ? 60 : 20;
      setSessionAccuracies(prev => [...prev.slice(-50), accuracy]);
      setTotalCount(prev => prev + 1);
      if (isGood) setOnPitchCount(prev => prev + 1);
    }
  }, [pitchHint, noteInfo.cents, isListening]);

  const handleToggle = async () => {
    if (isListening) {
      const duration = sessionStart ? Math.floor((Date.now() - sessionStart.getTime()) / 1000) : 0;
      const avgAcc = sessionAccuracies.length > 0 ? Math.round(sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length) : 0;
      if (duration > 5) {
        const result = await saveSession({
          id: Date.now().toString(), date: Date.now(), exerciseId: 'freeform', exerciseName: 'Free Practice',
          type: 'freeform', duration, accuracy: avgAcc, notesHit: onPitchCount, totalNotes: totalCount,
        });
        celebrate(buildSessionCelebrations({
          newAchievements: result.newAchievements,
          freezeEarned: result.freezeEarned,
          freezesConsumed: result.freezesConsumed,
          currentStreak: result.currentStreak,
          prevLevel: result.prevLevel,
          newLevel: result.level,
          weeklyJustCompleted: result.weeklyJustCompleted,
          weeklyChallengeTitle: result.weeklyChallengeTitle,
          // Free Practice never sets a "personal best" — it's the same exerciseId every time
          personalBest: false,
          session: { id: '', date: Date.now(), exerciseId: 'freeform', exerciseName: 'Free Practice', type: 'freeform', duration, accuracy: avgAcc },
        }));
        await maybePromptReview(avgAcc);
      }
      await stopListening();
      setSessionAccuracies([]); setSessionStart(null); setOnPitchCount(0); setTotalCount(0);
    } else {
      setSessionStart(new Date());
      await startListening();
    }
  };

  const avgAcc = sessionAccuracies.length > 0 ? Math.round(sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length) : 0;

  return (
    <View style={styles.container} accessibilityRole="main">
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Pitch Detector</Text>
        <Text style={styles.subtitle}>{isListening ? 'Sing and match the pitch!' : 'Tap to start detecting'}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View {...A11Y.pitchMeter(noteInfo.note, noteInfo.cents, frequency)}>
          <PitchMeter
            note={noteInfo.note} octave={noteInfo.octave} cents={noteInfo.cents}
            frequency={frequency} pitchHint={pitchHint} color={color} volume={volume}
            isStable={false}
          />
        </View>

        <View {...A11Y.volumeLevel(volume)}>
          <WaveformDisplay volume={volume} color={color} isListening={isListening} />
        </View>

        {/* Metronome */}
        <MetronomeBadge
          isPlaying={metronome.isPlaying}
          bpm={metronome.bpm}
          currentBeat={metronome.currentBeat}
          beatsPerMeasure={metronome.beatsPerMeasure}
          onToggle={metronome.toggle}
          onSetBpm={metronome.setBpm}
          onSetBeats={metronome.setBeatsPerMeasure}
        />

        {/* Session stats */}
        {isListening && totalCount > 0 && (
          <View style={styles.sessionStats} accessibilityRole="summary">
            <View style={styles.sessionStat} {...A11Y.statItem('Accuracy', `${avgAcc}%`)}>
              <Text style={styles.sessionValue}>{avgAcc}%</Text>
              <Text style={styles.sessionLabel}>Accuracy</Text>
            </View>
            <View style={styles.sessionStat} {...A11Y.statItem('On Pitch', `${onPitchCount} of ${totalCount}`)}>
              <Text style={styles.sessionValue}>{onPitchCount}/{totalCount}</Text>
              <Text style={styles.sessionLabel}>On Pitch</Text>
            </View>
          </View>
        )}

        {error && <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>}

        <TouchableOpacity
          style={[styles.button, isListening && styles.buttonStop]}
          onPress={handleToggle}
          activeOpacity={0.7}
          {...A11Y.startButton(isListening)}
        >
          <Ionicons name={isListening ? 'stop' : 'mic'} size={24} color="#fff" />
          <Text style={styles.buttonText}>{isListening ? 'Stop' : 'Start Listening'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 48 : 24, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, gap: SPACING.lg },
  sessionStats: { flexDirection: 'row', gap: SPACING.xl },
  sessionStat: { alignItems: 'center' },
  sessionValue: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
  sessionLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  errorText: { color: COLORS.danger, fontSize: FONTS.sizes.sm, textAlign: 'center' },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg },
  buttonStop: { backgroundColor: COLORS.danger },
  buttonText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#fff' },
});
