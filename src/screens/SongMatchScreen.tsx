import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import PitchMeter from '../../src/components/PitchMeter';
import WaveformDisplay from '../../src/components/WaveformDisplay';
import { usePitchDetection } from '../../src/hooks/usePitchDetection';
import { SONG_MELODIES } from '../../src/utils/scales';
import { noteToFrequency } from '../../src/utils/pitchUtils';
import { saveSession } from '../../src/utils/storage';

type Song = typeof SONG_MELODIES[0];

export default function SongMatchScreen() {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [noteResults, setNoteResults] = useState<number[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  const {
    noteInfo,
    pitchHint,
    isListening,
    volume,
    startListening,
    stopListening,
  } = usePitchDetection();

  const currentSongNote = selectedSong?.notes[currentNoteIndex];

  const levelColors = {
    beginner: COLORS.success,
    intermediate: COLORS.warning,
    advanced: COLORS.danger,
  };

  const startSong = async (song: Song) => {
    setSelectedSong(song);
    setCurrentNoteIndex(0);
    setNoteResults([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setCountdown(3);
    await startListening();

    let count = 3;
    const cdInterval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(cdInterval);
        setIsRunning(true);
        sessionStartRef.current = new Date();
        playSongNote(song, 0);
      }
    }, 1000);
  };

  const playSongNote = (song: Song, index: number) => {
    if (index >= song.notes.length) {
      finishSong(song);
      return;
    }

    setCurrentNoteIndex(index);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Score the previous note
    if (index > 0) {
      const prevNote = song.notes[index - 1];
      const detectedMidi = noteInfo.midiNote;
      const diff = Math.abs(prevNote.midiNote - detectedMidi);
      const noteAccuracy = diff === 0 ? 100 : diff === 1 ? 70 : diff === 2 ? 40 : 10;
      setNoteResults(prev => [...prev, noteAccuracy]);

      if (noteAccuracy >= 70) {
        setCombo(c => {
          const newCombo = c + 1;
          setMaxCombo(m => Math.max(m, newCombo));
          return newCombo;
        });
        setScore(s => s + Math.round(noteAccuracy * (1 + combo * 0.1)));
      } else {
        setCombo(0);
      }
    }

    noteTimerRef.current = setTimeout(() => {
      playSongNote(song, index + 1);
    }, song.notes[index].duration + 100);
  };

  const finishSong = async (song: Song) => {
    setIsRunning(false);
    await stopListening();

    const durationSeconds = sessionStartRef.current
      ? Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000)
      : 30;

    const avgAccuracy =
      noteResults.length > 0
        ? Math.round(noteResults.reduce((a, b) => a + b, 0) / noteResults.length)
        : 0;

    const notesHit = noteResults.filter(r => r >= 70).length;

    const grade =
      avgAccuracy >= 90 ? '🌟 S' :
      avgAccuracy >= 80 ? '⭐ A' :
      avgAccuracy >= 70 ? '✅ B' :
      avgAccuracy >= 60 ? '👍 C' : '💪 D';

    await saveSession({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      exerciseId: song.id,
      exerciseName: song.name,
      type: 'song',
      durationSeconds,
      avgAccuracy,
      notesHit,
      totalNotes: song.notes.length,
      streak: maxCombo,
    });

    Alert.alert(
      `${grade} rank!`,
      `Song: ${song.name}\nScore: ${score.toLocaleString()}\nAccuracy: ${avgAccuracy}%\nBest Combo: ${maxCombo}x`,
      [
        { text: 'Try Again', onPress: () => startSong(song) },
        { text: 'Done', style: 'cancel', onPress: () => setSelectedSong(null) },
      ]
    );
  };

  const stopSong = async () => {
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    setIsRunning(false);
    setCountdown(0);
    await stopListening();
    setSelectedSong(null);
  };

  if (selectedSong) {
    const targetFreq = currentSongNote ? noteToFrequency(currentSongNote.midiNote) : 0;
    const progress = (currentNoteIndex / selectedSong.notes.length) * 100;

    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1A0535', '#0A0A1A']} style={styles.songHeader}>
          <TouchableOpacity onPress={stopSong} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.songHeaderInfo}>
            <Text style={styles.songTitleActive}>{selectedSong.name}</Text>
            <Text style={styles.songArtistActive}>{selectedSong.artist}</Text>
          </View>
          {isRunning && (
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{score.toLocaleString()}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          )}
        </LinearGradient>

        {countdown > 0 && (
          <View style={styles.countdownOverlay}>
            <Text style={styles.countdownText}>{countdown}</Text>
            <Text style={styles.countdownSub}>Get ready!</Text>
          </View>
        )}

        {/* Progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        {/* Combo display */}
        {combo > 1 && (
          <View style={styles.comboDisplay}>
            <Text style={styles.comboText}>🔥 {combo}x Combo!</Text>
          </View>
        )}

        {/* Note lyrics scroll */}
        {isRunning && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lyricsScroll}>
            {selectedSong.notes.map((n, i) => (
              <View
                key={i}
                style={[
                  styles.lyricChip,
                  i === currentNoteIndex && styles.lyricChipActive,
                  i < currentNoteIndex && styles.lyricChipDone,
                ]}
              >
                <Text style={[
                  styles.lyricText,
                  i === currentNoteIndex && { color: '#fff', fontSize: FONTS.sizes.lg },
                  i < currentNoteIndex && { opacity: 0.4 },
                ]}>
                  {n.syllable}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Target note */}
        {currentSongNote && isRunning && (
          <View style={styles.targetNote}>
            <Text style={styles.targetFreq}>Target: {Math.round(targetFreq)} Hz</Text>
          </View>
        )}

        {/* Waveform */}
        <View style={styles.waveformSmall}>
          <WaveformDisplay volume={volume} isActive={isListening} color='#EC4899' />
        </View>

        {/* Pitch Meter */}
        <PitchMeter
          cents={noteInfo.cents}
          pitchHint={pitchHint}
          note={noteInfo.note}
          octave={noteInfo.octave}
          frequency={noteInfo.frequency}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient colors={['#1A0535', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title}>🎧 Song Match</Text>
        <Text style={styles.subtitle}>Sing along to melodies and earn points for staying in pitch!</Text>
      </LinearGradient>

      <View style={styles.songList}>
        {SONG_MELODIES.map(song => (
          <TouchableOpacity
            key={song.id}
            style={styles.songCard}
            onPress={() => startSong(song)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#1A1A35', '#13132A']}
              style={styles.songCardContent}
            >
              <View style={[styles.songIcon, { backgroundColor: levelColors[song.level] + '30' }]}>
                <Ionicons name="musical-note" size={28} color={levelColors[song.level]} />
              </View>
              <View style={styles.songInfo}>
                <Text style={styles.songTitle}>{song.name}</Text>
                <Text style={styles.songArtist}>{song.artist}</Text>
                <View style={styles.songMeta}>
                  <View style={[styles.levelBadge, { backgroundColor: levelColors[song.level] + '30' }]}>
                    <Text style={[styles.levelText, { color: levelColors[song.level] }]}>
                      {song.level}
                    </Text>
                  </View>
                  <Text style={styles.metaText}>{song.notes.length} notes</Text>
                </View>
              </View>
              <Ionicons name="play-circle" size={36} color={levelColors[song.level]} />
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🎮 How Scoring Works</Text>
        <Text style={styles.infoText}>• Hit each note on pitch to earn points</Text>
        <Text style={styles.infoText}>• Build combos by hitting consecutive notes</Text>
        <Text style={styles.infoText}>• Higher combo = multiplied points!</Text>
        <Text style={styles.infoText}>• S rank = 90%+ accuracy</Text>
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
  songList: { padding: SPACING.md, gap: SPACING.sm },
  songCard: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  songCardContent: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md },
  songIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  songInfo: { flex: 1 },
  songTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.text },
  songArtist: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  songMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.xs },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  infoCard: { margin: SPACING.md, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, borderWidth: 1, borderColor: '#EC489940', gap: 6 },
  infoTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: '#EC4899', marginBottom: SPACING.xs },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  // Active song view
  songHeader: { padding: SPACING.md, paddingTop: SPACING.xl, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  backBtn: { padding: SPACING.xs },
  songHeaderInfo: { flex: 1 },
  songTitleActive: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.text },
  songArtistActive: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  scoreDisplay: { alignItems: 'flex-end' },
  scoreValue: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.black, color: '#EC4899' },
  scoreLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  progressBar: { height: 4, backgroundColor: COLORS.border },
  progressFill: { height: '100%', backgroundColor: '#EC4899' },
  comboDisplay: { alignItems: 'center', paddingVertical: SPACING.sm },
  comboText: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.warning },
  lyricsScroll: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md },
  lyricChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginRight: SPACING.sm },
  lyricChipActive: { borderBottomWidth: 2, borderBottomColor: '#EC4899' },
  lyricChipDone: {},
  lyricText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textSecondary },
  targetNote: { alignItems: 'center', paddingVertical: SPACING.xs },
  targetFreq: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  waveformSmall: { marginHorizontal: SPACING.md, backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  countdownOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', zIndex: 99 },
  countdownText: { fontSize: 100, fontWeight: FONTS.weights.black, color: '#EC4899' },
  countdownSub: { fontSize: FONTS.sizes.xl, color: COLORS.textSecondary, marginTop: SPACING.md },
});
