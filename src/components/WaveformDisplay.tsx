import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

interface Props {
  volume: number;
  color: string;
  isListening: boolean;
}

export default function WaveformDisplay({ volume, color, isListening }: Props) {
  if (!isListening) return null;

  const bars = 20;
  return (
    <View style={styles.container}>
      {Array.from({ length: bars }, (_, i) => {
        const center = bars / 2;
        const dist = Math.abs(i - center) / center;
        const height = Math.max(4, (1 - dist * 0.7) * volume * 40);
        return (
          <View
            key={i}
            style={[styles.bar, { height, backgroundColor: color, opacity: 0.4 + volume * 0.6 }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 40 },
  bar: { width: 3, borderRadius: 2, minHeight: 4 },
});
