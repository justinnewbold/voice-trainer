import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../constants/theme';

interface WaveformDisplayProps {
  volume: number;      // 0 to 1
  isActive: boolean;
  color?: string;
  barCount?: number;
}

export default function WaveformDisplay({
  volume,
  isActive,
  color = COLORS.primary,
  barCount = 32,
}: WaveformDisplayProps) {
  const bars = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.05))
  ).current;

  useEffect(() => {
    if (!isActive || volume < 0.05) {
      // Flat line
      bars.forEach(bar => {
        Animated.spring(bar, {
          toValue: 0.05,
          tension: 80,
          friction: 10,
          useNativeDriver: false,
        }).start();
      });
      return;
    }

    // Animate bars randomly based on volume
    bars.forEach((bar, i) => {
      const centerFactor = 1 - Math.abs((i / barCount) - 0.5) * 0.8;
      const randomFactor = 0.5 + Math.random() * 0.5;
      const targetHeight = volume * randomFactor * centerFactor;

      Animated.spring(bar, {
        toValue: Math.max(0.05, Math.min(1, targetHeight)),
        tension: 100 + Math.random() * 60,
        friction: 8,
        useNativeDriver: false,
      }).start();
    });
  }, [volume, isActive]);

  return (
    <View style={styles.container}>
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              opacity: isActive ? 0.8 + (volume * 0.2) : 0.3,
              height: bar.interpolate({
                inputRange: [0, 1],
                outputRange: ['5%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    gap: 3,
    paddingHorizontal: 8,
  },
  bar: {
    flex: 1,
    borderRadius: 3,
    minHeight: 3,
  },
});
