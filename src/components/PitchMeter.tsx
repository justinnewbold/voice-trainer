import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
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
  // legacy spread prop support
  noteInfo?: any;
}

const AnimatedG = Animated.createAnimatedComponent(G);

// Map cents (-60..+60) → needle angle in degrees (-60..+60 from vertical)
function centsToAngle(cents: number): number {
  return Math.max(-65, Math.min(65, cents)) * (65 / 60);
}

export default function PitchMeter({ note, octave, cents, frequency, pitchHint, color, volume, isStable, noteInfo }: Props) {
  // Support legacy noteInfo spread
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

  // Animated needle rotation
  const needleAngle = useRef(new Animated.Value(0)).current;
  const prevAngle = useRef(0);

  useEffect(() => {
    const target = displayNote !== '-' ? centsToAngle(displayCents) : 0;
    Animated.spring(needleAngle, {
      toValue: target,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
    prevAngle.current = target;
  }, [displayCents, displayNote]);

  // Build arc path for the meter background
  function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
    const start = polarToCartesian(cx, cy, r, endDeg);
    const end = polarToCartesian(cx, cy, r, startDeg);
    const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  // Tick marks
  const ticks = [-60, -45, -30, -15, 0, 15, 30, 45, 60];
  // Map cents to arc degrees: -65deg=205, 0=270, +65=335 (visual arc from bottom-left to bottom-right)
  const arcStart = 205; // degrees on SVG circle for -65 cents
  const arcEnd = 335;

  function centsToDeg(c: number): number {
    return arcStart + ((c + 65) / 130) * (arcEnd - arcStart);
  }

  const needleLength = r * 0.85;
  const needleTipX = cx;
  const needleTipY = cy - needleLength;

  return (
    <View style={styles.container}>
      {/* SVG Tuner */}
      <View style={{ width: meterSize, height: meterSize * 0.72 }}>
        <Svg width={meterSize} height={meterSize * 0.72}>
          {/* Outer arc — background track */}
          <Path
            d={describeArc(cx, cy, r, arcStart, arcEnd)}
            stroke="#2A2A50"
            strokeWidth={8}
            fill="none"
            strokeLinecap="round"
          />
          {/* Green zone (center ±15 cents) */}
          <Path
            d={describeArc(cx, cy, r, centsToDeg(-15), centsToDeg(15))}
            stroke="#10B98144"
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
          {/* Active arc segment showing deviation */}
          {displayNote !== '-' && (
            <Path
              d={describeArc(cx, cy, r,
                displayCents >= 0 ? centsToDeg(0) : centsToDeg(displayCents),
                displayCents >= 0 ? centsToDeg(displayCents) : centsToDeg(0)
              )}
              stroke={displayColor}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
            />
          )}

          {/* Tick marks */}
          {ticks.map((c) => {
            const deg = centsToDeg(c);
            const inner = polarToCartesian(cx, cy, r - (c === 0 ? 14 : 9), deg);
            const outer = polarToCartesian(cx, cy, r + 2, deg);
            return (
              <Line
                key={c}
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke={c === 0 ? '#10B981' : '#3A3A60'}
                strokeWidth={c === 0 ? 2.5 : 1.5}
              />
            );
          })}

          {/* Flat / Sharp labels */}
          <SvgText x={12} y={cy + 8} fill="#F59E0B" fontSize={10} opacity={0.7}>♭</SvgText>
          <SvgText x={meterSize - 22} y={cy + 8} fill="#EF4444" fontSize={10} opacity={0.7}>♯</SvgText>
          <SvgText x={cx - 6} y={cy - r - 8} fill="#10B981" fontSize={9} opacity={0.8}>✓</SvgText>

          {/* Needle — animated via transform */}
          <G>
            <Animated.View
              style={{
                position: 'absolute',
                left: 0, top: 0,
                width: meterSize,
                height: meterSize * 0.72,
                transform: [{
                  rotate: needleAngle.interpolate({
                    inputRange: [-65, 65],
                    outputRange: ['-65deg', '65deg'],
                  })
                }],
                transformOrigin: `${cx}px ${cy}px`,
              }}
            >
              <Svg width={meterSize} height={meterSize * 0.72} style={{ position: 'absolute' }}>
                {/* Needle shadow */}
                <Line
                  x1={cx} y1={cy}
                  x2={cx} y2={cy - needleLength}
                  stroke="#00000066"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Needle */}
                <Line
                  x1={cx} y1={cy + 6}
                  x2={cx} y2={cy - needleLength}
                  stroke={displayNote !== '-' ? displayColor : '#475569'}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
                {/* Needle tip dot */}
                <Circle
                  cx={cx}
                  cy={cy - needleLength}
                  r={4}
                  fill={displayNote !== '-' ? displayColor : '#475569'}
                />
              </Svg>
            </Animated.View>
          </G>

          {/* Center pivot */}
          <Circle cx={cx} cy={cy} r={8} fill={displayNote !== '-' ? displayColor : '#2A2A50'} />
          <Circle cx={cx} cy={cy} r={4} fill="#0A0A1A" />
        </Svg>
      </View>

      {/* Note name display */}
      <View style={[styles.noteDisplay, { borderColor: displayColor + '88', shadowColor: displayColor }]}>
        <Text style={[styles.noteText, { color: displayColor }]}>
          {displayNote !== '-' ? displayNote : '—'}
        </Text>
        {displayNote !== '-' && (
          <Text style={[styles.octaveText, { color: displayColor + 'aa' }]}>{displayOctave}</Text>
        )}
      </View>

      {/* Cents value + frequency */}
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

      {/* Volume bar */}
      <View style={styles.volumeWrap}>
        <View style={styles.volumeBar}>
          <View style={[styles.volumeFill, { width: `${Math.min(100, volume * 100)}%`, backgroundColor: displayColor }]} />
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
    elevation: 8,
    marginTop: -8,
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
