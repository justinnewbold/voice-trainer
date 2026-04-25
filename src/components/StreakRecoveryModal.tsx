import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Easing, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { RESTORE_GEM_COST } from '../utils/streakProtection';

interface Props {
  visible: boolean;
  prevStreak: number;
  hoursLeft: number;
  gems: number;
  cooldownActive: boolean;
  cooldownDaysLeft: number;
  onRestore: () => void;
  onDismiss: () => void;
}

export default function StreakRecoveryModal({
  visible, prevStreak, hoursLeft, gems, cooldownActive, cooldownDaysLeft, onRestore, onDismiss,
}: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const flameScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(fade, {
        toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }).start();

      // Subtle flame pulse to add a "saveable" energy without being obnoxious
      Animated.loop(
        Animated.sequence([
          Animated.timing(flameScale, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(flameScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      fade.setValue(0);
    }
  }, [visible, fade, flameScale]);

  const canAfford = gems >= RESTORE_GEM_COST;
  const canRestore = canAfford && !cooldownActive;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <View style={styles.sheet}>
          <LinearGradient
            colors={['#2D1B69', '#1A0E3D']}
            style={styles.sheetInner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Flame icon */}
            <Animated.View style={[styles.flameWrap, { transform: [{ scale: flameScale }] }]}>
              <Text style={styles.flameEmoji}>🔥</Text>
              <View style={styles.brokenOverlay}>
                <Ionicons name="close" size={20} color="#fff" />
              </View>
            </Animated.View>

            <Text style={styles.title}>Streak Broken</Text>
            <Text style={styles.subtitle}>
              You had a <Text style={styles.bold}>{prevStreak}-day</Text> streak going. You can still save it!
            </Text>

            {/* Cost / time row */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cost</Text>
                <Text style={styles.statValue}>💎 {RESTORE_GEM_COST}</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time left</Text>
                <Text style={styles.statValue}>⏱ {hoursLeft}h</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Your gems</Text>
                <Text style={[styles.statValue, !canAfford && styles.statValueWarn]}>
                  💎 {gems}
                </Text>
              </View>
            </View>

            {/* Cooldown notice */}
            {cooldownActive && (
              <View style={styles.cooldownBox}>
                <Ionicons name="time-outline" size={14} color="#FBBF24" />
                <Text style={styles.cooldownText}>
                  Restore on cooldown — available again in {cooldownDaysLeft} day{cooldownDaysLeft === 1 ? '' : 's'}
                </Text>
              </View>
            )}

            {/* Insufficient gems notice */}
            {!cooldownActive && !canAfford && (
              <View style={styles.cooldownBox}>
                <Ionicons name="alert-circle-outline" size={14} color="#FBBF24" />
                <Text style={styles.cooldownText}>
                  Not enough gems — earn more by completing exercises
                </Text>
              </View>
            )}

            {/* Buttons */}
            <TouchableOpacity
              style={[styles.restoreBtn, !canRestore && styles.restoreBtnDisabled]}
              onPress={onRestore}
              disabled={!canRestore}
              activeOpacity={0.85}
            >
              <Ionicons name="flame" size={18} color="#fff" />
              <Text style={styles.restoreBtnText}>
                Restore Streak ({RESTORE_GEM_COST} 💎)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn} activeOpacity={0.7}>
              <Text style={styles.dismissBtnText}>Maybe later</Text>
            </TouchableOpacity>

            {/* Footer hint */}
            <Text style={styles.footerHint}>
              Tip: earn streak freezes ❄️ every {7}-day milestone to auto-protect missed days.
            </Text>
          </LinearGradient>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  sheetInner: {
    borderRadius: BORDER_RADIUS.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3A2D7A',
    alignItems: 'center',
  },
  flameWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  flameEmoji: {
    fontSize: 60,
    opacity: 0.5,
  },
  brokenOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1A0E3D',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
  },
  bold: {
    fontWeight: '700',
    color: '#FBBF24',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
    alignSelf: 'stretch',
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statValueWarn: {
    color: '#FBBF24',
  },
  cooldownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
  },
  cooldownText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '500',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  restoreBtnDisabled: {
    backgroundColor: '#3A2D5A',
    opacity: 0.6,
  },
  restoreBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  dismissBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  dismissBtnText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footerHint: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 15,
    paddingHorizontal: 8,
  },
});
