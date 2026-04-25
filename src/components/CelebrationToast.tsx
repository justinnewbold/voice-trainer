import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Easing, Platform,
  TouchableWithoutFeedback, Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Confetti from './Confetti';
import { useCelebrations, type CelebrationKind } from '../contexts/CelebrationContext';

// ─── Per-kind theming ───────────────────────────────────────────────────────
interface KindTheme {
  gradient: [string, string];
  border: string;
  glow: string;
  defaultEmoji: string;
  defaultConfetti: boolean;
  ionicon: keyof typeof Ionicons.glyphMap;
}

const KIND_THEMES: Record<CelebrationKind, KindTheme> = {
  achievement: {
    gradient: ['#FBBF24', '#F59E0B'],
    border: '#FCD34D',
    glow: '#FBBF2466',
    defaultEmoji: '🏆',
    defaultConfetti: true,
    ionicon: 'trophy',
  },
  freeze_earned: {
    gradient: ['#0891B2', '#0E7490'],
    border: '#22D3EE',
    glow: '#22D3EE55',
    defaultEmoji: '❄️',
    defaultConfetti: false,
    ionicon: 'snow',
  },
  freeze_used: {
    gradient: ['#1E3A5F', '#0F2440'],
    border: '#7DD3FC',
    glow: '#7DD3FC44',
    defaultEmoji: '❄️',
    defaultConfetti: false,
    ionicon: 'shield-checkmark',
  },
  streak_milestone: {
    gradient: ['#F97316', '#EA580C'],
    border: '#FB923C',
    glow: '#F9731666',
    defaultEmoji: '🔥',
    defaultConfetti: true,
    ionicon: 'flame',
  },
  weekly_complete: {
    gradient: ['#10B981', '#059669'],
    border: '#34D399',
    glow: '#10B98166',
    defaultEmoji: '🗓️',
    defaultConfetti: true,
    ionicon: 'calendar',
  },
  personal_best: {
    gradient: ['#7C3AED', '#6D28D9'],
    border: '#A78BFA',
    glow: '#7C3AED55',
    defaultEmoji: '🌟',
    defaultConfetti: false,
    ionicon: 'star',
  },
  level_up: {
    gradient: ['#7C3AED', '#A78BFA'],
    border: '#C4B5FD',
    glow: '#A78BFA66',
    defaultEmoji: '⬆️',
    defaultConfetti: true,
    ionicon: 'arrow-up-circle',
  },
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function CelebrationToast() {
  const { current, dismiss } = useCelebrations();

  // Animated values (kept across re-renders so we can drive multiple toasts)
  const translateY = useRef(new Animated.Value(-180)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (!current) {
      // Slide back up
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -180, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0, duration: 220, useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    // Slide & fade in (spring for the bouncy feel)
    translateY.setValue(-180);
    opacity.setValue(0);
    scale.setValue(0.92);

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 16,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1, duration: 240, useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [current, translateY, opacity, scale]);

  if (!current) return null;

  const theme = KIND_THEMES[current.kind];
  const showConfetti = current.withConfetti ?? theme.defaultConfetti;
  const emoji = current.emoji ?? theme.defaultEmoji;

  return (
    <>
      {/* Confetti renders behind/around the toast for celebratory kinds */}
      {showConfetti && <Confetti trigger={true} originY={0.15} />}

      {/* Full-width transparent backdrop captures taps to dismiss */}
      <Pressable
        style={styles.tapCatcher}
        onPress={dismiss}
        pointerEvents={current ? 'box-none' : 'none'}
      >
        <Animated.View
          style={[
            styles.toastWrap,
            {
              opacity,
              transform: [{ translateY }, { scale }],
            },
          ]}
          pointerEvents="auto"
        >
          <TouchableWithoutFeedback onPress={dismiss}>
            <LinearGradient
              colors={theme.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.toast,
                {
                  borderColor: theme.border,
                  shadowColor: theme.glow,
                },
              ]}
            >
              <View style={styles.iconWrap}>
                <Text style={styles.emoji}>{emoji}</Text>
              </View>

              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={1}>
                  {current.title}
                </Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  {current.body}
                </Text>

                {/* Reward chips */}
                {(current.rewards?.gems || current.rewards?.xp) && (
                  <View style={styles.rewardRow}>
                    {!!current.rewards.gems && (
                      <View style={styles.rewardChip}>
                        <Text style={styles.rewardChipText}>💎 +{current.rewards.gems}</Text>
                      </View>
                    )}
                    {!!current.rewards.xp && (
                      <View style={styles.rewardChip}>
                        <Text style={styles.rewardChipText}>⚡ +{current.rewards.xp} XP</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Tap-to-dismiss hint */}
              <Ionicons
                name="close-circle"
                size={20}
                color="rgba(255,255,255,0.7)"
                style={styles.dismissIcon}
              />
            </LinearGradient>
          </TouchableWithoutFeedback>
        </Animated.View>
      </Pressable>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tapCatcher: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastWrap: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 14,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    // Shadow (iOS) + elevation (Android)
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  emoji: {
    fontSize: 28,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.92)',
    lineHeight: 16,
  },
  rewardRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  rewardChip: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  rewardChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  dismissIcon: {
    marginLeft: 4,
  },
});
