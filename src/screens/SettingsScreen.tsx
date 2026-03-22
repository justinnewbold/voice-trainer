import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadSettings, saveSettings, clearProgress, loadVocalRange, AppSettings, defaultSettings } from '../utils/storage';

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
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [vocalRange, setVocalRange] = useState<any>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [s, r] = await Promise.all([loadSettings(), loadVocalRange()]);
      setSettings(s);
      setVocalRange(r);
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
      // On native, would use expo-notifications
      await update({ notificationsEnabled: true });
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
        <Text style={styles.title}>⚙️ Settings</Text>
        {saved && <Text style={styles.savedBadge}>✓ Saved</Text>}
      </LinearGradient>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notifications</Text>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowLabel}>Daily Reminders</Text>
            <Text style={styles.rowSub}>Get reminded to practice each day</Text>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={v => v ? requestNotifications() : update({ notificationsEnabled: false })}
            trackColor={{ false: '#2A2A50', true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
        {settings.notificationsEnabled && (
          <View style={styles.subSection}>
            <Text style={styles.subLabel}>Reminder time</Text>
            <View style={styles.chipRow}>
              {REMINDER_HOURS.map(h => (
                <TouchableOpacity key={h.value}
                  style={[styles.chip, settings.reminderHour === h.value && styles.chipActive]}
                  onPress={() => update({ reminderHour: h.value })}>
                  <Text style={[styles.chipText, settings.reminderHour === h.value && styles.chipTextActive]}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Daily Goal */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Daily XP Goal</Text>
        {DAILY_GOALS.map(g => (
          <TouchableOpacity key={g.value} style={[styles.row, styles.rowClickable]}
            onPress={() => update({ dailyGoalXP: g.value })}>
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
              onPress={() => update({ theme: t.id as any })}>
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
        <View style={styles.sliderRow}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <TouchableOpacity key={v} style={[styles.sliderDot, settings.metronomeVolume >= v && styles.sliderDotActive]}
              onPress={() => update({ metronomeVolume: v })} />
          ))}
        </View>
        <View style={[styles.row, { marginTop: 12 }]}>
          <Text style={styles.rowLabel}>Drone Tone Volume</Text>
          <Text style={styles.rowValue}>{Math.round(settings.droneVolume * 100)}%</Text>
        </View>
        <View style={styles.sliderRow}>
          {[0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
            <TouchableOpacity key={v} style={[styles.sliderDot, settings.droneVolume >= v && styles.sliderDotActive]}
              onPress={() => update({ droneVolume: v })} />
          ))}
        </View>
      </View>

      {/* Danger Zone */}
      <View style={[styles.section, styles.dangerSection]}>
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleReset}>
          <Ionicons name="trash" size={18} color="#ef4444" />
          <Text style={styles.dangerBtnText}>Reset All Progress</Text>
        </TouchableOpacity>
        <Text style={styles.dangerNote}>Permanently deletes all XP, gems, sessions, and achievements.</Text>
      </View>

      {/* App Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoText}>Voice Trainer v2.0</Text>
        <Text style={styles.infoText}>Built with ♥ by Anthropic Claude</Text>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: SPACING.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  savedBadge: { fontSize: 13, color: COLORS.success, fontWeight: '600' },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowClickable: { borderRadius: 8 },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 15, color: COLORS.text },
  rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  rowValue: { fontSize: 14, color: COLORS.primaryLight, fontWeight: '600' },
  subSection: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2A2A50' },
  subLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50' },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 12, color: COLORS.textSecondary },
  chipTextActive: { color: '#fff', fontWeight: '600' },
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
