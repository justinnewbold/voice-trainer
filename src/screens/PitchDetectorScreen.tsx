import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import PitchMeter from '../../src/components/PitchMeter';
import WaveformDisplay from '../../src/components/WaveformDisplay';
import { usePitchDetection } from '../../src/hooks/usePitchDetection';
import { saveSession } from '../../src/utils/storage';

export default function PitchDetectorScreen() {
  const {
    frequency,
    noteInfo,
    pitchHint,
    isListening,
    hasPermission,
    volume,
    startListening,
    stopListening,
  } = usePitchDetection();

  const [sessionAccuracies, setSessionAccuracies] = useState<number[]>([]);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [onPitchCount, setOnPitchCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (isListening && pitchHint !== 'silent') {
      const isGood = pitchHint === 'on-pitch';
      const accuracy = isGood ? 100 : Math.abs(noteInfo.cents) < 25 ? 60 : 20;

      setSessionAccuracies(prev => [...prev.slice(-50), accuracy]);
      setTotalCount(prev => prev + 1);
      if (isGood) {
        setOnPitchCount(prev => prev + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }, [pitchHint, noteInfo.cents]);

  const handleToggleListening = async () => {
    if (isListening) {
      await stopListening();

      // Save session if we had data
      if (sessionAccuracies.length > 0 && sessionStart) {
        const durationSeconds = Math.floor((Date.now() - sessionStart.getTime()) / 1000);
        const avgAccuracy = Math.round(
          sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length
        );

        await saveSession({
          id: Date.now().toString(),
          date: new Date().toISOString(),
          exerciseId: 'freeform',
          exerciseName: 'Free Pitch Training',
          type: 'freeform',
          durationSeconds,
          avgAccuracy,
          notesHit: onPitchCount,
          totalNotes: totalCount,
          streak: 0,
        });

        Alert.alert(
          '🎤 Session Complete!',
          `Duration: ${durationSeconds}s\nAvg Accuracy: ${avgAccuracy}%\nOn Pitch: ${onPitchCount}/${totalCount}`,
          [{ text: 'Great!' }]
        );
      }

      setSessionAccuracies([]);
      setOnPitchCount(0);
      setTotalCount(0);
      setSessionStart(null);
    } else {
      setSessionStart(new Date());
      await startListening();
    }
  };

  const avgAccuracy =
    sessionAccuracies.length > 0
      ? Math.round(sessionAccuracies.reduce((a, b) => a + b, 0) / sessionAccuracies.length)
      : 0;

  const getMeterColor = () => {
    switch (pitchHint) {
      case 'on-pitch': return COLORS.success;
      case 'too-low': return COLORS.accent;
      case 'too-high': return COLORS.danger;
      default: return COLORS.primary;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1A0A35', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title}>🎤 Pitch Trainer</Text>
        <Text style={styles.subtitle}>Sing anything — I'll tell you if you're in pitch!</Text>
      </LinearGradient>

      {/* Waveform */}
      <View style={styles.waveformContainer}>
        <WaveformDisplay
          volume={volume}
          isActive={isListening}
          color={getMeterColor()}
        />
      </View>

      {/* Main Pitch Meter */}
      <View style={styles.meterCard}>
        <PitchMeter
          cents={noteInfo.cents}
          pitchHint={pitchHint}
          note={noteInfo.note}
          octave={noteInfo.octave}
          frequency={frequency}
        />
      </View>

      {/* Session Stats */}
      {isListening && sessionAccuracies.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{avgAccuracy}%</Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>{onPitchCount}</Text>
            <Text style={styles.statLabel}>On Pitch</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{totalCount}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* Mic Button */}
      <TouchableOpacity
        style={[styles.micButton, isListening && styles.micButtonActive]}
        onPress={handleToggleListening}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isListening ? [COLORS.danger, '#991B1B'] : [COLORS.primary, COLORS.primaryDark]}
          style={styles.micGradient}
        >
          <Ionicons
            name={isListening ? 'stop' : 'mic'}
            size={36}
            color="#fff"
          />
          <Text style={styles.micLabel}>{isListening ? 'Stop' : 'Start Singing'}</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>How to use:</Text>
        <Text style={styles.instructionItem}>🎵 Press Start and sing any note</Text>
        <Text style={styles.instructionItem}>🟢 Green = you're in pitch! Keep going</Text>
        <Text style={styles.instructionItem}>🔵 Blue = your pitch is too flat, sing higher</Text>
        <Text style={styles.instructionItem}>🔴 Red = your pitch is too sharp, sing lower</Text>
        <Text style={styles.instructionItem}>📊 The needle shows exactly how far off you are</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING['2xl'] },
  header: {
    padding: SPACING.xl,
    paddingTop: SPACING['2xl'],
  },
  title: {
    fontSize: FONTS.sizes['2xl'],
    fontWeight: FONTS.weights.black,
    color: COLORS.text,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  waveformContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  meterCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primaryLight,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  micButton: {
    marginHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  micButtonActive: {
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  micGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  micLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: '#fff',
  },
  instructionsCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  instructionsTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  instructionItem: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});
