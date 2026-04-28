import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  /**
   * Timestamp (ms) when the user first started holding the correct note.
   * `null` means no hold is currently active.
   */
  startedAt: number | null;
  /**
   * How long (ms) they need to hold to be counted as a hit.
   * Default 1000ms (matches ScalesScreen's hold requirement).
   */
  requiredMs?: number;
  /**
   * Whether the user is currently producing audible pitch — used to show
   * a different "sing the note" hint when silent.
   */
  isSinging?: boolean;
}

/**
 * Small horizontal progress bar that fills over the hold-required duration.
 *
 * On Scales, you have to sustain the correct note for 1 full second before it
 * counts as a hit. Without a UI affordance, users sing the right note, see
 * nothing happen, and assume they're sharp/flat. This bar makes the hold
 * timer visible: empty → full as they sustain.
 *
 * Uses requestAnimationFrame for smooth fill on web; on native we still get
 * good performance because we only re-render at ~60fps and the bar is cheap.
 */
export default function HoldProgress({ startedAt, requiredMs = 1000, isSinging = false }: Props) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!startedAt) {
      setProgress(0);
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const p = Math.min(1, elapsed / requiredMs);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    tick();

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [startedAt, requiredMs]);

  const filling = startedAt !== null && progress < 1;
  const complete = startedAt !== null && progress >= 1;

  // Pick a hint message based on state
  let hintText: string;
  let hintColor: string;
  if (complete) {
    hintText = '✓ Got it!';
    hintColor = COLORS.success;
  } else if (filling) {
    hintText = `Hold the note...`;
    hintColor = COLORS.primaryLight;
  } else if (isSinging) {
    hintText = 'Find the note';
    hintColor = COLORS.textSecondary;
  } else {
    hintText = 'Sing the note and hold for 1s';
    hintColor = COLORS.textMuted;
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.hint, { color: hintColor }]} numberOfLines={1}>
          {hintText}
        </Text>
        {filling && (
          <Text style={styles.percent}>{Math.round(progress * 100)}%</Text>
        )}
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            {
              width: `${progress * 100}%`,
              backgroundColor: complete ? COLORS.success : COLORS.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  hint: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  percent: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryLight,
    marginLeft: 8,
  },
  track: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    ...(Platform.OS === 'web'
      ? ({ transition: 'width 30ms linear, background-color 200ms ease' } as any)
      : {}),
  },
});
