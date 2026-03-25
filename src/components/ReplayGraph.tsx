import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions } from 'react-native';
import Svg, { Path, Line, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { SessionReplay, analyzeReplay } from '../utils/sessionReplay';

interface Props {
  replay: SessionReplay;
  onClose?: () => void;
  onPracticeAgain?: () => void;
}

const GRAPH_H = 130;

function PitchGraph({ replay, width }: { replay: SessionReplay; width: number }) {
  const W = width;
  const validSamples = replay.samples.filter(s => s.note !== '-' && s.freq > 0);
  if (validSamples.length < 2) {
    return (
      <View style={[styles.graphEmpty, { width: W }]}>
        <Text style={styles.graphEmptyText}>Not enough pitch data to graph</Text>
      </View>
    );
  }

  const maxT = validSamples[validSamples.length - 1].t || 1;
  const segments: { path: string; color: string }[] = [];
  let currentPath = '';
  let currentColor = COLORS.success;

  for (let i = 0; i < validSamples.length; i++) {
    const s = validSamples[i];
    const x = (s.t / maxT) * W;
    const clampedCents = Math.max(-60, Math.min(60, s.cents));
    const y = GRAPH_H / 2 - (clampedCents / 60) * (GRAPH_H / 2 - 8);
    const color = Math.abs(s.cents) <= 15 ? '#10B981' : Math.abs(s.cents) <= 35 ? '#F59E0B' : '#EF4444';

    if (i === 0) {
      currentPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else if (color !== currentColor) {
      segments.push({ path: currentPath, color: currentColor });
      const prevX = (validSamples[i - 1].t / maxT) * W;
      const prevY = GRAPH_H / 2 - (Math.max(-60, Math.min(60, validSamples[i - 1].cents)) / 60) * (GRAPH_H / 2 - 8);
      currentPath = `M ${prevX.toFixed(1)} ${prevY.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else {
      currentPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  if (currentPath) segments.push({ path: currentPath, color: currentColor });

  const noteMarkers = replay.noteResults.map((nr, i) => {
    const idx = Math.floor((i / replay.noteResults.length) * validSamples.length);
    const s = validSamples[idx];
    if (!s) return null;
    return { x: (s.t / maxT) * W, hit: nr.hit };
  }).filter(Boolean) as { x: number; hit: boolean }[];

  return (
    <View>
      <Svg width={W} height={GRAPH_H}>
        <Rect x={0} y={0} width={W} height={GRAPH_H} fill="#0A0A1A" rx={8} />
        <Line x1={0} y1={GRAPH_H / 2} x2={W} y2={GRAPH_H / 2} stroke="#2A2A50" strokeWidth={1} strokeDasharray="4,4" />
        <Rect x={0} y={GRAPH_H / 2 - (15 / 60) * (GRAPH_H / 2 - 8)} width={W} height={(15 / 60) * (GRAPH_H - 16)} fill="#10B98112" />
        {noteMarkers.map((m, i) => (
          <Line key={i} x1={m.x} y1={0} x2={m.x} y2={GRAPH_H} stroke={m.hit ? '#10B98130' : '#EF444430'} strokeWidth={1} />
        ))}
        {segments.map((seg, i) => (
          <Path key={i} d={seg.path} stroke={seg.color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        <SvgText x={6} y={13} fill="#EF4444" fontSize={9} opacity={0.7}>Sharp ♯</SvgText>
        <SvgText x={6} y={GRAPH_H - 5} fill="#F59E0B" fontSize={9} opacity={0.7}>Flat ♭</SvgText>
        <SvgText x={W / 2 - 14} y={GRAPH_H / 2 - 4} fill="#10B981" fontSize={9} opacity={0.8}>In tune</SvgText>
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
  const { width: screenWidth } = useWindowDimensions();
  const graphWidth = screenWidth - 64; // 16px padding each side + 16px card padding each side
  const analysis = analyzeReplay(replay);

  const hitCount = replay.noteResults.filter(n => n.hit).length;
  const duration = Math.round(replay.durationMs / 1000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
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
        {[
          { val: `${replay.accuracy}%`, label: 'Accuracy', color: replay.accuracy >= 80 ? COLORS.success : replay.accuracy >= 60 ? '#F59E0B' : '#EF4444' },
          { val: `${hitCount}/${replay.noteResults.length}`, label: 'Notes Hit', color: COLORS.text },
          { val: `${duration}s`, label: 'Duration', color: COLORS.text },
          ...(replay.score != null ? [{ val: String(replay.score), label: 'Score', color: COLORS.primaryLight }] : []),
        ].map((s, i, arr) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.scoreDivider} />}
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreVal, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.scoreLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
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
          <Text style={styles.sectionTitle}>Pitch Over Time</Text>
          <Text style={styles.sectionSub}>Cents sharp/flat per moment</Text>
          <PitchGraph replay={replay} width={graphWidth} />
        </View>
      )}

      {tab === 'notes' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Note-by-Note</Text>
          <View style={styles.noteGrid}>
            {replay.noteResults.map((nr, i) => (
              <View key={i} style={[styles.noteCard, { borderColor: nr.hit ? COLORS.success + '66' : '#EF444466', backgroundColor: nr.hit ? '#10B98111' : '#EF444411' }]}>
                <Text style={[styles.noteTarget, { color: nr.hit ? COLORS.success : '#EF4444' }]}>{nr.targetNote}</Text>
                <Text style={styles.noteSung}>{nr.sungNote || '—'}</Text>
                <Text style={[styles.noteCents, { color: Math.abs(nr.cents) <= 15 ? COLORS.success : Math.abs(nr.cents) <= 35 ? '#F59E0B' : '#EF4444' }]}>
                  {nr.cents > 0 ? `+${nr.cents}` : nr.cents}¢
                </Text>
                <Text style={{ fontSize: 12 }}>{nr.hit ? '✓' : '✗'}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {tab === 'analysis' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What the data says</Text>
          {[
            {
              icon: '🎯', title: 'Pitch Tendency',
              text: analysis.tendency === 'centered'
                ? 'Your pitch is well centered — you\'re singing right in tune on average.'
                : analysis.tendency === 'sharp'
                ? `Slightly sharp (+${analysis.avgCentsOff}¢ avg). Try relaxing your jaw and throat.`
                : `Slightly flat (-${analysis.avgCentsOff}¢ avg). Try engaging breath support more.`
            },
            analysis.worstNotes.length > 0 ? {
              icon: '⚠️', title: 'Notes to Work On',
              text: `${analysis.worstNotes.map(n => `${n.note} (${n.offPct}% off)`).join(', ')} — most deviation.`
            } : null,
            {
              icon: '📏', title: 'Average Deviation',
              text: analysis.avgCentsOff <= 10 ? `Excellent! Only ${analysis.avgCentsOff}¢ average.`
                : analysis.avgCentsOff <= 25 ? `Good — ${analysis.avgCentsOff}¢. Focus on landing center.`
                : `${analysis.avgCentsOff}¢. Slow down and listen carefully.`
            },
            analysis.maxMissStreak >= 3 ? {
              icon: '🔗', title: 'Consecutive Misses',
              text: `${analysis.maxMissStreak} missed notes in a row. Try slowing the BPM.`
            } : null,
            {
              icon: replay.accuracy >= 90 ? '🌟' : replay.accuracy >= 80 ? '🎯' : replay.accuracy >= 60 ? '💪' : '🔄',
              title: 'Overall',
              text: replay.accuracy >= 90 ? 'Outstanding! You\'re ready for the next level.'
                : replay.accuracy >= 80 ? 'Great job! A couple more runs and you\'ll nail it.'
                : replay.accuracy >= 60 ? 'Solid effort. Focus on flagged notes and try again.'
                : 'Keep at it — this will build your precision. Try a slower pace.',
              highlight: true,
            },
          ].filter(Boolean).map((card: any, i) => (
            <View key={i} style={[styles.analysisCard, card.highlight && { borderColor: replay.accuracy >= 80 ? COLORS.success + '44' : '#F59E0B44' }]}>
              <Text style={styles.analysisIcon}>{card.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.analysisTitle}>{card.title}</Text>
                <Text style={styles.analysisText}>{card.text}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingTop: 20 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  closeBtn: { padding: 8 },
  closeBtnText: { fontSize: 18, color: COLORS.textMuted },
  scoreStrip: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#2A2A50', marginBottom: 10 },
  scoreItem: { flex: 1, alignItems: 'center' },
  scoreVal: { fontSize: 18, fontWeight: '800' },
  scoreLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: '#2A2A50' },
  tabRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 4, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  section: { marginHorizontal: 16, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSub: { fontSize: 11, color: COLORS.textMuted, marginBottom: 10 },
  graphEmpty: { height: 80, justifyContent: 'center', alignItems: 'center' },
  graphEmptyText: { color: COLORS.textMuted, fontSize: 13 },
  graphLegend: { flexDirection: 'row', gap: 14, marginTop: 10, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: COLORS.textMuted },
  noteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteCard: { width: 58, borderRadius: 10, borderWidth: 1.5, padding: 7, alignItems: 'center' },
  noteTarget: { fontSize: 14, fontWeight: '800' },
  noteSung: { fontSize: 9, color: COLORS.textMuted },
  noteCents: { fontSize: 10, fontWeight: '700' },
  analysisCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2A2A50' },
  analysisIcon: { fontSize: 18 },
  analysisTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  analysisText: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  ctaRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 4 },
  practiceBtn: { flex: 1, backgroundColor: COLORS.primary, padding: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center' },
  practiceBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: { flex: 1, backgroundColor: '#1E1E3A', padding: 14, borderRadius: BORDER_RADIUS.lg, alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  doneBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
