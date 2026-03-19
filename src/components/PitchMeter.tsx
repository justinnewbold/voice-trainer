import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
}

export default function PitchMeter({ note, octave, cents, frequency, pitchHint, color, volume, isStable }: Props) {
  const centsAbs = Math.abs(cents);
  const centsBarWidth = Math.min(100, centsAbs * 2);
  const isLeft = cents < 0;

  return (
    <View style={styles.container}>
      {/* Note display */}
      <View style={[styles.noteCircle, { borderColor: color, shadowColor: color }]}>
        <Text style={[styles.noteText, { color }]}>{note}</Text>
        {note !== '-' && <Text style={styles.octaveText}>{octave}</Text>}
      </View>

      {/* Cents bar */}
      <View style={styles.centsContainer}>
        <View style={styles.centsBar}>
          <View style={styles.centsCenter} />
          {note !== '-' && (
            <View style={[
              styles.centsIndicator,
              {
                backgroundColor: color,
                width: `${centsBarWidth / 2}%`,
                [isLeft ? 'right' : 'left']: '50%',
              },
            ]} />
          )}
        </View>
        <View style={styles.centsLabels}>
          <Text style={styles.centsLabel}>♭ Flat</Text>
          <Text style={[styles.centsValue, { color }]}>
            {note !== '-' ? `${cents > 0 ? '+' : ''}${cents}¢` : '—'}
          </Text>
          <Text style={styles.centsLabel}>Sharp ♯</Text>
        </View>
      </View>

      {/* Frequency + status */}
      <View style={styles.infoRow}>
        <Text style={styles.freqText}>
          {frequency > 0 ? `${Math.round(frequency)} Hz` : '— Hz'}
        </Text>
        {isStable && <View style={[styles.stableBadge, { backgroundColor: color + '33', borderColor: color }]}>
          <Text style={[styles.stableText, { color }]}>Stable</Text>
        </View>}
      </View>

      {/* Volume bar */}
      <View style={styles.volumeBar}>
        <View style={[styles.volumeFill, { width: `${Math.min(100, volume * 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 16 },
  noteCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.surface, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  noteText: { fontSize: FONTS.sizes['4xl'], fontWeight: FONTS.weights.black },
  octaveText: { fontSize: FONTS.sizes.md, color: COLORS.textMuted, marginTop: -4 },
  centsContainer: { width: '100%', paddingHorizontal: 20 },
  centsBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, position: 'relative', overflow: 'hidden' },
  centsCenter: { position: 'absolute', left: '50%', top: 0, bottom: 0, width: 2, backgroundColor: COLORS.textMuted, marginLeft: -1 },
  centsIndicator: { position: 'absolute', top: 0, bottom: 0, borderRadius: 3 },
  centsLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  centsLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  centsValue: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  freqText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  stableBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: BORDER_RADIUS.full, borderWidth: 1 },
  stableText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  volumeBar: { width: '80%', height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
  volumeFill: { height: '100%', borderRadius: 2 },
});
