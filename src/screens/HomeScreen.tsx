import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { loadProgress, UserProgress, getLevelLabel, getXpForNextLevel } from '../../src/utils/storage';

export default function HomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProgress = useCallback(async () => {
    const p = await loadProgress();
    setProgress(p);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProgress();
    }, [fetchProgress])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProgress();
    setRefreshing(false);
  };

  const xpInfo = progress ? getXpForNextLevel(progress.xp) : null;
  const xpProgress = xpInfo ? xpInfo.current / xpInfo.needed : 0;

  const quickActions = [
    {
      label: 'Pitch Trainer',
      icon: 'mic',
      color: COLORS.primary,
      gradient: ['#7C3AED', '#5B21B6'] as [string, string],
      route: '/(tabs)/pitch',
      description: 'Real-time pitch detection',
    },
    {
      label: 'Scales',
      icon: 'musical-notes',
      color: COLORS.accent,
      gradient: ['#06B6D4', '#0284C7'] as [string, string],
      route: '/(tabs)/scales',
      description: 'Do-Re-Mi exercises',
    },
    {
      label: 'Song Match',
      icon: 'headset',
      color: '#EC4899',
      gradient: ['#EC4899', '#BE185D'] as [string, string],
      route: '/(tabs)/songs',
      description: 'Sing along to melodies',
    },
    {
      label: 'Progress',
      icon: 'bar-chart',
      color: COLORS.success,
      gradient: ['#10B981', '#059669'] as [string, string],
      route: '/(tabs)/progress',
      description: 'Track your improvement',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <LinearGradient
        colors={['#1A0A35', '#0A0A1A']}
        style={styles.header}
      >
        <Text style={styles.greeting}>Welcome back! 👋</Text>
        <Text style={styles.title}>Voice Trainer</Text>
        <Text style={styles.subtitle}>Let's work on your pitch today</Text>
      </LinearGradient>

      {/* Level Card */}
      {progress && (
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelLabel}>🏆 {getLevelLabel(progress.level)}</Text>
              <Text style={styles.xpText}>{progress.xp.toLocaleString()} XP</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progress.currentStreak}</Text>
                <Text style={styles.statLabel}>🔥 Streak</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progress.totalSessions}</Text>
                <Text style={styles.statLabel}>Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{progress.avgAccuracy}%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
            </View>
          </View>

          {/* XP Progress Bar */}
          {xpInfo && xpInfo.needed > xpInfo.current && (
            <View style={styles.xpBarContainer}>
              <View style={styles.xpBarTrack}>
                <View
                  style={[
                    styles.xpBarFill,
                    { width: `${Math.min(100, xpProgress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.xpBarLabel}>
                {(xpInfo.needed - xpInfo.current).toLocaleString()} XP to {xpInfo.label}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Start</Text>
      <View style={styles.actionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.label}
            style={styles.actionCard}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={action.gradient}
              style={styles.actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={action.icon as any} size={28} color="#fff" />
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionDesc}>{action.description}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tip of the Day */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>💡 Tip of the Day</Text>
        <Text style={styles.tipText}>
          Warm up your voice before singing! Try humming softly for 2-3 minutes to prepare your vocal cords.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING['2xl'],
  },
  header: {
    padding: SPACING.xl,
    paddingTop: SPACING['2xl'],
  },
  greeting: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: FONTS.sizes['3xl'],
    fontWeight: FONTS.weights.black,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  levelCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  levelLabel: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
  },
  xpText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primaryLight,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  xpBarContainer: {
    gap: SPACING.xs,
  },
  xpBarTrack: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  xpBarLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.text,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  actionCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  actionGradient: {
    padding: SPACING.md,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  actionLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: '#fff',
    marginTop: SPACING.sm,
  },
  actionDesc: {
    fontSize: FONTS.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  tipCard: {
    margin: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
  },
  tipTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primaryLight,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
});
