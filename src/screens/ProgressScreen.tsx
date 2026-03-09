import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import {
  loadProgress,
  clearProgress,
  UserProgress,
  getLevelLabel,
  getXpForNextLevel,
} from '../../src/utils/storage';

export default function ProgressScreen() {
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

  const handleReset = () => {
    Alert.alert(
      '⚠️ Reset Progress',
      'This will delete all your training history and XP. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearProgress();
            await fetchProgress();
          },
        },
      ]
    );
  };

  if (!progress) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: COLORS.textMuted }}>Loading...</Text>
      </View>
    );
  }

  const xpInfo = getXpForNextLevel(progress.xp);
  const xpPercent = Math.min(100, (xpInfo.current / xpInfo.needed) * 100);

  const statCards = [
    { label: 'Total Sessions', value: progress.totalSessions.toString(), icon: 'mic', color: COLORS.primary },
    { label: 'Minutes Trained', value: progress.totalMinutes.toString(), icon: 'time', color: COLORS.accent },
    { label: 'Current Streak', value: `${progress.currentStreak}🔥`, icon: 'flame', color: COLORS.warning },
    { label: 'Best Streak', value: `${progress.longestStreak} days`, icon: 'trophy', color: '#F59E0B' },
    { label: 'Avg Accuracy', value: `${progress.avgAccuracy}%`, icon: 'analytics', color: COLORS.success },
    { label: 'Songs Completed', value: progress.completedExercises.length.toString(), icon: 'musical-notes', color: '#EC4899' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <LinearGradient colors={['#0A2A1A', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title}>📊 Your Progress</Text>
        <Text style={styles.subtitle}>Keep training to level up your voice!</Text>
      </LinearGradient>

      {/* Level Card */}
      <View style={styles.levelCard}>
        <LinearGradient
          colors={[COLORS.primary + '40', COLORS.surface]}
          style={styles.levelCardInner}
        >
          <View style={styles.levelTopRow}>
            <View>
              <Text style={styles.levelTitle}>🏆 {getLevelLabel(progress.level)}</Text>
              <Text style={styles.xpTotal}>{progress.xp.toLocaleString()} Total XP</Text>
            </View>
            <View style={styles.levelIcon}>
              <Text style={styles.levelEmoji}>
                {progress.level === 'beginner' ? '🌱' : progress.level === 'intermediate' ? '🎵' : '🌟'}
              </Text>
            </View>
          </View>

          {xpInfo.needed > xpInfo.current && (
            <>
              <View style={styles.xpBar}>
                <View style={[styles.xpFill, { width: `${xpPercent}%` }]} />
              </View>
              <Text style={styles.xpLabel}>
                {(xpInfo.needed - xpInfo.current).toLocaleString()} XP until {xpInfo.label}
              </Text>
            </>
          )}

          {progress.level === 'advanced' && (
            <Text style={styles.maxLevel}>🎉 You've reached the highest level!</Text>
          )}
        </LinearGradient>
      </View>

      {/* Stats Grid */}
      <Text style={styles.sectionTitle}>Statistics</Text>
      <View style={styles.statsGrid}>
        {statCards.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Recent Sessions */}
      <Text style={styles.sectionTitle}>Recent Sessions</Text>
      {progress.sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎤</Text>
          <Text style={styles.emptyTitle}>No sessions yet</Text>
          <Text style={styles.emptyText}>Complete a training session to see your history here</Text>
        </View>
      ) : (
        <View style={styles.sessionList}>
          {progress.sessions.slice(0, 10).map((session, i) => {
            const date = new Date(session.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const accuracyColor =
              session.avgAccuracy >= 80 ? COLORS.success :
              session.avgAccuracy >= 60 ? COLORS.warning : COLORS.danger;

            return (
              <View key={session.id} style={styles.sessionCard}>
                <View style={[styles.sessionAccuracyBar, { backgroundColor: accuracyColor + '20' }]}>
                  <Text style={[styles.sessionAccuracy, { color: accuracyColor }]}>
                    {session.avgAccuracy}%
                  </Text>
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{session.exerciseName}</Text>
                  <Text style={styles.sessionMeta}>
                    {dateStr} at {timeStr} · {session.durationSeconds}s
                  </Text>
                  <View style={styles.sessionStats}>
                    <Text style={styles.sessionStat}>
                      {session.notesHit}/{session.totalNotes} notes
                    </Text>
                    <Text style={styles.sessionType}>{session.type}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Reset Button */}
      <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        <Text style={styles.resetText}>Reset All Progress</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING['2xl'] },
  header: { padding: SPACING.xl, paddingTop: SPACING['2xl'] },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  levelCard: { margin: SPACING.md, borderRadius: BORDER_RADIUS.xl, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary + '40' },
  levelCardInner: { padding: SPACING.lg },
  levelTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  levelTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.text },
  xpTotal: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  levelIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary + '30', alignItems: 'center', justifyContent: 'center' },
  levelEmoji: { fontSize: 28 },
  xpBar: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginBottom: SPACING.xs },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  xpLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  maxLevel: { fontSize: FONTS.sizes.sm, color: COLORS.success, fontWeight: FONTS.weights.semibold },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, paddingHorizontal: SPACING.md, marginTop: SPACING.md, marginBottom: SPACING.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  statCard: { width: '30%', flex: 1, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, textAlign: 'center' },
  sessionList: { paddingHorizontal: SPACING.md, gap: SPACING.sm },
  sessionCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, flexDirection: 'row', gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  sessionAccuracyBar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sessionAccuracy: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.text },
  sessionMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  sessionStats: { flexDirection: 'row', gap: SPACING.sm, marginTop: 4 },
  sessionStat: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  sessionType: { fontSize: FONTS.sizes.xs, color: COLORS.primary, fontWeight: FONTS.weights.medium },
  emptyCard: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center' },
  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: SPACING.xl, gap: SPACING.sm, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.danger + '50' },
  resetText: { fontSize: FONTS.sizes.sm, color: COLORS.danger, fontWeight: FONTS.weights.medium },
});
