import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS, FONTS, SPACING } from '../constants/theme';

interface PitchMeterProps {
  cents: number; // -50 to +50
  pitchHint: 'on-pitch' | 'too-low' | 'too-high' | 'silent';
  note: string;
  octave: number;
  frequency: number;
}

export default function PitchMeter({ cents, pitchHint, note, octave, frequency }: PitchMeterProps) {
  const needleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Map cents (-50..+50) to position (0..1)
  const needlePosition = Math.max(0, Math.min(1, (cents + 50) / 100));

  useEffect(() => {
    Animated.spring(needleAnim, {
      toValue: needlePosition,
      tension: 60,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }, [needlePosition]);

  useEffect(() => {
    if (pitchHint === 'on-pitch') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pitchHint]);

  const getMeterColor = () => {
    switch (pitchHint) {
      case 'on-pitch': return COLORS.success;
      case 'too-low': return COLORS.accent;
      case 'too-high': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  const getHintText = () => {
    switch (pitchHint) {
      case 'on-pitch': return '✓ On Pitch!';
      case 'too-low': return '↑ Sing Higher';
      case 'too-high': return '↓ Sing Lower';
      default: return 'Start Singing...';
    }
  };

  const meterColor = getMeterColor();

  return (
    <View style={styles.container}>
      {/* Note Display */}
      <Animated.View style={[styles.noteCircle, { borderColor: meterColor, transform: [{ scale: pulseAnim }] }]}>
        <Text style={[styles.noteLetter, { color: meterColor }]}>
          {pitchHint === 'silent' ? '🎤' : note}
        </Text>
        {pitchHint !== 'silent' && (
          <Text style={[styles.noteOctave, { color: meterColor }]}>{octave}</Text>
        )}
      </Animated.View>

      {/* Frequency display */}
      {frequency > 0 && (
        <Text style={styles.frequency}>{Math.round(frequency)} Hz</Text>
      )}

      {/* Pitch Meter Bar */}
      <View style={styles.meterContainer}>
        {/* Labels */}
        <View style={styles.meterLabels}>
          <Text style={[styles.meterLabel, { color: COLORS.accent }]}>♭ Flat</Text>
          <Text style={[styles.meterLabel, { color: COLORS.success }]}>In Tune</Text>
          <Text style={[styles.meterLabel, { color: COLORS.danger }]}>Sharp ♯</Text>
        </View>

        {/* Meter Track */}
        <View style={styles.meterTrack}>
          {/* Center marker */}
          <View style={styles.centerMarker} />

          {/* Zone indicators */}
          <View style={[styles.zone, styles.zoneLeft, { backgroundColor: COLORS.accent + '30' }]} />
          <View style={[styles.zone, styles.zoneCenter, { backgroundColor: COLORS.success + '30' }]} />
          <View style={[styles.zone, styles.zoneRight, { backgroundColor: COLORS.danger + '30' }]} />

          {/* Needle */}
          <Animated.View
            style={[
              styles.needle,
              {
                left: needleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: meterColor,
              },
            ]}
          />
        </View>

        {/* Tick marks */}
        <View style={styles.tickContainer}>
          {[-50, -25, 0, 25, 50].map((tick) => (
            <Text
              key={tick}
              style={[
                styles.tick,
                tick === 0 && styles.centerTick,
              ]}
            >
              {tick > 0 ? `+${tick}` : tick}
            </Text>
          ))}
        </View>
      </View>

      {/* Hint Text */}
      <View style={[styles.hintBadge, { backgroundColor: meterColor + '20', borderColor: meterColor + '50' }]}>
        <Text style={[styles.hintText, { color: meterColor }]}>{getHintText()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: SPACING.lg,
  },
  noteCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  noteLetter: {
    fontSize: FONTS.sizes['4xl'],
    fontWeight: FONTS.weights.black,
  },
  noteOctave: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    marginTop: -4,
  },
  frequency: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  meterContainer: {
    width: '100%',
    marginBottom: SPACING.md,
  },
  meterLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
    paddingHorizontal: 4,
  },
  meterLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.medium,
  },
  meterTrack: {
    height: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  zone: {
    flex: 1,
  },
  zoneLeft: {},
  zoneCenter: { flex: 0.4 },
  zoneRight: {},
  centerMarker: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.success,
    zIndex: 2,
    marginLeft: -1,
  },
  needle: {
    position: 'absolute',
    width: 4,
    height: '100%',
    borderRadius: 2,
    zIndex: 3,
    marginLeft: -2,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  tickContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  tick: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
  centerTick: {
    color: COLORS.success,
    fontWeight: FONTS.weights.bold,
  },
  hintBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  hintText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
  },
});
