import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

export interface Recording {
  id: string;
  name: string;
  date: string;
  duration: number; // seconds
  uri: string;
  pitchTimeline: { t: number; note: string; octave: number; cents: number; status: string }[];
}

const STORAGE_KEY = 'vt_mobile_recordings';

function loadRecordings(): Recording[] {
  return []; // expo-secure-store used in storage.ts; recordings are session-only on mobile for now
}

export default function RecordingsScreen() {
  const [recordings, setRecordings] = useState<Recording[]>(loadRecordings());
  const [playingId, setPlayingId]   = useState<string | null>(null);
  const [progress, setProgress]     = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const playRecording = useCallback(async (rec: Recording) => {
    // Stop current playback
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    if (progressInterval.current) clearInterval(progressInterval.current);

    if (playingId === rec.id) {
      setPlayingId(null);
      setProgress(0);
      return;
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: rec.uri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingId(rec.id);
      setProgress(0);

      progressInterval.current = setInterval(async () => {
        if (!soundRef.current) return;
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const pct = status.durationMillis && status.durationMillis > 0
            ? (status.positionMillis || 0) / status.durationMillis : 0;
          setProgress(pct);
          if (!status.isPlaying && pct >= 0.99) {
            clearInterval(progressInterval.current!);
            setPlayingId(null);
            setProgress(0);
          }
        }
      }, 100);

      sound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null);
          setProgress(0);
          if (progressInterval.current) clearInterval(progressInterval.current);
        }
      });
    } catch (e) {
      Alert.alert('Playback Error', 'Could not play this recording.');
    }
  }, [playingId]);

  const deleteRecording = useCallback((id: string) => {
    Alert.alert('Delete Recording', 'Remove this recording?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setRecordings(prev => prev.filter(r => r.id !== id));
        if (playingId === id) {
          soundRef.current?.stopAsync();
          setPlayingId(null);
        }
      }},
    ]);
  }, [playingId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1a0a35', '#080810']} style={styles.header}>
        <Text style={styles.title}>🎙 Recordings</Text>
        <Text style={styles.subtitle}>Playback your singing sessions</Text>
      </LinearGradient>

      {recordings.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎙</Text>
          <Text style={styles.emptyTitle}>No recordings yet</Text>
          <Text style={styles.emptyText}>
            Use the Pitch Trainer tab and recordings will appear here automatically.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {recordings.map(rec => {
            const isPlaying = playingId === rec.id;
            const mins = Math.floor(rec.duration / 60);
            const secs = (rec.duration % 60).toString().padStart(2, '0');
            const date = new Date(rec.date);

            return (
              <View key={rec.id} style={[styles.card, isPlaying && styles.cardActive]}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.recName}>{rec.name}</Text>
                    <Text style={styles.recMeta}>
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {mins}:{secs}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteRecording(rec.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                {isPlaying && (
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => playRecording(rec)}
                  style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                >
                  <Ionicons name={isPlaying ? 'stop' : 'play'} size={18} color="#fff" />
                  <Text style={styles.playBtnText}>{isPlaying ? 'Stop' : 'Play Recording'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 About Recordings</Text>
        <Text style={styles.infoText}>
          Recordings are saved while the app is running. Start a Pitch Trainer session and your voice will be recorded automatically. Tap Stop to save.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: SPACING['2xl'] },
  header: { padding: SPACING.xl, paddingTop: SPACING['2xl'] },
  title: { fontSize: FONTS.sizes['2xl'], fontWeight: FONTS.weights.black, color: COLORS.text },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  emptyCard: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyIcon: { fontSize: 52, marginBottom: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text, marginBottom: SPACING.sm },
  emptyText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  list: { padding: SPACING.md, gap: SPACING.sm },
  card: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border },
  cardActive: { borderColor: COLORS.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.sm },
  recName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  recMeta: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2, fontFamily: 'monospace' },
  deleteBtn: { padding: SPACING.xs },
  progressTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 999, marginBottom: SPACING.sm, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 999 },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, padding: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md },
  playBtnActive: { backgroundColor: COLORS.danger },
  playBtnText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: '#fff' },
  infoCard: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '40' },
  infoTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.primaryLight, marginBottom: SPACING.sm },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
});
