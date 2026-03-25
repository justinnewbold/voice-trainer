import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, useWindowDimensions } from 'react-native';

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  color: string;
  size: number;
  shape: 'rect' | 'circle';
}

const COLORS = [
  '#7c6af7', '#a78bfa', '#ec4899', '#f97316',
  '#10b981', '#06b6d4', '#fbbf24', '#f472b6',
  '#34d399', '#60a5fa',
];

const COUNT = 60;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

interface Props {
  trigger: boolean;       // flip true → fires burst
  originY?: number;       // vertical origin (0–1, default 0.45)
}

export default function Confetti({ trigger, originY = 0.45 }: Props) {
  const { width, height } = useWindowDimensions();
  const particlesRef = useRef<Particle[]>([]);
  const firedRef = useRef(false);

  // Build particles once
  if (particlesRef.current.length === 0) {
    particlesRef.current = Array.from({ length: COUNT }, () => ({
      x: new Animated.Value(width / 2),
      y: new Animated.Value(height * originY),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(1),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: randomBetween(6, 13),
      shape: Math.random() > 0.4 ? 'rect' : 'circle',
    }));
  }

  useEffect(() => {
    if (!trigger) { firedRef.current = false; return; }
    if (firedRef.current) return;
    firedRef.current = true;

    particlesRef.current.forEach(p => {
      // Reset
      p.x.setValue(width / 2 + randomBetween(-40, 40));
      p.y.setValue(height * originY);
      p.opacity.setValue(1);
      p.rotate.setValue(0);
      p.scale.setValue(1);

      const targetX = randomBetween(-width * 0.55, width * 0.55);
      const targetY = randomBetween(-height * 0.55, height * 0.1);
      const duration = randomBetween(700, 1400);
      const delay = randomBetween(0, 200);

      Animated.parallel([
        Animated.timing(p.x, { toValue: width / 2 + targetX, duration, delay, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(p.y, { toValue: height * originY + targetY, duration: duration * 0.6, delay, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: height * originY + targetY + height * 0.4, duration: duration * 0.4, useNativeDriver: true }),
        ]),
        Animated.timing(p.rotate, { toValue: randomBetween(-6, 6), duration, delay, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(delay + duration * 0.5),
          Animated.timing(p.opacity, { toValue: 0, duration: duration * 0.5, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(p.scale, { toValue: randomBetween(0.3, 0.8), duration, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particlesRef.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            p.shape === 'rect' ? styles.rect : styles.circle,
            {
              width: p.size,
              height: p.size * (p.shape === 'rect' ? 1.6 : 1),
              backgroundColor: p.color,
              position: 'absolute',
              left: 0,
              top: 0,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                { rotate: p.rotate.interpolate({ inputRange: [-6, 6], outputRange: ['-360deg', '360deg'] }) },
                { scale: p.scale },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rect: { borderRadius: 2 },
  circle: { borderRadius: 999 },
});
