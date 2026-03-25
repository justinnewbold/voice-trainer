import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Svg, { Path, Line, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { SessionReplay, NoteResult, analyzeReplay } from '../utils/sessionReplay';

interface Props {
  replay: SessionReplay;
  onClose?: () => void;
  onPracticeAgain?: () => void;
}

const GRAPH_W = 320;
const GRAPH_H = 120;

function PitchGraph({ replay }: { replay: SessionReplay }) {
  const { samples, noteResults } = replay;
  const validSamples = samples.filter(s => s.note !== '-' && s.freq > 0);
  if (validSamples.length < 2) {
    return (
      <View style={styles.graphEmpty}>
        <Text style={styles.graphEmptyText}>Not enough pitch data to graph</Text>
      </View>
    );
  }

  const maxT = validSamples[validSamples.length - 1].t || 1;

  // Build path segments colored by hit/miss and sharp/flat
  const segments: { path: string; color: string }[] = [];
  let currentPath = '';
  let currentColor = COLORS.success;

  for (let i = 0; i < validSamples.length; i++) {
    const s = validSamples[i];
    const x = (s.t / maxT) * GRAPH_W;
    const clampedCents = Math.max(-60, Math.min(60, s.cents));
    const y = GRAPH_H / 2 - (clampedCents / 60) * (GRAPH_H / 2 - 8);

    const color = Math.abs(s.cents) <= 15 ? '#10B981'
      : Math.abs(s.cents) <= 35 ? '#F59E0B'
      : '#EF4444';

    if (i === 0) {
      currentPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else if (color !== currentColor) {
      segments.push({ path: currentPath, color: currentColor });
      currentPath = `M ${validSamples[i-1].t / maxT * GRAPH_W} ${GRAPH_H / 2 - (Math.max(-60, Math.min(60, validSamples[i-1].cents)) / 60) * (GRAPH_H / 2 - 8)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else {
      currentPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  if (currentPath) segments.push({ path: currentPath, color: currentColor });

  // Note boundary markers
  const noteMarkers = noteResults.map((nr, i) => {
    const sampleIdx = Math.floor((i / noteResults.length) * validSamples.length);
    const sample = validSamples[sampleIdx];
    if (!sample) return null;
    const x = (sample.t / maxT) * GRAPH_W;
    return { x, note: nr.targetNote, hit: nr.hit };
  }).filter(Boolean) as { x: number; note: string; hit: boolean }[];

  return (
    <View style={styles.graphContainer}>
      <Svg width={GRAPH_W} height={GRAPH_H} style={styles.svg}>
        {/* Background grid */}
        <Rect x={0} y={0} width={GRAPH_W} height={GRAPH_H} fill="#0A0A1A" rx={8} />
        {/* Center line (in-tune) */}
        <Line x1={0} y1={GRAPH_H / 2} x2={GRAPH_W} y2={GRAPH_H / 2} stroke="#2A2A50" strokeWidth={1} strokeDasharray="4,4" />
        {/* ±15 cent bands */}
        <Rect x={0} y={GRAPH_H / 2 - (15 / 60) * (GRAPH_H / 2 - 8)} width={GRAPH_W} height={(15 / 60) * (GRAPH_H - 16)} fill="#10B98110" />
        {/* Note boundary lines */}
        {noteMarkers.map((m, i) => (
          <Line key={i} x1={m.x} y1={0} x2={m.x} y2={GRAPH_H} stroke={m.hit ? '#10B98130' : '#EF444430'} strokeWidth={1} />
        ))}
        {/* Pitch path segments */}
        {segments.map((seg, i) => (
          <Path key={i} d={seg.path} stroke={seg.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {/* Sharp/Flat labels */}
        <SvgText x={4} y={12} fill="#EF4444" fontSize={9} opacity={0.7}>Sharp ♯</SvgText>
        <SvgText x={4} y={GRAPH_H - 4} fill="#F59E0B" fontSize={9} opacity={0.7}>Flat ♭</SvgText>
        <SvgText x={4} y={GRAPH_H / 2 - 3} fill="#10B981" fontSize={9} opacity={0.7}>In tune</SvgText>
      </Svg>
      <View style={styles.graphLegend}>
        {[['#10B981', 'On pitch (±15¢)'], ['#F59E0B', 'Close (±35¢)'], ['#EF4444', 'Off (>35¢)']].map(([c, l]) => (
          <View key={l} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function ReplayGraph({ replay, onClose, onPracticeAgain }: Props) {
  const [tab, setTab] = useState<'graph' | 'notes' | 'analysis'>('graph');
  const analysis = analyzeReplay(replay);

  const hitCount = replay.noteResults.filter(n => n.hit).length;
  const totalNotes = replay.noteResults.length;
  const duration = Math.round(replay.durationMs / 1000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>📊 Session Replay</Text>
          <Text style={styles.subtitle}>{replay.exerciseName}</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Score strip */}
      <View style={styles.scoreStrip}>
        <View style={styles.scoreItem}>
          <Text style={[styles.scoreVal, { color: replay.accuracy >= 80 ? COLORS.success : replay.accuracy >= 60 ? '#F59E0B' : '#EF4444' }]}>{replay.accuracy}%</Text>
          <Text style={styles.scoreLabel}>Accuracy</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreItem}>
          <Text style={styles.scoreVal}>{hitCount}/{totalNotes}</Text>
          <Text style={styles.scoreLabel}>Notes Hit</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreItem}>
          <Text style={styles.scoreVal}>{duration}s</Text>
          <Text style={styles.scoreLabel}>Duration</Text>
        </View>
        {replay.score != null && (
          <>
            <View style={styles.scoreDivider} />
            <View style={styles.scoreItem}>
              <Text style={styles.scoreVal}>{replay.score}</Text>
              <Text style={styles.scoreLabel}>Score</Text>
            </View>
          </>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {(['graph', 'notes', 'analysis'] as const).map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'graph' ? '📈 Graph' : t === 'notes' ? '🎵 Notes' : '💡 Analysis'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'graph' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pitch Accuracy Over Time</Text>
          <Text style={styles.sectionSub}>How many cents sharp or flat you were each moment</Text>
          <PitchGraph replay={replay} />
        </View>
      )}

      {tab === 'notes' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note-by-Note Results</Text>
          <View style={styles.noteGrid}>
            {replay.noteResults.map((nr, i) => (
              <View key={i} style={[styles.noteCard, { borderColor: nr.hit ? COLORS.success + '66' : '#EF444466', backgroundColor: nr.hit ? '#10B98111' : '#EF444411' }]}>
                <Text style={[styles.noteTarget, { color: nr.hit ? COLORS.success : '#EF4444' }]}>{nr.targetNote}</Text>
                <Text style={styles.noteSung}>{nr.hit ? nr.sungNote || nr.targetNote : nr.sungNote || '—'}</Text>
                <Text style={[styles.noteCents, { color: Math.abs(nr.cents) <= 15 ? COLORS.success : Math.abs(nr.cents) <= 35 ? '#F59E0B' : '#EF4444' }]}>
                  {nr.cents > 0 ? `+${nr.cents}` : nr.cents}¢
                </Text>
                {nr.hit ? (
                  <Text style={styles.noteHit}>✓</Text>
                ) : (
                  <Text style={styles.noteMiss}>✗</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      {tab === 'analysis' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What the data says</Text>

          <View style={styles.analysisCard}>
            <Text style={styles.analysisIcon}>🎯</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisTitle}>Pitch Tendency</Text>
              <Text style={styles.analysisText}>
                {analysis.tendency === 'centered'
                  ? 'Your pitch is well centered — you\'re singing right in tune on average.'
                  : analysis.tendency === 'sharp'
                  ? `You\'re singing slightly sharp (+${Math.abs(analysis.avgCentsOff)}¢ average). Try relaxing your jaw and throat.`
                  : `You\'re singing slightly flat (-${Math.abs(analysis.avgCentsOff)}¢ average). Try engaging your breath support more.`}
              </Text>
            </View>
          </View>

          {analysis.worstNotes.length > 0 && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.analysisTitle}>Notes to Work On</Text>
                <Text style={styles.analysisText}>
                  {analysis.worstNotes.map(n => `${n.note} (${n.offPct}% off)`).join(', ')} — these notes had the most pitch deviation.
                </Text>
              </View>
            </View>
          )}

          <View style={styles.analysisCard}>
            <Text style={styles.analysisIcon}>📏</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisTitle}>Average Deviation</Text>
              <Text style={styles.analysisText}>
                {analysis.avgCentsOff <= 10
                  ? `Excellent! Only ${analysis.avgCentsOff}¢ average — that's nearly perfect.`
                  : analysis.avgCentsOff <= 25
                  ? `Good — ${analysis.avgCentsOff}¢ average. Focus on landing the note center.`
                  : `${analysis.avgCentsOff}¢ average. Slow down and really listen to each note.`}
              </Text>
            </View>
          </View>

          {analysis.maxMissStreak >= 3 && (
            <View style={styles.analysisCard}>
              <Text style={styles.analysisIcon}>🔗</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.analysisTitle}>Consecutive Misses</Text>
                <Text style={styles.analysisText}>
                  You had a streak of {analysis.maxMissStreak} missed notes in a row. Consider slowing the BPM and taking it one note at a time.
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.analysisCard, { borderColor: replay.accuracy >= 80 ? COLORS.success + '44' : '#F59E0B44' }]}>
            <Text style={styles.analysisIcon}>{replay.accuracy >= 90 ? '🌟' : replay.accuracy >= 80 ? '🎯' : replay.accuracy >= 60 ? '💪' : '🔄'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.analysisTitle}>Overall</Text>
              <Text style={styles.analysisText}>
                {replay.accuracy >= 90 ? 'Outstanding performance! You\'re ready for the next level.'
                  : replay.accuracy >= 80 ? 'Great job! A couple more runs and you\'ll nail it perfectly.'
                  : replay.accuracy >= 60 ? 'Solid effort. Focus on the flagged notes and try again.'
                  : 'Keep at it — this exercise will build your precision. Try a slower BPM first.'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* CTA buttons */}
      <View style={styles.ctaRow}>
        {onPracticeAgain && (
          <TouchableOpacity style={styles.practiceBtn} onPress={onPracticeAgain}>
            <Text style={styles.practiceBtnText}>🔁 Practice Again</Text>
          </TouchableOpacity>
        )}
        {onClose && (
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingTop: 24 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: COLORS.textMuted },
  scoreStrip: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#2A2A50', marginBottom: 12 },
  scoreItem: { flex: 1, alignItems: 'center' },
  scoreVal: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  scoreLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: '#2A2A50' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  section: { marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 12 },
  graphContainer: { alignItems: 'center' },
  graphEmpty: { height: 80, justifyContent: 'center', alignItems: 'center' },
  graphEmptyText: { color: COLORS.textMuted, fontSize: 13 },
  svg: { borderRadius: 8 },
  graphLegend: { flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: COLORS.textMuted },
  noteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteCard: { width: 60, borderRadius: 10, borderWidth: 1.5, padding: 8, alignItems: 'center' },
  noteTarget: { fontSize: 15, fontWeight: '800' },
  noteSung: { fontSize: 10, color: COLORS.textMuted },
  noteCents: { fontSize: 10, fontWeight: '700' },
  noteHit: { fontSize: 11, color: COLORS.success },
  noteMiss: { fontSize: 11, color: '#EF4444' },
  analysisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A50' },
  analysisIcon: { fontSize: 20 },
  analysisTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  analysisText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  ctaRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 4 },
  practiceBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
  practiceBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#1E1E3A', padding: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  doneBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
