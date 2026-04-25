import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import {
  WeeklyChallengeProgress,
  WEEKLY_REWARD_GEMS,
  WEEKLY_REWARD_XP,
  getProgressPercent,
  getTimeLeftString,
} from '../utils/weeklyChallenge';

interface Props {
  progress: WeeklyChallengeProgress;
  onClaim?: () => void;
  /** Optional press handler (e.g. navigate to relevant screen). */
  onPress?: () => void;
}

export default function WeeklyChallengeCard({ progress, onClaim, onPress }: Props) {
  const pct = getProgressPercent(progress);
  const isComplete = !!progress.completedAt;
  const canClaim = isComplete && !progress.rewardClaimed;
  const isClaimed = isComplete && progress.rewardClaimed;

  const [timeLeft, setTimeLeft] = useState(getTimeLeftString());
  useEffect(() => {
    // Refresh once a minute so the countdown stays current without being chatty
    const id = setInterval(() => setTimeLeft(getTimeLeftString()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Animated progress fill
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: pct,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, fillAnim]);

  // Subtle pulse for the claim button when ready
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (canClaim) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [canClaim, pulseAnim]);

  const widthInterp = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const { challenge, current } = progress;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <LinearGradient
        colors={isComplete ? ['#1E3A2D', '#152821'] : ['#2D1B5C', '#1A0E3D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, isComplete && styles.cardComplete]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.label}>WEEKLY CHALLENGE</Text>
            <Text style={styles.title} numberOfLines={1}>
              {challenge.emoji} {challenge.title}
            </Text>
          </View>
          <View style={styles.timeChip}>
            <Ionicons name="time-outline" size={11} color={COLORS.textMuted} />
            <Text style={styles.timeText}>{timeLeft}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.desc}>{challenge.desc}</Text>

        {/* Progress bar */}
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <Animated.View style={[styles.barFill, { width: widthInterp }]}>
              <LinearGradient
                colors={isComplete ? ['#10B981', '#34D399'] : ['#7C3AED', '#A78BFA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
          <Text style={styles.barCount}>
            {current} / {challenge.goal}
          </Text>
        </View>

        {/* Reward / claim row */}
        <View style={styles.rewardRow}>
          <View style={styles.rewardChips}>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardChipText}>💎 {WEEKLY_REWARD_GEMS}</Text>
            </View>
            <View style={styles.rewardChip}>
              <Text style={styles.rewardChipText}>⚡ {WEEKLY_REWARD_XP} XP</Text>
            </View>
          </View>

          {canClaim ? (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.claimBtn}
                onPress={onClaim}
                activeOpacity={0.85}
              >
                <Ionicons name="gift" size={14} color="#fff" />
                <Text style={styles.claimBtnText}>Claim</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : isClaimed ? (
            <View style={styles.doneChip}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.doneText}>Claimed</Text>
            </View>
          ) : (
            <Text style={styles.percentText}>{pct}%</Text>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3A2D7A',
  },
  cardComplete: {
    borderColor: '#10B98166',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A78BFA',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeText: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  desc: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 12,
    lineHeight: 17,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    minWidth: 50,
    textAlign: 'right',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardChips: {
    flexDirection: 'row',
    gap: 6,
  },
  rewardChip: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rewardChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  claimBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  doneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  doneText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  percentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A78BFA',
  },
});
