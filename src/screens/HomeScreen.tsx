import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, UserProgress, levelInfo, getGems, getDailyProgress, getDailyChallengeStatus, markDailyChallengeComplete, loadSettings } from '../utils/storage';
import { getDailyChallenge, EXERCISES, SONG_MELODIES } from '../utils/scales';

export default function HomeScreen() {
  const router = useRouter();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [gems, setGems] = useState(0);
  const [daily, setDaily] = useState<any>(null);
  const [challengeStatus, setChallengeStatus] = useState({ completedToday: false, totalCompleted: 0 });
  const [settings, setSettings] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  const fetchData = useCallback(async () => {
    const [p, g, d, cs, s] = await Promise.all([
      loadProgress(), getGems(), getDailyProgress(), getDailyChallengeStatus(), loadSettings()
    ]);
    setProgress(p); setGems(g); setDaily(d); setChallengeStatus(cs); setSettings(s);
    if (!s.notificationsEnabled && p.totalSessions >= 2) setShowNotifPrompt(true);
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const li = progress ? levelInfo(progress.xp) : null;
  const xpProgress = li ? (li.needed > 0 ? li.current / li.needed : 1) : 0;

  const dailyChallenge = getDailyChallenge();
  const challengeExercise = dailyChallenge.type === 'scale'
    ? EXERCISES.find(e => e.id === dailyChallenge.exerciseId)
    : SONG_MELODIES.find(s => s.id === dailyChallenge.exerciseId);

  const goalXP = settings?.dailyGoalXP || 100;
  const dailyXP = daily?.xp || 0;
  const goalProgress = Math.min(1, dailyXP / goalXP);

  const handleEnableNotifs = async () => {
    if (Platform.OS === 'web' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') new Notification('Voice Trainer 🎤', { body: 'Daily practice reminders are on!' });
    }
    setShowNotifPrompt(false);
  };

  const quickActions = [
    { label: 'Warmup', icon: 'flame' as const, color: '#f97316', route: '/(tabs)/warmup', desc: 'Prep your voice' },
    { label: 'Pitch', icon: 'mic' as const, color: COLORS.primary, route: '/(tabs)/pitch', desc: 'Real-time pitch' },
    { label: 'Key', icon: 'musical-note' as const, color: '#f59e0b', route: '/(tabs)/key', desc: 'Find your key' },
    { label: 'Scales', icon: 'musical-notes' as const, color: '#06b6d4', route: '/(tabs)/scales', desc: 'Guided exercises' },
    { label: 'Songs', icon: 'headset' as const, color: '#ec4899', route: '/(tabs)/songs', desc: '25 songs' },
    { label: 'Coach', icon: 'chatbubble-ellipses' as const, color: '#a78bfa', route: '/(tabs)/coach', desc: 'AI vocal coaching' },
  ];

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Voice Trainer</Text>
            <Text style={styles.subtitle}>{li ? `${li.emoji} ${li.label}` : 'Welcome!'}</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.gemsContainer}><Text style={styles.gemsText}>💎 {gems}</Text></View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/settings')} style={styles.settingsBtn}>
              <Ionicons name="settings-outline" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {progress && li && (
          <View style={styles.xpContainer}>
            <View style={styles.xpBar}>
              <View style={[styles.xpFill, { width: `${Math.min(100, xpProgress * 100)}%` }]} />
            </View>
            <Text style={styles.xpText}>{progress.xp} XP{li.next ? ` • ${li.needed - li.current} to ${li.next}` : ' • Max Level!'}</Text>
          </View>
        )}

        <View style={styles.statsStrip}>
          {[
            { val: `${progress?.currentStreak || 0}🔥`, lab: 'Streak' },
            { val: progress?.totalSessions || 0, lab: 'Sessions' },
            { val: `${progress?.avgAccuracy || 0}%`, lab: 'Accuracy' },
            { val: progress?.totalMinutes || 0, lab: 'Minutes' },
          ].map((s, i) => (
            <React.Fragment key={s.lab}>
              {i > 0 && <View style={styles.statDivider} />}
              <View style={styles.statItem}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLab}>{s.lab}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>

      {/* Daily Goal */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Today's Goal</Text>
          <Text style={styles.goalXpText}>{dailyXP} / {goalXP} XP</Text>
        </View>
        <View style={styles.goalBar}>
          <View style={[styles.goalFill, { width: `${goalProgress * 100}%`, backgroundColor: goalProgress >= 1 ? COLORS.success : COLORS.primary }]} />
        </View>
        {goalProgress >= 1 && <Text style={styles.goalComplete}>🎉 Daily goal complete!</Text>}
        <Text style={styles.goalSessions}>{daily?.sessions || 0} sessions today</Text>
      </View>

      {/* Daily Challenge */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Daily Challenge</Text>
        {challengeExercise && (
          <TouchableOpacity
            style={[styles.challengeCard, challengeStatus.completedToday && styles.challengeCardDone]}
            onPress={() => router.push(dailyChallenge.type === 'scale' ? '/(tabs)/scales' : '/(tabs)/songs')}
            disabled={challengeStatus.completedToday}
          >
            <View style={styles.challengeLeft}>
              <Text style={styles.challengeTitle}>{dailyChallenge.title}</Text>
              <Text style={styles.challengeDesc}>{dailyChallenge.desc}</Text>
              <Text style={styles.challengeSong}>🎵 {challengeExercise.name}</Text>
            </View>
            <View style={styles.challengeRight}>
              {challengeStatus.completedToday ? (
                <View style={styles.challengeDoneBadge}>
                  <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
                  <Text style={styles.challengeDoneText}>Done!</Text>
                </View>
              ) : (
                <View style={styles.challengeReward}>
                  <Text style={styles.challengeXp}>+{dailyChallenge.bonusXp} XP</Text>
                  <Text style={styles.challengeGems}>💎 +{dailyChallenge.bonusGems}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.challengeStreak}>🏆 {challengeStatus.totalCompleted} challenges completed all time</Text>
      </View>

      {/* Notification Prompt */}
      {showNotifPrompt && (
        <View style={styles.notifPrompt}>
          <View style={styles.notifLeft}>
            <Text style={styles.notifIcon}>🔔</Text>
            <View>
              <Text style={styles.notifTitle}>Stay on track</Text>
              <Text style={styles.notifSub}>Enable daily practice reminders</Text>
            </View>
          </View>
          <View style={styles.notifBtns}>
            <TouchableOpacity onPress={() => setShowNotifPrompt(false)} style={styles.notifDismiss}>
              <Text style={styles.notifDismissText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEnableNotifs} style={styles.notifEnable}>
              <Text style={styles.notifEnableText}>Enable</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Start</Text>
        <View style={styles.quickGrid}>
          {quickActions.map(a => (
            <TouchableOpacity key={a.label} style={styles.quickCard} onPress={() => router.push(a.route as any)}>
              <View style={[styles.quickIconWrap, { backgroundColor: a.color + '22' }]}>
                <Ionicons name={a.icon} size={24} color={a.color} />
              </View>
              <Text style={styles.quickLabel}>{a.label}</Text>
              <Text style={styles.quickDesc}>{a.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Sessions */}
      {progress?.sessions && progress.sessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Sessions</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/progress')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {progress.sessions.slice(0, 3).map((s) => (
            <View key={s.id} style={styles.sessionRow}>
              <View style={styles.sessionIcon}>
                <Text>{s.type === 'song' ? '🎶' : s.type === 'warmup' ? '🔥' : '🎵'}</Text>
              </View>
              <View style={styles.sessionInfo}>
                <Text style={styles.sessionName}>{s.exerciseName}</Text>
                <Text style={styles.sessionMeta}>{new Date(s.date).toLocaleDateString()} • {Math.floor(s.duration / 60)}m {s.duration % 60}s</Text>
              </View>
              <View style={[styles.accBadge, { backgroundColor: s.accuracy >= 80 ? COLORS.success + '33' : s.accuracy >= 60 ? COLORS.warning + '33' : COLORS.danger + '33' }]}>
                <Text style={[styles.accText, { color: s.accuracy >= 80 ? COLORS.success : s.accuracy >= 60 ? COLORS.warning : COLORS.danger }]}>{s.accuracy}%</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: SPACING.lg },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 26, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  gemsContainer: { backgroundColor: 'rgba(124,106,247,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,106,247,0.4)' },
  gemsText: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },
  settingsBtn: { padding: 4 },
  xpContainer: { marginBottom: 16 },
  xpBar: { height: 8, backgroundColor: '#2A2A50', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  xpText: { fontSize: 12, color: COLORS.textMuted },
  statsStrip: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: BORDER_RADIUS.md, padding: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  statLab: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#2A2A50' },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  seeAll: { fontSize: 13, color: COLORS.primary },
  goalXpText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  goalBar: { height: 10, backgroundColor: '#2A2A50', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  goalFill: { height: '100%', borderRadius: 5 },
  goalComplete: { fontSize: 13, color: COLORS.success, fontWeight: '600', marginBottom: 2 },
  goalSessions: { fontSize: 12, color: COLORS.textMuted },
  challengeCard: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#7c6af755', marginBottom: 8 },
  challengeCardDone: { borderColor: COLORS.success + '55', opacity: 0.7 },
  challengeLeft: { flex: 1 },
  challengeTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  challengeDesc: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  challengeSong: { fontSize: 13, color: COLORS.primaryLight },
  challengeRight: { alignItems: 'center' },
  challengeDoneBadge: { alignItems: 'center' },
  challengeDoneText: { fontSize: 11, color: COLORS.success, marginTop: 2, fontWeight: '600' },
  challengeReward: { alignItems: 'center', backgroundColor: '#2A1A5E', borderRadius: 10, padding: 8 },
  challengeXp: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight },
  challengeGems: { fontSize: 12, color: '#f9a8d4' },
  challengeStreak: { fontSize: 12, color: COLORS.textMuted },
  notifPrompt: { margin: 16, marginBottom: 0, backgroundColor: '#1a1030', borderRadius: BORDER_RADIUS.lg, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#7c6af755' },
  notifLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  notifIcon: { fontSize: 24 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  notifSub: { fontSize: 12, color: COLORS.textMuted },
  notifBtns: { flexDirection: 'row', gap: 8 },
  notifDismiss: { paddingHorizontal: 12, paddingVertical: 6 },
  notifDismissText: { fontSize: 13, color: COLORS.textMuted },
  notifEnable: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: COLORS.primary, borderRadius: 20 },
  notifEnableText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: { width: '30%', flex: undefined, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: '#2A2A50' },
  quickIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  quickDesc: { fontSize: 10, color: COLORS.textMuted },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#2A2A50' },
  sessionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A2A50', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  sessionMeta: { fontSize: 12, color: COLORS.textMuted },
  accBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  accText: { fontSize: 13, fontWeight: '700' },
});
