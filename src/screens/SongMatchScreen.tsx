import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import PitchMeter from '../components/PitchMeter';
import ReplayGraph from '../components/ReplayGraph';
import CountdownCircle from '../components/CountdownCircle';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useReferenceTone } from '../hooks/useReferenceTone';
import { SONG_MELODIES, SongMelody } from '../utils/scales';
import { noteToFrequency, frequencyToNoteInfo } from '../utils/pitchUtils';
import { saveSession, getBests, getDailyChallengeStatus, markDailyChallengeComplete, getDailyChallenge } from '../utils/storage';
import { createReplayBuilder, saveReplay, SessionReplay } from '../utils/sessionReplay';
import { useHaptics } from '../hooks/useHaptics';

const LEVEL_COLORS: Record<string, string> = { beginner: COLORS.success, intermediate: COLORS.warning, advanced: COLORS.danger };
type LevelFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

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
  const [genreFilter, setGenreFilter] = useState('All');
  const [bests, setBests] = useState<Record<string, any>>({});
  const [replay, setReplay] = useState<SessionReplay | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewNoteIdx, setPreviewNoteIdx] = useState(-1);
  const previewCancelRef = useRef(false);
  const startRef = useRef<Date | null>(null);
  const replayBuilderRef = useRef<ReturnType<typeof createReplayBuilder> | null>(null);
  const noteStartRef = useRef<number>(0);

  const { noteInfo, pitchHint, isListening, volume, color, startListening, stopListening } = usePitchDetection();
  const { playTone, playNote, playing: tonePlaying } = useReferenceTone();
  const { hitNote, hitCombo, completeFanfare, miss } = useHaptics();

  useFocusEffect(useCallback(() => {
    getBests().then(setBests);
    // Stop preview when leaving screen
    return () => { previewCancelRef.current = true; };
  }, []));

  const currentSongNote = selected?.notes[noteIdx];
  const filteredSongs = SONG_MELODIES.filter(s => {
    const levelOk = levelFilter === 'all' || s.level === levelFilter;
    const genreOk = genreFilter === 'All' || s.genre === genreFilter;
    return levelOk && genreOk;
  });

  // ── Play full song preview ──────────────────────────────────────────────────
  const playPreview = async (song: SongMelody) => {
    if (previewPlaying) {
      previewCancelRef.current = true;
      setPreviewPlaying(false);
      setPreviewNoteIdx(-1);
      return;
    }
    previewCancelRef.current = false;
    setPreviewPlaying(true);

    // ms per beat — one quarter note = 60000/bpm ms
    const beatMs = (60 / song.bpm) * 1000;

    for (let i = 0; i < song.notes.length; i++) {
      if (previewCancelRef.current) break;
      const n = song.notes[i];
      setPreviewNoteIdx(i);

      const totalMs = beatMs * n.duration; // full duration this note occupies
      const toneMs = Math.max(120, totalMs - 60);  // play tone slightly shorter for articulation gap

      if (n.midi !== 0) {
        // Fire tone without awaiting — it schedules Web Audio internally
        playTone(noteToFrequency(n.midi), toneMs, 0.32);
      }
      // Always wait the full note duration before moving to the next note
      await new Promise(r => setTimeout(r, totalMs));
    }

    setPreviewPlaying(false);
    setPreviewNoteIdx(-1);
  };

  // Stop preview when navigating away from detail screen
  const stopPreview = () => {
    previewCancelRef.current = true;
    setPreviewPlaying(false);
    setPreviewNoteIdx(-1);
  };

  // ── Pitch matching ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isRunning || !selected || !currentSongNote || currentSongNote.midi === 0) return;
    const targetInfo = frequencyToNoteInfo(noteToFrequency(currentSongNote.midi));

    if (noteInfo.note !== '-' && noteInfo.frequency > 0 && replayBuilderRef.current) {
      replayBuilderRef.current.addSample({
        note: noteInfo.note, octave: noteInfo.octave, cents: noteInfo.cents, freq: noteInfo.frequency,
        targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentSongNote.midi, hit: false,
      });
    }

    const isMatch = noteInfo.note !== '-' && noteInfo.note === targetInfo.note && Math.abs(noteInfo.cents) < 30;
    if (isMatch) {
      const newCombo = combo + 1;
      const points = 100 + (newCombo > 1 ? newCombo * 10 : 0);
      replayBuilderRef.current?.recordNoteResult({
        targetNote: targetInfo.note + targetInfo.octave, targetMidi: currentSongNote.midi,
        sungNote: noteInfo.note + noteInfo.octave, cents: noteInfo.cents, hit: true,
        timeToHit: Date.now() - noteStartRef.current,
      });
      hitNote();
      if (newCombo % 5 === 0) hitCombo();
      setScore(s => s + points);
      setCombo(newCombo);
      setResults(prev => [...prev, 100]);
      const next = noteIdx + 1;
      if (next >= selected.notes.length) { finishSong(newCombo); return; }
      noteStartRef.current = Date.now();
      setNoteIdx(next);
    }
  }, [noteInfo, isRunning]);

  // ── Start song ──────────────────────────────────────────────────────────────
  const startSong = async () => {
    stopPreview();
    setReplay(null);
    replayBuilderRef.current = createReplayBuilder(selected!.name, 'song');
    noteStartRef.current = Date.now();

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise(r => setTimeout(r, 1000));
    }
    setCountdown(0);

    await startListening();
    startRef.current = new Date();
    setIsRunning(true);
    setNoteIdx(0);
    setResults([]);
    setScore(0);
    setCombo(0);
  };

  // ── Finish song ─────────────────────────────────────────────────────────────
  const finishSong = async (finalCombo?: number) => {
    setIsRunning(false);
    await stopListening();
    const duration = startRef.current ? Math.floor((Date.now() - startRef.current.getTime()) / 1000) : 0;
    const acc = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : 0;

    if (acc >= 80) completeFanfare();

    if (selected) {
      if (replayBuilderRef.current) {
        for (let i = results.length; i < selected.notes.filter(n => n.midi !== 0).length; i++) {
          const note = selected.notes.filter(n => n.midi !== 0)[i];
          const targetInfo = frequencyToNoteInfo(noteToFrequency(note.midi));
          replayBuilderRef.current.recordNoteResult({
            targetNote: targetInfo.note + targetInfo.octave, targetMidi: note.midi,
            sungNote: '—', cents: 0, hit: false,
          });
        }
        const builtReplay = replayBuilderRef.current.build(acc, score);
        await saveReplay(builtReplay);
        setReplay(builtReplay);
      }

      await saveSession({
        id: Date.now().toString(), date: Date.now(), exerciseId: selected.id, exerciseName: selected.name,
        type: 'song', duration, accuracy: acc, score, combo: finalCombo ?? combo,
      });

      const challenge = getDailyChallenge();
      if (challenge.type === 'song' && challenge.exerciseId === selected.id && acc >= challenge.target) {
        const cs = await getDailyChallengeStatus();
        if (!cs.completedToday) await markDailyChallengeComplete();
      }
      getBests().then(setBests);
    }
  };

  // ── Replay screen ───────────────────────────────────────────────────────────
  if (replay && selected) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.replayHeader}>
          <Text style={styles.replayHeaderText}>🎶 Song Complete — {selected.emoji} {selected.name}</Text>
        </LinearGradient>
        <ReplayGraph
          replay={replay}
          onPracticeAgain={() => { setReplay(null); startSong(); }}
          onClose={() => { setReplay(null); setSelected(null); }}
        />
      </View>
    );
  }

  // ── Active song ─────────────────────────────────────────────────────────────
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
            <CountdownCircle count={countdown} total={3} />
          ) : (
            <>
              {targetInfo ? (
                <View style={styles.targetSection}>
                  <Text style={styles.targetLabel}>Sing this note</Text>
                  <View style={styles.targetNoteRow}>
                    <Text style={styles.targetNote}>{targetInfo.note}{targetInfo.octave}</Text>
                    {/* Hear current note button */}
                    <TouchableOpacity
                      style={[styles.hearNoteBtn, tonePlaying && styles.hearNoteBtnActive]}
                      onPress={() => playNote(currentNote!.midi)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name={tonePlaying ? 'volume-high' : 'volume-medium-outline'}
                        size={18}
                        color={tonePlaying ? COLORS.primaryLight : COLORS.textMuted}
                      />
                      <Text style={[styles.hearNoteBtnText, tonePlaying && { color: COLORS.primaryLight }]}>
                        {tonePlaying ? 'Playing…' : 'Hear it'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.targetFreq}>{Math.round(noteToFrequency(currentNote!.midi))} Hz</Text>
                </View>
              ) : (
                <View style={styles.targetSection}>
                  <Text style={styles.restLabel}>Rest 🎵</Text>
                </View>
              )}
              <PitchMeter noteInfo={noteInfo} color={color} volume={volume} pitchHint={pitchHint} />
              {combo > 2 && <Text style={styles.comboText}>🔥 {combo}x Combo!</Text>}
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(noteIdx / selected.notes.length) * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{noteIdx} / {selected.notes.length} notes</Text>
            </>
          )}
        </View>
        <TouchableOpacity style={styles.stopBtn} onPress={() => finishSong()}>
          <Ionicons name="stop-circle" size={20} color="#fff" />
          <Text style={styles.stopBtnText}>End Song</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Song detail ─────────────────────────────────────────────────────────────
  if (selected) {
    const best = bests[selected.id];
    const songNotes = selected.notes.filter(n => n.midi !== 0);
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <TouchableOpacity onPress={() => { stopPreview(); setSelected(null); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textSecondary} />
            <Text style={styles.backText}>Songs</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{selected.emoji} {selected.name}</Text>
          <Text style={styles.subtitle}>{selected.artist} • {selected.genre}</Text>
        </LinearGradient>
        <ScrollView style={styles.songDetail}>
          {/* Meta row */}
          <View style={styles.songMeta}>
            {[
              ['Level', selected.level, LEVEL_COLORS[selected.level]],
              ['Notes', songNotes.length.toString(), COLORS.text],
              ['BPM', selected.bpm.toString(), COLORS.text],
              ['Genre', selected.genre, COLORS.primaryLight],
            ].map(([l, v, c]) => (
              <View key={l} style={styles.metaItem}>
                <Text style={styles.metaLabel}>{l}</Text>
                <Text style={[styles.metaValue, { color: c as string, textTransform: 'capitalize' }]}>{v}</Text>
              </View>
            ))}
          </View>

          {/* ── Preview song player ── */}
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>🎵 Preview Song</Text>
              <Text style={styles.previewSubtitle}>Hear the full melody before you sing</Text>
            </View>

            {/* Note dots — lights up as song plays */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.noteDotsScroll}
              contentContainerStyle={styles.noteDotsList}>
              {selected.notes.map((n, i) => {
                const isActive = previewNoteIdx === i;
                const isPast = previewNoteIdx > i;
                const noteLabel = n.midi !== 0 ? frequencyToNoteInfo(noteToFrequency(n.midi)).note : '—';
                return (
                  <View key={i} style={[
                    styles.noteDot,
                    n.midi === 0 && styles.noteDotRest,
                    isActive && styles.noteDotActive,
                    isPast && styles.noteDotPast,
                  ]}>
                    <Text style={[
                      styles.noteDotLabel,
                      isActive && styles.noteDotLabelActive,
                      isPast && styles.noteDotLabelPast,
                    ]}>{noteLabel}</Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Play / Stop preview button */}
            <TouchableOpacity
              style={[styles.previewBtn, previewPlaying && styles.previewBtnStop]}
              onPress={() => playPreview(selected)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={previewPlaying ? 'stop-circle' : 'play-circle'}
                size={22}
                color="#fff"
              />
              <Text style={styles.previewBtnText}>
                {previewPlaying ? 'Stop Preview' : 'Play Full Melody'}
              </Text>
            </TouchableOpacity>

            {/* Hear individual notes */}
            <View style={styles.noteGridSection}>
              <Text style={styles.noteGridLabel}>Tap any note to hear it</Text>
              <View style={styles.noteGrid}>
                {songNotes.map((n, i) => {
                  const info = frequencyToNoteInfo(noteToFrequency(n.midi));
                  return (
                    <TouchableOpacity
                      key={i}
                      style={styles.noteGridItem}
                      onPress={() => playTone(noteToFrequency(n.midi), 500, 0.3)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="volume-medium-outline" size={12} color={COLORS.primary} />
                      <Text style={styles.noteGridItemText}>{info.note}{info.octave}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Best score */}
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

          {/* Start button */}
          <TouchableOpacity style={styles.startBtn} onPress={startSong}>
            <Ionicons name="mic" size={22} color="#fff" />
            <Text style={styles.startBtnText}>Start Singing</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtnFull} onPress={() => { stopPreview(); setSelected(null); }}>
            <Text style={styles.backBtnText}>← Back to Songs</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Song list ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.title}>🎶 Songs</Text>
        <Text style={styles.subtitle}>{SONG_MELODIES.length} songs to master</Text>
      </LinearGradient>
      <View style={styles.filterRow}>
        {(['all', 'beginner', 'intermediate', 'advanced'] as LevelFilter[]).map(l => (
          <TouchableOpacity key={l} style={[styles.filterChip, levelFilter === l && styles.filterChipActive]} onPress={() => setLevelFilter(l)}>
            <Text style={[styles.filterText, levelFilter === l && styles.filterTextActive]}>{l === 'all' ? 'All' : l.charAt(0).toUpperCase() + l.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
                <View style={{ flex: 1 }}>
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
                    <Text style={[styles.bestMiniAcc, { color: best.accuracy >= 80 ? COLORS.success : '#F59E0B' }]}>{best.accuracy}%</Text>
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
  replayHeader: { paddingTop: 56, paddingBottom: 12, paddingHorizontal: SPACING.lg },
  replayHeaderText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  backText: { fontSize: 14, color: COLORS.textSecondary },

  // Filters
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

  // Song list cards
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
  bestMiniAcc: { fontSize: 16, fontWeight: '700' },
  bestMiniLabel: { fontSize: 10, color: COLORS.textMuted },

  // Active exercise
  exerciseContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg, gap: 16 },
  countdown: { fontSize: 80, fontWeight: '800', color: COLORS.primary },
  targetSection: { alignItems: 'center', gap: 6 },
  targetLabel: { fontSize: 14, color: COLORS.textMuted },
  targetNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  targetNote: { fontSize: 56, fontWeight: '800', color: COLORS.text },
  hearNoteBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#1E1E3A',
    borderWidth: 1, borderColor: '#2A2A50',
  },
  hearNoteBtnActive: { borderColor: COLORS.primaryLight, backgroundColor: '#2A1A5E' },
  hearNoteBtnText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  targetFreq: { fontSize: 13, color: COLORS.textSecondary },
  restLabel: { fontSize: 28, color: COLORS.textMuted },
  comboText: { fontSize: 18, fontWeight: '700', color: '#f97316' },
  progressBar: { width: '85%', height: 6, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
  progressText: { fontSize: 12, color: COLORS.textMuted },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 20, padding: 16, backgroundColor: COLORS.danger, borderRadius: BORDER_RADIUS.lg },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Song detail
  songDetail: { flex: 1 },
  songMeta: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: '#13132A', margin: 16, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: '#2A2A50' },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 11, color: COLORS.textMuted, marginBottom: 4 },
  metaValue: { fontSize: 15, fontWeight: '700' },

  // Preview card
  previewCard: { margin: 16, marginTop: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50', gap: 14 },
  previewHeader: { gap: 2 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewSubtitle: { fontSize: 12, color: COLORS.textMuted },

  // Scrolling note dots
  noteDotsScroll: { maxHeight: 52 },
  noteDotsList: { flexDirection: 'row', gap: 6, paddingVertical: 4 },
  noteDot: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1E1E3A',
    borderWidth: 1, borderColor: '#2A2A50',
    alignItems: 'center', justifyContent: 'center',
  },
  noteDotRest: { opacity: 0.35 },
  noteDotActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primaryLight,
    transform: [{ scale: 1.15 }],
  },
  noteDotPast: { backgroundColor: '#2A2A50', borderColor: '#3A3A60' },
  noteDotLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  noteDotLabelActive: { color: COLORS.primaryLight, fontWeight: '800' },
  noteDotLabelPast: { color: '#3A3A60' },

  // Preview play button
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2A1A5E',
    paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.primary + '77',
  },
  previewBtnStop: { backgroundColor: '#2A1A1A', borderColor: COLORS.danger + '77' },
  previewBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Individual note tapper grid
  noteGridSection: { gap: 8 },
  noteGridLabel: { fontSize: 12, color: COLORS.textMuted },
  noteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteGridItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    backgroundColor: '#1E1E3A',
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1, borderColor: '#2A2A50',
  },
  noteGridItemText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },

  // Best / Start
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

