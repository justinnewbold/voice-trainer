import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useAuthContextSafe } from '../auth/AuthContext';
import { isSupabaseConfigured } from '../auth/supabaseClient';
import { fullSync } from '../auth/syncService';
import { useRouter } from 'expo-router';
import { loadSettings, saveSettings, clearProgress, loadVocalRange, loadProgress, AppSettings, defaultSettings } from '../utils/storage';
import {
  loadStreakProtection, type StreakProtectionState,
  MAX_FREEZES, FREEZE_AWARD_INTERVAL,
} from '../utils/streakProtection';
import { useNotifications } from '../hooks/useNotifications';

const THEMES = [
  { id: 'dark', label: 'Dark', color: '#0A0A1A', accent: '#7c6af7' },
  { id: 'purple', label: 'Purple', color: '#1a0a2e', accent: '#a78bfa' },
  { id: 'midnight', label: 'Midnight', color: '#050510', accent: '#818cf8' },
] as const;

const REMINDER_HOURS = [
  { value: 7, label: '7:00 AM' }, { value: 9, label: '9:00 AM' },
  { value: 12, label: '12:00 PM' }, { value: 15, label: '3:00 PM' },
  { value: 18, label: '6:00 PM' }, { value: 20, label: '8:00 PM' },
  { value: 21, label: '9:00 PM' },
];

const DAILY_GOALS = [
  { value: 50, label: '50 XP — Light' },
  { value: 100, label: '100 XP — Regular' },
  { value: 200, label: '200 XP — Intense' },
  { value: 300, label: '300 XP — Pro' },
];

