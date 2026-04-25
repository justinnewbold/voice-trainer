import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, clearProgress, UserProgress, levelInfo, getGems, getAchievements, ACHIEVEMENT_DEFS, getCalendarData, getBests, SessionResult, deleteSession, loadRangeHistory, RangeSnapshot } from '../utils/storage';
import VocalRangeHistory from '../components/VocalRangeHistory';
import SwipeableRow from '../components/SwipeableRow';
import { A11Y } from '../hooks/useAccessibility';
import { ScreenErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonCard, SkeletonProgressBar, SkeletonBarChart, SkeletonAchievementRows } from '../components/Skeleton';
import EmptyState, { EmptySessionHistory, EmptyAchievements, EmptyVocalRange } from '../components/EmptyState';

export default function ProgressScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [gems, setGems] = useState(0);
  const [earned, setEarned] = useState<string[]>([]);
  const [calDays, setCalDays] = useState<any[]>([]);
  const [bests, setBests] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [rangeHistory, setRangeHistory] = useState<RangeSnapshot[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'achievements' | 'range'>('overview');
  const [loading, setLoading] = useState(true);
  const { width: screenWidth } = useWindowDimensions();

  const fetch = useCallback(async () => {
    const [p, g, a, c, b, rh] = await Promise.all([loadProgress(), getGems(), getAchievements(), getCalendarData(8), getBests(), loadRangeHistory()]);
    setProgress(p); setGems(g); setEarned(a.map(x => x.id)); setCalDays(c); setBests(b); setRangeHistory(rh);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));
  const onRefresh = async () => { setRefreshing(true); await fetch(); setRefreshing(false); };

  const li = progress ? levelInfo(progress.xp) : null;

  const accuracy7Day = () => {
    if (!progress?.sessions) return [];
    const days: Record<string, number[]> = {};
    const now = Date.now();
    for (let i = 6; i >= 0; i--) { const d = new Date(now - i * 86400000).toDateString(); days[d] = []; }
    progress.sessions.forEach(s => { const d = new Date(s.date).toDateString(); if (d in days) days[d].push(s.accuracy); });
    return Object.entries(days).map(([date, accs]) => ({
      date: new Date(date).toLocaleDateString('en', { weekday: 'short' }),
      avg: accs.length > 0 ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : 0,
      count: accs.length,
    }));
  };

  const weekData = accuracy7Day();
  const maxAcc = Math.max(...weekData.map(d => d.avg), 1);

  // Find the next achievement to unlock (first unearned one)
  const nextAchievement = ACHIEVEMENT_DEFS.find(def => !earned.includes(def.id));

  // Estimate progress toward next achievement (for numeric checks)
  function getNextAchievementProgress(): { current: number; target: number } | null {
    if (!nextAchievement || !progress) return null;
    // Map achievement id patterns to progress values
    if (nextAchievement.id.startsWith('sessions_')) {
      const target = parseInt(nextAchievement.id.split('_')[1]);
      return { current: progress.totalSessions, target };
    }
    if (nextAchievement.id.startsWith('streak_')) {
      const target = parseInt(nextAchievement.id.split('_')[1]);
      return { current: progress.currentStreak, target };
    }
    if (nextAchievement.id.startsWith('xp_')) {
      const target = parseInt(nextAchievement.id.split('_')[1]);
      return { current: progress.xp, target };
    }
    if (nextAchievement.id === 'songs_5') {
      return { current: progress.completedIds.filter(id => id.startsWith('s')).length, target: 5 };
    }
    if (nextAchievement.id === 'all_beginner') {
      return { current: ['b1','b2','b3','b4','b5'].filter(id => progress.completedIds.includes(id)).length, target: 5 };
    }
    return null;
  }

  const nextProgress = getNextAchievementProgress();

  if (loading) {
    return (
      <ScreenErrorBoundary>
        <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16, paddingTop: 56 }}>
          <SkeletonCard lines={1} />
          <View style={{ marginTop: 12 }}>
            <SkeletonProgressBar />
          </View>
          <View style={{ marginTop: 12 }}>
            <SkeletonBarChart />
          </View>
          <View style={{ marginTop: 12 }}>
            <SkeletonAchievementRows count={4} />
          </View>
        </View>
      </ScreenErrorBoundary>
    );
  }

  return (
    <ScreenErrorBoundary>
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>📊 Progress</Text>
        <Text style={styles.subtitle}>💎 {gems} gems · {li?.emoji} {li?.label}</Text>
      </LinearGradient>

      <View style={styles.tabRow}>
        {(['overview', 'sessions', 'achievements', 'range'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]} onPress={() => setActiveTab(t)}>
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t === 'range' ? 'Range' : t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'overview' && (
        <>
          <View style={styles.statsGrid}>
            {[
              { label: 'Sessions', value: progress?.totalSessions || 0, icon: '🎵' },
              { label: 'Minutes', value: progress?.totalMinutes || 0, icon: '⏱' },
              { label: 'Streak', value: `${progress?.currentStreak || 0}🔥`, icon: '' },
              { label: 'Best Streak', value: `${progress?.longestStreak || 0}`, icon: '🏆' },
              { label: 'Accuracy', value: `${progress?.avgAccuracy || 0}%`, icon: '🎯' },
              { label: 'XP', value: progress?.xp || 0, icon: '⭐' },
            ].map(s => (
              <View key={s.label} style={styles.statCard}>
                <Text style={styles.statValue}>{s.icon} {s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          {li && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Level Progress</Text>
              <View style={styles.levelRow}>
                <Text style={styles.levelLabel}>{li.emoji} {li.label}</Text>
                {li.next && <Text style={styles.levelNext}>{li.next} →</Text>}
              </View>
              <View style={styles.levelBar}>
                <View style={[styles.levelFill, { width: li.needed > 0 ? `${Math.min(100, (li.current / li.needed) * 100)}%` : '100%' }]} />
              </View>
              <Text style={styles.levelXp}>{progress?.xp} XP {li.next ? `• ${li.needed - li.current} to ${li.next}` : '• Max Level!'}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Accuracy</Text>
            <View style={styles.barChart}>
              {weekData.map((d, i) => (
                <View key={i} style={styles.barItem}>
                  <Text style={styles.barValue}>{d.avg > 0 ? `${d.avg}%` : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${(d.avg / maxAcc) * 100}%`, backgroundColor: d.avg >= 80 ? COLORS.success : d.avg >= 60 ? COLORS.warning : d.avg > 0 ? COLORS.danger : '#2A2A50' }]} />
                  </View>
                  <Text style={styles.barDay}>{d.date}</Text>
                  <Text style={styles.barSessions}>{d.count > 0 ? `${d.count}x` : ''}</Text>
                </View>
              ))}
            </View>
          </View>

          {calDays.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Activity Calendar</Text>
              <View style={styles.calGrid}>
                {calDays.map((d, i) => {
                  const intensity = d.xp === 0 ? 0 : d.xp < 50 ? 1 : d.xp < 100 ? 2 : d.xp < 200 ? 3 : 4;
                  const colors = ['#1E1E3A', '#2d1f6e', '#4c35b5', '#7c6af7', '#a78bfa'];
                  return <View key={i} style={[styles.calDay, { backgroundColor: colors[intensity] }, d.isToday && styles.calDayToday]} />;
                })}
              </View>
              <View style={styles.calLegend}>
                <Text style={styles.calLegendText}>Less</Text>
                {['#1E1E3A', '#2d1f6e', '#4c35b5', '#7c6af7', '#a78bfa'].map((c, i) => (
                  <View key={i} style={[styles.calLegendDot, { backgroundColor: c }]} />
                ))}
                <Text style={styles.calLegendText}>More</Text>
              </View>
            </View>
          )}
        </>
      )}

      {activeTab === 'sessions' && (
        <View style={styles.sectionFlat}>
          <Text style={styles.sectionTitle}>{progress?.sessions?.length || 0} Total Sessions</Text>
          {(!progress?.sessions || progress.sessions.length === 0) && (
            <EmptySessionHistory />
          )}
          {progress?.sessions?.map(s => (
            <SwipeableRow
              key={s.id}
              onDelete={async () => {
                await deleteSession(s.id);
                fetch();
              }}
              confirmMessage={`Delete "${s.exerciseName}" session?`}
            >
              <TouchableOpacity
                style={styles.sessionRow}
                onPress={() => setSelectedSession(s)}
                {...A11Y.sessionItem(
                  s.exerciseName,
                  s.accuracy,
                  new Date(s.date).toLocaleDateString()
                )}
              >
                <View style={styles.sessionIcon}><Text>{s.type === 'song' ? '🎶' : s.type === 'warmup' ? '🔥' : '🎵'}</Text></View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{s.exerciseName}</Text>
                  <Text style={styles.sessionMeta}>{new Date(s.date).toLocaleDateString()} {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {Math.floor(s.duration / 60)}m {s.duration % 60}s</Text>
                </View>
                <View style={styles.sessionRight}>
                  <View style={[styles.accBadge, { backgroundColor: s.accuracy >= 80 ? COLORS.success + '33' : s.accuracy >= 60 ? COLORS.warning + '33' : COLORS.danger + '33' }]}>
                    <Text style={[styles.accText, { color: s.accuracy >= 80 ? COLORS.success : s.accuracy >= 60 ? COLORS.warning : COLORS.danger }]}>{s.accuracy}%</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                </View>
              </TouchableOpacity>
            </SwipeableRow>
          ))}
        </View>
      )}

      {activeTab === 'achievements' && (
        <View style={styles.sectionFlat}>
          <Text style={styles.sectionTitle}>{earned.length} / {ACHIEVEMENT_DEFS.length} Earned</Text>
          <View style={styles.achieveProgress}>
            <View style={[styles.achieveFill, { width: `${(earned.length / ACHIEVEMENT_DEFS.length) * 100}%` }]} />
          </View>

          {/* Next to unlock highlight card */}
          {nextAchievement && (
            <View style={styles.nextAchieveCard}>
              <View style={styles.nextAchieveHeader}>
                <Text style={styles.nextAchieveBadge}>⬆ Up Next</Text>
              </View>
              <View style={styles.nextAchieveRow}>
                <Text style={styles.nextAchieveIcon}>{nextAchievement.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextAchieveName}>{nextAchievement.name}</Text>
                  <Text style={styles.nextAchieveDesc}>{nextAchievement.desc}</Text>
                  {nextProgress && (
                    <>
                      <View style={styles.nextProgressBar}>
                        <View style={[styles.nextProgressFill, { width: `${Math.min(100, (nextProgress.current / nextProgress.target) * 100)}%` }]} />
                      </View>
                      <Text style={styles.nextProgressText}>{nextProgress.current} / {nextProgress.target}</Text>
                    </>
                  )}
                </View>
                <View style={styles.nextAchieveReward}>
                  <Text style={styles.nextAchieveGems}>💎 {nextAchievement.gems}</Text>
                </View>
              </View>
            </View>
          )}

          {ACHIEVEMENT_DEFS.map(def => {
            const isEarned = earned.includes(def.id);
            const isNext = nextAchievement?.id === def.id;
            return (
              <View key={def.id} style={[styles.achieveRow, !isEarned && !isNext && styles.achieveRowLocked]}>
                <Text style={styles.achieveIcon}>{def.icon}</Text>
                <View style={styles.achieveInfo}>
                  <Text style={[styles.achieveName, !isEarned && { color: COLORS.textSecondary }]}>{def.name}</Text>
                  <Text style={styles.achieveDesc}>{def.desc}</Text>
                </View>
                <View style={styles.achieveGems}>
                  {isEarned
                    ? <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
                    : <Text style={styles.achieveGemsText}>💎 {def.gems}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {activeTab === 'range' && (
        <View style={styles.sectionFlat}>
          <Text style={styles.sectionTitle}>Vocal Range Over Time</Text>
          <View style={styles.rangeContainer}>
            <VocalRangeHistory history={rangeHistory} width={screenWidth - 64} />
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />

      <Modal visible={!!selectedSession} transparent animationType="slide" onRequestClose={() => setSelectedSession(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedSession?.exerciseName}</Text>
              <TouchableOpacity onPress={() => setSelectedSession(null)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {selectedSession && (
              <>
                <View style={styles.modalStats}>
                  <View style={styles.modalStat}><Text style={styles.modalStatVal}>{selectedSession.accuracy}%</Text><Text style={styles.modalStatLabel}>Accuracy</Text></View>
                  <View style={styles.modalStat}><Text style={styles.modalStatVal}>{Math.floor(selectedSession.duration / 60)}m {selectedSession.duration % 60}s</Text><Text style={styles.modalStatLabel}>Duration</Text></View>
                  {selectedSession.score != null && <View style={styles.modalStat}><Text style={styles.modalStatVal}>{selectedSession.score}</Text><Text style={styles.modalStatLabel}>Score</Text></View>}
                  {selectedSession.notesHit != null && <View style={styles.modalStat}><Text style={styles.modalStatVal}>{selectedSession.notesHit}/{selectedSession.totalNotes}</Text><Text style={styles.modalStatLabel}>Notes Hit</Text></View>}
                </View>
                <Text style={styles.modalDate}>Completed {new Date(selectedSession.date).toLocaleDateString()} at {new Date(selectedSession.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <View style={[styles.accBadgeLarge, { backgroundColor: selectedSession.accuracy >= 80 ? COLORS.success + '22' : selectedSession.accuracy >= 60 ? COLORS.warning + '22' : COLORS.danger + '22' }]}>
                  <Text style={[styles.accTextLarge, { color: selectedSession.accuracy >= 80 ? COLORS.success : selectedSession.accuracy >= 60 ? COLORS.warning : COLORS.danger }]}>
                    {selectedSession.accuracy >= 90 ? '🌟 Excellent!' : selectedSession.accuracy >= 80 ? '🎯 Great job!' : selectedSession.accuracy >= 60 ? '💪 Keep going!' : '🔄 More practice needed'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: SPACING.lg },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted },
  tabRow: { flexDirection: 'row', margin: 16, marginBottom: 8, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  statCard: { width: '30%', flex: undefined, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  statLabel: { fontSize: 11, color: COLORS.textMuted },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionFlat: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  emptyText: { color: COLORS.textMuted, textAlign: 'center', padding: 20 },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  levelLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  levelNext: { fontSize: 13, color: COLORS.textSecondary },
  levelBar: { height: 10, backgroundColor: '#2A2A50', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  levelFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 5 },
  levelXp: { fontSize: 12, color: COLORS.textMuted },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4 },
  barItem: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 9, color: COLORS.textMuted, marginBottom: 2 },
  barTrack: { flex: 1, width: '80%', backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 3 },
  barDay: { fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
  barSessions: { fontSize: 9, color: COLORS.textMuted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  calDay: { width: 12, height: 12, borderRadius: 2 },
  calDayToday: { borderWidth: 1, borderColor: COLORS.primaryLight },
  calLegend: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, justifyContent: 'flex-end' },
  calLegendText: { fontSize: 10, color: COLORS.textMuted },
  calLegendDot: { width: 10, height: 10, borderRadius: 2 },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A50' },
  sessionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E1E3A', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  sessionMeta: { fontSize: 11, color: COLORS.textMuted },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  accBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  accText: { fontSize: 12, fontWeight: '700' },
  accBadgeLarge: { padding: 14, borderRadius: BORDER_RADIUS.md, alignItems: 'center', marginTop: 12 },
  accTextLarge: { fontSize: 16, fontWeight: '700' },
  achieveProgress: { height: 6, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  achieveFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  // Next achievement highlight
  nextAchieveCard: { backgroundColor: '#1a1030', borderRadius: BORDER_RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primaryLight + '66', padding: 14, marginBottom: 14 },
  nextAchieveHeader: { marginBottom: 8 },
  nextAchieveBadge: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  nextAchieveRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nextAchieveIcon: { fontSize: 28 },
  nextAchieveName: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  nextAchieveDesc: { fontSize: 12, color: COLORS.textMuted, marginBottom: 6 },
  nextProgressBar: { height: 6, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden', marginBottom: 3 },
  nextProgressFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 3 },
  nextProgressText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  nextAchieveReward: { alignItems: 'center' },
  nextAchieveGems: { fontSize: 13, color: '#f9a8d4', fontWeight: '700' },
  achieveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A50' },
  achieveRowLocked: { opacity: 0.4 },
  achieveIcon: { fontSize: 22, marginRight: 12 },
  achieveInfo: { flex: 1 },
  achieveName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  achieveDesc: { fontSize: 12, color: COLORS.textMuted },
  achieveGems: { alignItems: 'flex-end' },
  achieveGemsText: { fontSize: 12, color: '#f9a8d4' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#13132A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, borderTopWidth: 1, borderTopColor: '#2A2A50' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, flex: 1 },
  modalStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  modalStat: { alignItems: 'center' },
  modalStatVal: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  modalStatLabel: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rangeContainer: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  modalDate: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', marginBottom: 12 },
});
