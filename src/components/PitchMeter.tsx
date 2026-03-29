import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { COLORS, FONTS, BORDER_RADIUS } from '../constants/theme';

interface Props {
  note: string;
  octave: number;
  cents: number;
  frequency: number;
  pitchHint: string;
  color: string;
  volume: number;
  isStable: boolean;
  noteInfo?: any;
}

// Map cents → needle angle degrees
function centsToAngle(cents: number): number {
  return Math.max(-65, Math.min(65, cents)) * (65 / 60);
}

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export default function PitchMeter({ note, octave, cents, frequency, pitchHint, color, volume, isStable, noteInfo }: Props) {
  const displayNote = noteInfo?.note ?? note;
  const displayOctave = noteInfo?.octave ?? octave;
  const displayCents = noteInfo?.cents ?? cents;
  const displayFreq = noteInfo?.frequency ?? frequency;
  const displayColor = color;

  const { width: screenWidth } = useWindowDimensions();
  const meterSize = Math.min(screenWidth - 48, 300);
  const cx = meterSize / 2;
  const cy = meterSize * 0.62;
  const r = meterSize * 0.42;
  const needleLength = r * 0.85;

  // ── Reanimated shared values (60fps native thread) ──
  const needleRotation = useSharedValue(0);
  const noteScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const volumeWidth = useSharedValue(0);

  useEffect(() => {
    const target = displayNote !== '-' ? centsToAngle(displayCents) : 0;
    // Spring animation for needle — runs on UI thread
    needleRotation.value = withSpring(target, {
      damping: 12,
      stiffness: 180,
      mass: 0.5,
    });
  }, [displayCents, displayNote]);

  useEffect(() => {
    // Pulse the note circle on pitch hit
    if (pitchHint === 'on-pitch' && displayNote !== '-') {
      noteScale.value = withSpring(1.08, { damping: 8, stiffness: 300 });
      glowOpacity.value = withTiming(0.6, { duration: 150 });
    } else {
      noteScale.value = withSpring(1, { damping: 10, stiffness: 200 });
      glowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [pitchHint, displayNote]);

  useEffect(() => {
    volumeWidth.value = withTiming(Math.min(100, volume * 100), {
      duration: 80,
      easing: Easing.out(Easing.quad),
    });
  }, [volume]);

  // ── Animated styles (computed on UI thread) ──
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needleRotation.value}deg` }],
  }));

  const noteCircleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: noteScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const volumeBarStyle = useAnimatedStyle(() => ({
    width: `${volumeWidth.value}%`,
  }));

  // Arc constants
  const arcStart = 205;
  const arcEnd = 335;
  const centsToDeg = (c: number) => arcStart + ((c + 65) / 130) * (arcEnd - arcStart);

  const ticks = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

  return (
    <View style={styles.container}>
      {/* SVG Tuner */}
      <View style={{ width: meterSize, height: meterSize * 0.72 }}>
        <Svg width={meterSize} height={meterSize * 0.72}>
          {/* Outer arc */}
          <Path d={describeArc(cx, cy, r, arcStart, arcEnd)} stroke="#2A2A50" strokeWidth={8} fill="none" strokeLinecap="round" />
          {/* Green zone (±15 cents) */}
          <Path d={describeArc(cx, cy, r, centsToDeg(-15), centsToDeg(15))} stroke="#10B98144" strokeWidth={10} fill="none" strokeLinecap="round" />
          {/* Active arc */}
          {displayNote !== '-' && (
            <Path
              d={describeArc(cx, cy, r,
                displayCents >= 0 ? centsToDeg(0) : centsToDeg(displayCents),
                displayCents >= 0 ? centsToDeg(displayCents) : centsToDeg(0)
              )}
              stroke={displayColor} strokeWidth={6} fill="none" strokeLinecap="round"
            />
          )}
          {/* Ticks */}
          {ticks.map(c => {
            const deg = centsToDeg(c);
            const inner = polarToCartesian(cx, cy, r - (c === 0 ? 14 : 9), deg);
            const outer = polarToCartesian(cx, cy, r + 2, deg);
            return <Line key={c} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={c === 0 ? '#10B981' : '#3A3A60'} strokeWidth={c === 0 ? 2.5 : 1.5} />;
          })}
          {/* Labels */}
          <SvgText x={12} y={cy + 8} fill="#F59E0B" fontSize={10} opacity={0.7}>♭</SvgText>
          <SvgText x={meterSize - 22} y={cy + 8} fill="#EF4444" fontSize={10} opacity={0.7}>♯</SvgText>
          <SvgText x={cx - 6} y={cy - r - 8} fill="#10B981" fontSize={9} opacity={0.8}>✓</SvgText>
          {/* Center pivot */}
          <Circle cx={cx} cy={cy} r={8} fill={displayNote !== '-' ? displayColor : '#2A2A50'} />
          <Circle cx={cx} cy={cy} r={4} fill="#0A0A1A" />
        </Svg>

        {/* Reanimated needle overlay — runs at 60fps on native thread */}
        <Animated.View
          style={[{
            position: 'absolute', left: 0, top: 0,
            width: meterSize, height: meterSize * 0.72,
            transformOrigin: `${cx}px ${cy}px`,
          }, needleStyle]}
        >
          <Svg width={meterSize} height={meterSize * 0.72} style={{ position: 'absolute' }}>
            <Line x1={cx} y1={cy} x2={cx} y2={cy - needleLength} stroke="#00000066" strokeWidth={3} strokeLinecap="round" />
            <Line x1={cx} y1={cy + 6} x2={cx} y2={cy - needleLength} stroke={displayNote !== '-' ? displayColor : '#475569'} strokeWidth={2.5} strokeLinecap="round" />
            <Circle cx={cx} cy={cy - needleLength} r={4} fill={displayNote !== '-' ? displayColor : '#475569'} />
          </Svg>
        </Animated.View>
      </View>

      {/* Note circle with Reanimated scale pulse */}
      <Animated.View style={[styles.noteDisplay, { borderColor: displayColor + '88', shadowColor: displayColor }, noteCircleStyle]}>
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { borderColor: displayColor }, glowStyle]} />
        <Text style={[styles.noteText, { color: displayColor }]}>
          {displayNote !== '-' ? displayNote : '—'}
        </Text>
        {displayNote !== '-' && (
          <Text style={[styles.octaveText, { color: displayColor + 'aa' }]}>{displayOctave}</Text>
        )}
      </Animated.View>

      {/* Cents + frequency */}
      <View style={styles.infoRow}>
        <Text style={[styles.centsText, { color: displayColor }]}>
          {displayNote !== '-' ? `${displayCents > 0 ? '+' : ''}${displayCents}¢` : '—'}
        </Text>
        <Text style={styles.freqText}>
          {displayFreq > 0 ? `${Math.round(displayFreq)} Hz` : ''}
        </Text>
        {isStable && displayNote !== '-' && (
          <View style={[styles.stableBadge, { backgroundColor: displayColor + '22', borderColor: displayColor }]}>
            <Text style={[styles.stableText, { color: displayColor }]}>Stable</Text>
          </View>
        )}
      </View>

      {/* Volume bar with Reanimated width */}
      <View style={styles.volumeWrap}>
        <View style={styles.volumeBar}>
          <Animated.View style={[styles.volumeFill, { backgroundColor: displayColor }, volumeBarStyle]} />
        </View>
        <Text style={styles.volumeLabel}>🎤</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8, width: '100%' },
  noteDisplay: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#13132A', borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 0 },
    elevation: 8, marginTop: -8, overflow: 'visible',
  },
  glowRing: {
    position: 'absolute', width: 116, height: 116, borderRadius: 58,
    borderWidth: 3, opacity: 0,
  },
  noteText: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  octaveText: { fontSize: 14, marginTop: -4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  centsText: { fontSize: 18, fontWeight: '700', minWidth: 60, textAlign: 'center' },
  freqText: { fontSize: 13, color: COLORS.textSecondary },
  stableBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  stableText: { fontSize: 11, fontWeight: '600' },
  volumeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '75%' },
  volumeBar: { flex: 1, height: 5, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 3 },
  volumeLabel: { fontSize: 14 },
});
