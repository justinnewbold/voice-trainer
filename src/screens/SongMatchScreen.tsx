import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { SONG_MELODIES, SongMelody } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo } from '../utils/pitchUtils';
import { saveSession, getBests, getDailyChallengeStatus, markDailyChallengeComplete, getDailyChallenge } from '../utils/storage';

const LEVEL_COLORS: Record<string, string> = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.danger };
type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';
type GenreFilter = string;

const ALL_GENRES = ['All', ...Array.from(new Set(SONG_MELODIES.map(s => s.genre))).sort()];

export default function SongMatchScreen() {
  const [selected, setSelected] = useState<SongMelody | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [noteIdx, setNoteIdx] = useState(0);
  const [results, setResults] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [genreFilter, setGenreFilter] = useState<GenreFilter>('All');
  const [bests, setBests] = useState<Record<string, any>>({});
  const startRef = useRef<Date | null>(null);
  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();

  useFocusEffect(useCallback(() => {
    getBests().then(setBests);
  }, []));

  const currentSongNote = selected?.notes[noteIdx];
  const filteredSongs = SONG_MELODIES.filter(s => {
    const levelOk = levelFilter === 'all' || s.level === levelFilter;
    const genreOk = genreFilter === 'All' || s.genre === genreFilter;
    return levelOk && genreOk;
  });

  useEffect(() => {
    if (!isRunning || !selected || !currentSongNote || currentSongNote.midi === 0) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentSongNote.midi));
    const isMatch = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && Math.abs(noteInfo.cents) < 30;
    if (isMatch) {
      const newCombo = combo + 1;
      const points = 100 + (newCombo > 1 ? newCombo * 10 : 0);
      setScore(s => s + points);
      setCombo(newCombo);
      setResults(prev => [...prev, 100]);
      const next = noteIdx + 1;
      if (next >= selected.notes.length) { finishSong(); return; }
      setNoteIdx(next);
    }
  }, [noteInfo, isRunning]);

  const startSong = async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) { await new Promise(r => setTimeout(r, 1000)); setCountdown(i - 1); }
    await startListening();
    startRef.current = new Date();
    setIsRunning(true);
    setNoteIdx(0);
    setResults([]);
    setScore(0);
    setCombo(0);
  };

  const finishSong = async () => {
    setIsRunning(false);
    await stopListening();
    const duration = startRef.current ? Math.floor((Date.now() - startRef.current.getTime()) / 1000) : 0;
    const acc = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;
    if (selected) {
      const saved = await saveSession({
        id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name,
        type: 'song', duration, accuracy: acc, score, combo,
      });
      // Check daily challenge
      const challenge = getDailyChallenge();
      if (challenge.type === 'song' && challenge.exerciseId === selected.id && acc >= challenge.target) {
        const cs = await getDailyChallengeStatus();
        if (!cs.completedToday) await markDailyChallengeComplete();
      }
      getBests().then(setBests);
    }
  };

  if (selected && (isRunning || countdown > 0)) {
    const currentNote = selected.notes[noteIdx];
    const targetInfo = currentNote && currentNote.midi !== 0 ? frequencyToNoteInfo(noteToFrequency(currentNote.midi)) : null;
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>{selected.emoji} {selected.name}</Text>
          <Text style={styles.subtitle}>Note {noteIdx + 1} / {selected.notes.length} • Score: {score}</Text>
        </LinearGradient>
        <View style={styles.exerciseContent}>
          {countdown > 0 ? (
            <Text style={styles.countdown}>{countdown}</Text>
          ) : (
            <>
              {targetInfo ? (
                <View style={styles.targetSection}>
                  <Text style={styles.targetLabel}>Sing this note</Text>
                  <Text style={styles.targetNote}>{targetInfo.note}{targetInfo.octave}</Text>
                  <Text style={styles.targetFreq}>{Math.round(noteToFrequency(currentNote!.midi))} Hz</Text>
                </View>
              ) : (
                <View style={styles.targetSection}>
                  <Text style={styles.restLabel}>Rest</Text>
                </View>
              )}
              <PitchMeter noteInfo={noteInfo} color={color} volume={volume} pitchHint={pitchHint} />
              {combo > 2 && <Text style={styles.comboText}>🔥 {combo}x Combo!</Text>}
            </>
          )}
        </View>
        <TouchableOpacity style={styles.stopBtn} onPress={finishSong}>
          <Ionicons name="stop-circle" size={20} color="#fff" />
          <Text style={styles.stopBtnText}>End Song</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (selected) {
    const best = bests[selected.id];
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={styles.backText}>Songs</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selected.emoji} {selected.name}</Text>
          <Text style={styles.subtitle}>{selected.artist} • {selected.genre}</Text>
        </LinearGradient>
        <ScrollView style={styles.songDetail}>
          <View style={styles.songMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Level</Text>
              <Text style={[styles.metaValue, { color: LEVEL_COLORS[selected.level] }]}>{selected.level}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Notes</Text>
              <Text style={styles.metaValue}>{selected.notes.filter(n => n.midi !== 0).length}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>BPM</Text>
              <Text style={styles.metaValue}>{selected.bpm}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Genre</Text>
              <Text style={styles.metaValue}>{selected.genre}</Text>
            </View>
          </View>
          {best && (
            <View style={styles.bestCard}>
              <Text style={styles.bestTitle}>🏆 Your Best</Text>
              <View style={styles.bestRow}>
                <Text style={styles.bestLabel}>Accuracy: <Text style={styles.bestVal}>{best.accuracy}%</Text></Text>
                <Text style={styles.bestLabel}>Score: <Text style={styles.bestVal}>{best.score}</Text></Text>
                <Text style={styles.bestLabel}>Attempts: <Text style={styles.bestVal}>{best.attempts}</Text></Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.startBtn} onPress={startSong}>
            <Ionicons name="play" size={22} color="#fff" />
            <Text style={styles.startBtnText}>Start Singing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => setSelected(null)}>
            <Text style={styles.backBtnText}>← Back to Songs</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>🎶 Songs</Text>
        <Text style={styles.subtitle}>{SONG_MELODIES.length} songs to master</Text>
      </LinearGradient>

      {/* Level filter */}
      <View style={styles.filterRow}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as LevelFilter[]).map(l => (
          <TouchableOpacity key={l} style={[styles.filterChip, levelFilter === l && styles.filterChipActive]} onPress={() => setLevelFilter(l)}>
            <Text style={[styles.filterText, levelFilter === l && styles.filterTextActive]}>{l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Genre filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {ALL_GENRES.map(g => (
          <TouchableOpacity key={g} style={[styles.genreChip, genreFilter === g && styles.genreChipActive]} onPress={() => setGenreFilter(g)}>
            <Text style={[styles.genreText, genreFilter === g && styles.genreTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredSongs}
        keyExtractor={s => s.id}
        contentContainerStyle={{ padding: 16, gap: 10 }}
        renderItem={({ item }) => {
          const best = bests[item.id];
          return (
            <TouchableOpacity style={styles.songCard} onPress={() => setSelected(item)}>
              <View style={styles.songCardLeft}>
                <Text style={styles.songEmoji}>{item.emoji}</Text>
                <View>
                  <Text style={styles.songName}>{item.name}</Text>
                  <Text style={styles.songArtist}>{item.artist} • {item.genre}</Text>
                  <View style={styles.songTags}>
                    <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '22' }]}>
                      <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>{item.level}</Text>
                    </View>
                    <Text style={styles.noteCount}>{item.notes.filter(n => n.midi !== 0).length} notes</Text>
                  </View>
                </View>
              </View>
              <View style={styles.songCardRight}>
                {best ? (
                  <View style={styles.bestMini}>
                    <Text style={styles.bestMiniAcc}>{best.accuracy}%</Text>
                    <Text style={styles.bestMiniLabel}>best</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: SPACING.lg },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 14, color: COLORS.textSecondary },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50' },
  filterChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  filterTextActive: { color: '#fff' },
  genreRow: { maxHeight: 42, paddingVertical: 4 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50', height: 30 },
  genreChipActive: { backgroundColor: '#7c6af733', borderColor: COLORS.primaryLight },
  genreText: { fontSize: 11, color: COLORS.textMuted },
  genreTextActive: { color: COLORS.primaryLight, fontWeight: '600' },
  songCard: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  songCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  songEmoji: { fontSize: 28 },
  songName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  songArtist: { fontSize: 12, color: COLORS.textMuted },
  songTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  levelText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  noteCount: { fontSize: 11, color: COLORS.textMuted },
  songCardRight: { alignItems: 'flex-end' },
  bestMini: { alignItems: 'center' },
  bestMiniAcc: { fontSize: 16, fontWeight: '700', color: COLORS.success },
  bestMiniLabel: { fontSize: 10, color: COLORS.textMuted },
  exerciseContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  countdown: { fontSize: 80, fontWeight: '800', color: COLORS.primary },
  targetSection: { alignItems: 'center', marginBottom: 20 },
  targetLabel: { fontSize: 14, color: COLORS.textMuted, marginBottom: 4 },
  targetNote: { fontSize: 56, fontWeight: '800', color: COLORS.text },
  targetFreq: { fontSize: 14, color: COLORS.textSecondary },
  restLabel: { fontSize: 32, color: COLORS.textMuted },
  comboText: { fontSize: 18, fontWeight: '700', color: '#f97316', marginTop: 8 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, padding: 16, backgroundColor: COLORS.danger, borderRadius: BORDER_RADIUS.lg },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  songDetail: { flex: 1 },
  songMeta: { flexDirection: 'row', justifyContent: 'space-around', padding: 20, backgroundColor: '#13132A', margin: 16, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#2A2A50' },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  metaValue: { fontSize: 16, fontWeight: '700', color: COLORS.text, textTransform: 'capitalize' },
  bestCard: { margin: 16, marginTop: 0, backgroundColor: '#1a2a1a', borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1, borderColor: COLORS.success + '44' },
  bestTitle: { fontSize: 13, fontWeight: '700', color: COLORS.success, marginBottom: 8 },
  bestRow: { flexDirection: 'row', gap: 16 },
  bestLabel: { fontSize: 13, color: COLORS.textMuted },
  bestVal: { color: COLORS.text, fontWeight: '700' },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, margin: 16, padding: 18, backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.lg },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtnFull: { margin: 16, marginTop: 0, padding: 14, alignItems: 'center' },
  backBtnText: { color: COLORS.textSecondary, fontSize: 14 },
});
