import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../constants/theme';

interface Props {
  count: number; // current countdown number (3, 2, 1)
  total?: number; // total seconds (default 3)
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function CountdownCircle({ count, total = 3 }: Props) {
  const SIZE = 140;
  const STROKE = 8;
  const R = (SIZE - STROKE * 2) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  const progress = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Reset to full then animate to next fraction
    const fraction = count / total;

    // Scale pulse on each number change
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.15, duration: 80, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();

    // Arc drains over 1 second to the next fraction
    Animated.timing(progress, {
      toValue: (count - 1) / total,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [count]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  const color = count === 1 ? COLORS.success : count === 2 ? '#F59E0B' : COLORS.primaryLight;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
      <Svg width={SIZE} height={SIZE}>
        {/* Track */}
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke="#2A2A50"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Progress arc */}
        <AnimatedCircle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${SIZE / 2}, ${SIZE / 2}`}
        />
      </Svg>
      <View style={styles.center}>
        <Animated.Text style={[styles.number, { color }]}>{count}</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', width: 140, height: 140 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 60, fontWeight: '900' },
});
