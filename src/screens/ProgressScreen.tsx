import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, clearProgress, UserProgress, levelInfo, getGems, getAchievements, ACHIEVEMENT_DEFS, getCalendarData } from '../utils/storage';

export default function ProgressScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [gems, setGems] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [calDays, setCalDays] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    const [p, g, a, c] = await Promise.all([loadProgress(), getGems(), getAchievements(), getCalendarData(8)]);
    setProgress(p); setGems(g); setEarned(a.map(x => x.id)); setCalDays(c);
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));
  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const handleReset = () => {
    Alert.alert('Reset Progress', 'Delete all training history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => { await clearProgress(); fetch(); } },
    ]);
  };

  const li = progress ? levelInfo(progress.xp) : null;

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <Text style={styles.subtitle}>💎 {gems} gems · {li?.emoji} {li?.label}</Text>
      </LinearGradient>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        {[
          { label: 'Sessions', value: progress?.totalSessions || 0, icon: '🎵' },
          { label: 'Minutes', value: progress?.totalMinutes || 0, icon: '⏱' },
          { label: 'Streak', value: `${progress?.currentStreak || 0}🔥`, icon: '' },
          { label: 'Accuracy', value: `${progress?.avgAccuracy || 0}%`, icon: '🎯' },
          { label: 'XP', value: progress?.xp || 0, icon: '⭐' },
          { label: 'Exercises', value: progress?.completedIds?.length || 0, icon: '✅' },
        ].map(s => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statValue}>{s.icon} {s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar heatmap */}
      {calDays.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.calGrid}>
            {calDays.slice(-42).map((d, i) => (
              <View key={i} style={[styles.calDay, {
                backgroundColor: d.xp > 200 ? COLORS.success : d.xp > 50 ? COLORS.success + '88' : d.xp > 0 ? COLORS.success + '44' : COLORS.surface,
                borderColor: d.isToday ? COLORS.primary : 'transparent',
                borderWidth: d.isToday ? 2 : 0,
              }]} />
            ))}
          </View>
        </View>
      )}

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements ({earned.length}/{ACHIEVEMENT_DEFS.length})</Text>
        <View style={styles.achieveGrid}>
          {ACHIEVEMENT_DEFS.map(a => {
            const isEarned = earned.includes(a.id);
            return (
              <View key={a.id} style={[styles.achieveCard, !isEarned && { opacity: 0.3 }]}>
                <Text style={{ fontSize: 24 }}>{a.icon}</Text>
                <Text style={styles.achieveName}>{a.name}</Text>
                <Text style={styles.achieveDesc}>{a.desc}</Text>
                <Text style={styles.achieveGems}>💎 {a.gems}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent sessions */}
      {progress && progress.sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {progress.sessions.slice(0, 10).map((s, i) => (
            <View key={i} style={styles.sessionRow}>
              <Text style={styles.sessionName}>{s.exerciseName}</Text>
              <Text style={styles.sessionAcc}>{s.accuracy}%</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        <Text style={styles.resetText}>Reset All Progress</Text>
      </TouchableOpacity>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 60, paddingBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  title: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.md, gap: SPACING.sm },
  statCard: { width: '30%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.sm },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  calDay: { width: 16, height: 16, borderRadius: 3 },
  achieveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  achieveCard: { width: '30%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  achieveName: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.text, marginTop: 4, textAlign: 'center' },
  achieveDesc: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  achieveGems: { fontSize: 10, color: COLORS.warning, marginTop: 2 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sessionName: { fontSize: FONTS.sizes.sm, color: COLORS.text },
  sessionAcc: { fontSize: FONTS.sizes.sm, color: COLORS.primaryLight, fontWeight: FONTS.weights.bold },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.xl, padding: SPACING.md },
  resetText: { color: COLORS.danger, fontSize: FONTS.sizes.sm },
});
