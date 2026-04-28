import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type TempoMultiplier = 0.5 | 0.75 | 1.0 | 1.25 | 1.5;

export const TEMPO_OPTIONS: TempoMultiplier[] = [0.5, 0.75, 1.0, 1.25, 1.5];

interface Props {
  value: TempoMultiplier;
  onChange: (next: TempoMultiplier) => void;
  /** Original BPM — used to display the resulting BPM next to each chip */
  baseBpm?: number;
  /** Whether to show the resulting BPM after the multiplier */
  showResultingBpm?: boolean;
  /** Optional title override */
  title?: string;
  /** Optional helper subtitle */
  subtitle?: string;
}

/**
 * Practice tempo selector. Lets users slow down (50%, 75%) to learn a passage
 * before bringing it back to full speed (100%) or pushing past it (125%, 150%).
 *
 * The classic "slow it down, then speed it up" practice loop is the single
 * highest-leverage technique for learning any musical passage. Without this
 * control users were locked to the exercise's authored BPM.
 */
export default function TempoControl({
  value,
  onChange,
  baseBpm,
  showResultingBpm = true,
  title = 'Practice Speed',
  subtitle,
}: Props) {
  const labelFor = (m: TempoMultiplier) => {
    if (m === 1.0) return '100%';
    return `${Math.round(m * 100)}%`;
  };

  const resultingBpm = (m: TempoMultiplier) =>
    baseBpm ? Math.round(baseBpm * m) : null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          <Text style={styles.titleEmoji}>🎚 </Text>
          {title}
        </Text>
        {showResultingBpm && baseBpm !== undefined && (
          <Text style={styles.bpmLabel}>
            {resultingBpm(value)} BPM
            {value !== 1.0 ? (
              <Text style={styles.bpmOriginal}> (was {baseBpm})</Text>
            ) : null}
          </Text>
        )}
      </View>

      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <View style={styles.row}>
        {TEMPO_OPTIONS.map(opt => {
          const active = opt === value;
          const isSlow = opt < 1.0;
          const isFast = opt > 1.0;
          return (
            <TouchableOpacity
              key={opt}
              style={[
                styles.chip,
                active && styles.chipActive,
                active && isSlow && styles.chipActiveSlow,
                active && isFast && styles.chipActiveFast,
              ]}
              onPress={() => onChange(opt)}
              accessibilityRole="button"
              accessibilityLabel={`Set practice speed to ${labelFor(opt)}`}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {labelFor(opt)}
              </Text>
              {opt === 1.0 && <Text style={styles.chipBadge}>Normal</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {value !== 1.0 && (
        <TouchableOpacity
          onPress={() => onChange(1.0)}
          style={styles.resetBtn}
          accessibilityRole="button"
          accessibilityLabel="Reset to normal speed"
        >
          <Ionicons name="refresh" size={12} color={COLORS.textMuted} />
          <Text style={styles.resetText}>Reset to 100%</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(30, 30, 58, 0.55)',
    borderRadius: 14,
    padding: 14,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A5066',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  titleEmoji: { fontSize: 14 },
  bpmLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight,
  },
  bpmOriginal: {
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#2A2A5066',
    minWidth: 56,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  chipActiveSlow: {
    backgroundColor: '#06b6d433',
    borderColor: '#06b6d4',
  },
  chipActiveFast: {
    backgroundColor: '#f97316' + '33',
    borderColor: '#f97316',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: COLORS.text,
  },
  chipBadge: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  resetText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
});
