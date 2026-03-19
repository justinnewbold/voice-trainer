import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, UserProgress, levelInfo, getGems, getDailyProgress } from '../utils/storage';

export default function HomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [gems, setGems] = useState(0);
  const [daily, setDaily] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [p, g, d] = await Promise.all([loadProgress(), getGems(), getDailyProgress()]);
    setProgress(p);
    setGems(g);
    setDaily(d);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const li = progress ? levelInfo(progress.xp) : null;
  const xpProgress = li ? (li.needed > 0 ? li.current / li.needed : 1) : 0;

  const quickActions = [
    { label: 'Warmup', icon: 'flame' as const, color: '#f97316', route: '/(tabs)/warmup', desc: 'Breathing & vocal prep' },
    { label: 'Pitch', icon: 'mic' as const, color: COLORS.primary, route: '/(tabs)/pitch', desc: 'Real-time detection' },
    { label: 'Scales', icon: 'musical-notes' as const, color: '#06b6d4', route: '/(tabs)/scales', desc: 'Guided exercises' },
    { label: 'Songs', icon: 'headset' as const, color: '#ec4899', route: '/(tabs)/songs', desc: 'Match melodies' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Voice Trainer</Text>
            <Text style={styles.subtitle}>{li ? `${li.emoji} ${li.label}` : 'Welcome!'}</Text>
          </View>
          <View style={styles.gemsContainer}>
            <Text style={styles.gemsText}>💎 {gems}</Text>
          </View>
        </View>

        {/* XP bar */}
        {progress && li && (
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min(100, xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpText}>{progress.xp} XP{li.next ? ` • ${li.needed - li.current} to ${li.next}` : ''}</Text>
          </View>
        )}

        {/* Streak / Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress?.currentStreak || 0}🔥</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress?.totalSessions || 0}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress?.avgAccuracy || 0}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{progress?.totalMinutes || 0}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Daily Goal */}
      {daily && (
        <View style={styles.dailyCard}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          <View style={styles.dailyBar}>
            <View style={[styles.dailyFill, { width: `${Math.min(100, (daily.xp / 100) * 100)}%` }]} />
          </View>
          <Text style={styles.dailyText}>{daily.xp} / 100 XP today • {daily.sessions} sessions</Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Train</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.route as any)} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingTop: 60, borderBottomLeftRadius: BORDER_RADIUS.xl, borderBottomRightRadius: BORDER_RADIUS.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  greeting: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.primaryLight, marginTop: 2 },
  gemsContainer: { backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  gemsText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.text },
  xpContainer: { marginBottom: SPACING.md },
  xpBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  xpText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  dailyCard: { margin: SPACING.md, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md },
  dailyBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
  dailyFill: { height: '100%', backgroundColor: COLORS.success, borderRadius: 3 },
  dailyText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 4 },
  section: { paddingHorizontal: SPACING.md, marginTop: SPACING.sm },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.sm },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  actionCard: { width: '48%', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  actionDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
});
