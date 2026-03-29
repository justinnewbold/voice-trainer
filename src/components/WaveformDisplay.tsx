import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../constants/theme';

interface Props {
  volume: number;
  color: string;
  isListening: boolean;
}

const BARS = 24;
const BAR_DATA = Array.from({ length: BARS }, (_, i) => {
  const center = BARS / 2;
  const dist = Math.abs(i - center) / center;
  return { index: i, distFromCenter: dist };
});

function AnimatedBar({ dist, volume, color }: { dist: number; volume: number; color: string }) {
  const height = useSharedValue(4);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    const targetH = Math.max(4, (1 - dist * 0.7) * volume * 48);
    const targetO = 0.3 + volume * 0.7;
    // Fast timing for responsive feel — 60fps on UI thread
    height.value = withTiming(targetH, { duration: 60, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(targetO, { duration: 80, easing: Easing.out(Easing.quad) });
  }, [volume, dist]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.bar, { backgroundColor: color }, barStyle]} />
  );
}

export default function WaveformDisplay({ volume, color, isListening }: Props) {
  if (!isListening) return null;

  return (
    <View style={styles.container}>
      {BAR_DATA.map(b => (
        <AnimatedBar
          key={b.index}
          dist={b.distFromCenter}
          volume={volume}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 48 },
  bar: { width: 3, borderRadius: 2, minHeight: 4 },
});