export default function SettingsScreen() {
  const auth = useAuthContextSafe();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const handleSync = async () => {
    if (!auth?.user?.id) return;
    setSyncing(true);
    setSyncMsg('');
    const result = await fullSync(auth.user.id);
    setSyncMsg(result.success ? '✅ Synced!' : '❌ Sync failed');
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 3000);
  };

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [vocalRange, setVocalRange] = useState<any>(null);
  const [saved, setSaved] = useState(false);
  const [streakProtection, setStreakProtection] = useState<StreakProtectionState | null>(null);
  const { enable: enableNotifs, disable: disableNotifs, updateBadge } = useNotifications();

  useFocusEffect(useCallback(() => {
    (async () => {
      const [s, r, sp] = await Promise.all([loadSettings(), loadVocalRange(), loadStreakProtection()]);
      setSettings(s);
      setVocalRange(r);
      setStreakProtection(sp);
    })();
  }, []));

  const update = async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveSettings(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const requestNotifications = async () => {
    if (Platform.OS === 'web') {
      // Web: browser Notification API
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          await update({ notificationsEnabled: true });
          new Notification('Voice Trainer', { body: '🎤 Daily practice reminders enabled!' });
        } else {
          Alert.alert('Notifications', 'Please enable notifications in your browser settings.');
        }
      }
    } else {
      // Native: real iOS/Android scheduled notifications
      const progress = await loadProgress();
      const granted = await enableNotifs({
        reminderHour: settings.reminderHour,
        streakCount: progress.currentStreak,
      });
      if (granted) {
        await update({ notificationsEnabled: true });
        // Set badge to streak count
        await updateBadge(progress.currentStreak);
      } else {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications for Voice Trainer in your device Settings.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleDisableNotifications = async () => {
    await disableNotifs();
    await update({ notificationsEnabled: false });
  };

  const handleReminderTimeChange = async (hour: number) => {
    await update({ reminderHour: hour });
    // Reschedule with new time
    if (settings.notificationsEnabled && Platform.OS !== 'web') {
      const progress = await loadProgress();
      await enableNotifs({ reminderHour: hour, streakCount: progress.currentStreak });
    }
  };

  const handleReset = () => {
    Alert.alert('Reset All Progress', 'This will permanently delete all your training data, XP, gems, and achievements. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset Everything', style: 'destructive', onPress: async () => {
        await clearProgress();
        Alert.alert('Done', 'Your progress has been reset.');
      }},
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">⚙️ Settings</Text>
        {saved && <Text style={styles.savedBadge}>✓ Saved</Text>}
      </LinearGradient>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Daily Reminders</Text>
            <Text style={styles.rowSub}>
              {Platform.OS === 'web'
                ? 'Get reminded to practice each day'
                : 'Scheduled iOS notifications at your chosen time'}
            </Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={v => v ? requestNotifications() : handleDisableNotifications()}
            trackColor={{ false: '#2A2A50', true: COLORS.primary }}
            thumbColor="#fff"
            accessibilityLabel="Enable daily practice reminders"
          />
        </View>
        {settings.notificationsEnabled && (
          <View style={styles.subSection}>
            <Text style={styles.subLabel}>Reminder time</Text>
            <View style={styles.chipRow}>
              {REMINDER_HOURS.map(h => (
                <TouchableOpacity key={h.value}
                  style={[styles.chip, settings.reminderHour === h.value && styles.chipActive]}
                  onPress={() => handleReminderTimeChange(h.value)}
                  accessibilityLabel={`Set reminder to ${h.label}`}
                  accessibilityState={{ selected: settings.reminderHour === h.value }}>
                  <Text style={[styles.chipText, settings.reminderHour === h.value && styles.chipTextActive]}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {Platform.OS !== 'web' && (
              <Text style={styles.nativeHint}>
                🔔 Notifications will fire even when the app is closed
              </Text>
            )}
          </View>
        )}
      </View>

      {/* App Icon Badge */}
      {Platform.OS !== 'web' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📛 App Badge</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowLabel}>Show Streak on Icon</Text>
              <Text style={styles.rowSub}>Your current streak count appears as a badge on the app icon</Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              disabled={true}
              trackColor={{ false: '#2A2A50', true: COLORS.primary }}
              thumbColor="#fff"
              accessibilityLabel="Streak badge on app icon"
            />
          </View>
          <Text style={styles.nativeHint}>
            Badge updates automatically when notifications are enabled
          </Text>
        </View>
      )}

      {/* Daily Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Daily XP Goal</Text>
        {DAILY_GOALS.map(g => (
          <TouchableOpacity key={g.value} style={[styles.row, styles.rowClickable]}
            onPress={() => update({ dailyGoalXP: g.value })}
            accessibilityLabel={`Set daily goal to ${g.label}`}
            accessibilityState={{ selected: settings.dailyGoalXP === g.value }}>
            <Text style={styles.rowLabel}>{g.label}</Text>
            {settings.dailyGoalXP === g.value && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎨 Theme</Text>
        <View style={styles.themeRow}>
          {THEMES.map(t => (
            <TouchableOpacity key={t.id}
              style={[styles.themeCard, settings.theme === t.id && styles.themeCardActive]}
              onPress={() => update({ theme: t.id as any })}
              accessibilityLabel={`${t.label} theme`}
              accessibilityState={{ selected: settings.theme === t.id }}>
              <View style={[styles.themeSwatch, { backgroundColor: t.color, borderColor: t.accent }]} />
              <Text style={[styles.themeLabel, settings.theme === t.id && styles.themeLabelActive]}>{t.label}</Text>
              {settings.theme === t.id && <Ionicons name="checkmark-circle" size={16} color={COLORS.primaryLight} />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Vocal Range */}
      {vocalRange && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎙 Your Vocal Range</Text>
          <View style={styles.rangeCard}>
            <View style={styles.rangeRow}>
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Lowest</Text>
                <Text style={styles.rangeValue}>{vocalRange.lowNote}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Highest</Text>
                <Text style={styles.rangeValue}>{vocalRange.highNote}</Text>
              </View>
              <View style={styles.rangeItem}>
                <Text style={styles.rangeLabel}>Voice Type</Text>
                <Text style={[styles.rangeValue, { color: COLORS.primaryLight }]}>{vocalRange.voiceType}</Text>
              </View>
            </View>
            <Text style={styles.rangeSpan}>{vocalRange.semitones} semitones • Tested {new Date(vocalRange.testedAt).toLocaleDateString()}</Text>
          </View>
        </View>
      )}

      {/* Audio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔊 Audio</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Metronome Volume</Text>
          <Text style={styles.rowValue}>{Math.round(settings.metronomeVolume * 100)}%</Text>
        </View>
        <View style={styles.sliderRow} accessibilityLabel={`Metronome volume: ${Math.round(settings.metronomeVolume * 100)}%`}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <TouchableOpacity key={v} style={[styles.sliderDot, settings.metronomeVolume >= v && styles.sliderDotActive]}
              onPress={() => update({ metronomeVolume: v })}
              accessibilityLabel={`${Math.round(v * 100)}%`} />
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={styles.rowLabel}>Drone Tone Volume</Text>
          <Text style={styles.rowValue}>{Math.round(settings.droneVolume * 100)}%</Text>
        </View>
        <View style={styles.sliderRow} accessibilityLabel={`Drone volume: ${Math.round(settings.droneVolume * 100)}%`}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <TouchableOpacity key={v} style={[styles.sliderDot, settings.droneVolume >= v && styles.sliderDotActive]}
              onPress={() => update({ droneVolume: v })} />
          ))}
        </View>
      </View>

      {/* Streak Protection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>❄️ Streak Protection</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Streak Freezes</Text>
            <Text style={styles.rowSub}>
              Earn 1 freeze every {FREEZE_AWARD_INTERVAL}-day streak (max {MAX_FREEZES}). Auto-protects missed days.
            </Text>
          </View>
          <View style={spStyles.freezeBadge}>
            <Text style={spStyles.freezeBadgeText}>
              {streakProtection?.freezeCount ?? 0} / {MAX_FREEZES}
            </Text>
          </View>
        </View>
        {streakProtection && streakProtection.history.length > 0 && (
          <View style={spStyles.historyBox}>
            <Text style={spStyles.historyLabel}>Recent activity</Text>
            {streakProtection.history.slice(0, 3).map((h, i) => (
              <View key={i} style={spStyles.historyRow}>
                <Text style={spStyles.historyType}>
                  {h.type === 'freeze' ? '❄️ Freeze auto-used' : '🔥 Streak restored'}
                </Text>
                <Text style={spStyles.historyDate}>{h.date}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset} accessibilityLabel="Reset all progress" accessibilityRole="button">
          <Ionicons name="trash" size={18} color="#ef4444" />
          <Text style={styles.dangerBtnText}>Reset All Progress</Text>
        </TouchableOpacity>
        <Text style={styles.dangerNote}>Permanently deletes all XP, gems, sessions, and achievements.</Text>
      </View>

      {/* App Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>Voice Trainer v2.1 — iOS Native Polish</Text>
        <Text style={styles.infoText}>Built with ♥ by Anthropic Claude</Text>
      </View>

      {/* Account */}
      <View style={sStyles.section}>
        <Text style={sStyles.sectionTitle}>☁️ Account & Sync</Text>
        {isSupabaseConfigured() && auth?.isAuthenticated ? (
          <>
            <View style={sStyles.accountRow}>
              <View style={sStyles.accountAvatar}>
                <Text style={sStyles.accountAvatarText}>
                  {(auth.profile?.display_name || auth.user?.email || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sStyles.accountName}>{auth.profile?.display_name || 'Your account'}</Text>
                <Text style={sStyles.accountEmail}>{auth.user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[sStyles.actionBtn, syncing && { opacity: 0.6 }]}
              onPress={handleSync}
              disabled={syncing}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={COLORS.primaryLight} />
              <Text style={sStyles.actionBtnText}>{syncing ? 'Syncing…' : 'Sync now'}</Text>
              {syncMsg ? <Text style={{ fontSize: 12, color: syncMsg.startsWith('✅') ? COLORS.success : '#EF4444' }}>{syncMsg}</Text> : null}
            </TouchableOpacity>
            <TouchableOpacity
              style={[sStyles.actionBtn, { borderColor: '#EF444444' }]}
              onPress={() => auth.signOut()}
            >
              <Ionicons name="log-out-outline" size={16} color="#EF4444" />
              <Text style={[sStyles.actionBtnText, { color: '#EF4444' }]}>Sign out</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={sStyles.syncNote}>
              Sign in to sync your progress, streaks, and skill tree across all your devices.
            </Text>
            <TouchableOpacity
              style={sStyles.signInBtn}
              onPress={() => router.push('/(tabs)/auth' as any)}
            >
              <Ionicons name="person-circle-outline" size={16} color="#fff" />
              <Text style={sStyles.signInBtnText}>Sign in or create account</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'android' ? 48 : 24, paddingBottom: 20, paddingHorizontal: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  savedBadge: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2A2A50' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowClickable: { borderRadius: 8 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowValue: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },
  subSection: { marginTop: 8, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2A2A50' },
  subLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  nativeHint: { fontSize: 12, color: COLORS.accent, marginTop: 10, fontStyle: 'italic' },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: '#2A2A50', gap: 6 },
  themeCardActive: { borderColor: COLORS.primary },
  themeSwatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3 },
  themeLabel: { fontSize: 12, color: COLORS.textMuted },
  themeLabelActive: { color: COLORS.text, fontWeight: '600' },
  rangeCard: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 14 },
  rangeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rangeItem: { alignItems: 'center' },
  rangeLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  rangeValue: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  rangeSpan: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },
  sliderRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  sliderDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#2A2A50' },
  sliderDotActive: { backgroundColor: COLORS.primary },
  dangerSection: { borderColor: '#3A1A1A' },
  dangerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#1A0A0A', borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: '#3A1A1A' },
  dangerBtnText: { fontSize: 15, color: '#ef4444', fontWeight: '600' },
  dangerNote: { fontSize: 12, color: COLORS.textMuted, marginTop: 8 },
  infoSection: { alignItems: 'center', padding: 24, gap: 4 },
  infoText: { fontSize: 12, color: COLORS.textMuted },
});

const sStyles = StyleSheet.create({
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  accountAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  accountAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  accountName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  accountEmail: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A50' },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1 },
  syncNote: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 12 },
  signInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, padding: 13, borderRadius: BORDER_RADIUS.lg },
  signInBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

const spStyles = StyleSheet.create({
  freezeBadge: {
    backgroundColor: 'rgba(125,211,252,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(125,211,252,0.25)',
  },
  freezeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7DD3FC',
  },
  historyBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2A50',
    gap: 6,
  },
  historyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyType: {
    fontSize: 12,
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
});
