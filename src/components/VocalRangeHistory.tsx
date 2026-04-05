import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Svg, { Line, Rect, Text as SvgText, Circle } from 'react-native-svg';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { ALL_NOTES, classifyVoiceType } from '../utils/pitchUtils';

export interface RangeSnapshot {
  lowNote: string;
  highNote: string;
  voiceType: string;
  semitones: number;
  testedAt: number;
}

interface Props {
  history: RangeSnapshot[];
  width: number;
}

const CHART_H = 200;
const PADDING_X = 50;
const PADDING_Y = 20;

// Map note name to a vertical position index
function noteToIndex(name: string): number {
  return ALL_NOTES.findIndex(n => n.name === name);
}

export default function VocalRangeHistory({ history, width }: Props) {
  if (history.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyTitle}>No Range Tests Yet</Text>
        <Text style={styles.emptyText}>Take the Vocal Range Test to start tracking your progress over time.</Text>
      </View>
    );
  }

  // Sort by date
  const sorted = [...history].sort((a, b) => a.testedAt - b.testedAt);

  // Find min/max note indices across all tests
  const allLowIndices = sorted.map(s => noteToIndex(s.lowNote)).filter(i => i >= 0);
  const allHighIndices = sorted.map(s => noteToIndex(s.highNote)).filter(i => i >= 0);
  const minNote = Math.max(0, Math.min(...allLowIndices) - 2);
  const maxNote = Math.min(ALL_NOTES.length - 1, Math.max(...allHighIndices) + 2);
  const noteRange = maxNote - minNote || 1;

  const chartW = width - 2 * PADDING_X;
  const chartH = CHART_H - 2 * PADDING_Y;

  // Map note index to Y
  const noteToY = (idx: number) => PADDING_Y + chartH - ((idx - minNote) / noteRange) * chartH;
  // Map time to X
  const minTime = sorted[0].testedAt;
  const maxTime = sorted[sorted.length - 1].testedAt;
  const timeRange = maxTime - minTime || 1;
  const timeToX = (t: number) => {
    if (sorted.length === 1) return PADDING_X + chartW / 2;
    return PADDING_X + ((t - minTime) / timeRange) * chartW;
  };

  // Latest result
  const latest = sorted[sorted.length - 1];
  const first = sorted[0];
  const semitoneDiff = latest.semitones - first.semitones;
  const vt = classifyVoiceType(latest.lowNote, latest.highNote);

  // Y-axis labels (every 3rd note in range)
  const yLabels: { label: string; y: number }[] = [];
  for (let i = minNote; i <= maxNote; i += 3) {
    if (ALL_NOTES[i]) {
      yLabels.push({ label: ALL_NOTES[i].name, y: noteToY(i) });
    }
  }

  return (
    <View>
      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{latest.lowNote}</Text>
          <Text style={styles.summaryLabel}>Lowest</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.primaryLight }]}>{latest.semitones}</Text>
          <Text style={styles.summaryLabel}>Semitones</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{latest.highNote}</Text>
          <Text style={styles.summaryLabel}>Highest</Text>
        </View>
      </View>

      {/* Growth badge */}
      {sorted.length > 1 && (
        <View style={[styles.growthBadge, { backgroundColor: semitoneDiff > 0 ? '#10B98122' : semitoneDiff < 0 ? '#EF444422' : '#2A2A50' }]}>
          <Text style={[styles.growthText, { color: semitoneDiff > 0 ? COLORS.success : semitoneDiff < 0 ? '#EF4444' : COLORS.textMuted }]}>
            {semitoneDiff > 0 ? `↑ +${semitoneDiff} semitones since first test` : semitoneDiff < 0 ? `↓ ${semitoneDiff} semitones since first test` : 'Range unchanged since first test'}
          </Text>
        </View>
      )}

      {/* Chart */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(width, sorted.length * 80 + PADDING_X * 2)} height={CHART_H}>
          {/* Background */}
          <Rect x={PADDING_X} y={PADDING_Y} width={chartW} height={chartH} fill="#0A0A1A" rx={6} />

          {/* Y-axis labels */}
          {yLabels.map((l, i) => (
            <React.Fragment key={i}>
              <Line x1={PADDING_X} y1={l.y} x2={PADDING_X + chartW} y2={l.y} stroke="#1A1A35" strokeWidth={0.5} />
              <SvgText x={PADDING_X - 6} y={l.y + 3} fill={COLORS.textMuted} fontSize={9} textAnchor="end">{l.label}</SvgText>
            </React.Fragment>
          ))}

          {/* Range bars for each test */}
          {sorted.map((snap, i) => {
            const x = timeToX(snap.testedAt);
            const lowIdx = noteToIndex(snap.lowNote);
            const highIdx = noteToIndex(snap.highNote);
            const topY = noteToY(highIdx);
            const bottomY = noteToY(lowIdx);
            const barH = bottomY - topY;
            const isLatest = i === sorted.length - 1;

            return (
              <React.Fragment key={i}>
                {/* Range bar */}
                <Rect
                  x={x - 8}
                  y={topY}
                  width={16}
                  height={Math.max(4, barH)}
                  fill={isLatest ? COLORS.primary + '66' : COLORS.primary + '33'}
                  rx={4}
                  stroke={isLatest ? COLORS.primaryLight : COLORS.primary + '55'}
                  strokeWidth={isLatest ? 1.5 : 0.5}
                />
                {/* High dot */}
                <Circle cx={x} cy={topY} r={3} fill={isLatest ? '#EF4444' : '#EF444488'} />
                {/* Low dot */}
                <Circle cx={x} cy={bottomY} r={3} fill={isLatest ? '#3b82f6' : '#3b82f688'} />
                {/* Date label */}
                <SvgText x={x} y={CHART_H - 2} fill={COLORS.textMuted} fontSize={8} textAnchor="middle">
                  {new Date(snap.testedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </SvgText>
                {/* Semitone count */}
                <SvgText x={x} y={topY - 6} fill={isLatest ? COLORS.primaryLight : COLORS.textMuted} fontSize={9} textAnchor="middle" fontWeight={isLatest ? 'bold' : 'normal'}>
                  {snap.semitones}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Connect high notes with line */}
          {sorted.length > 1 && (
            <>
              {sorted.slice(1).map((snap, i) => {
                const prev = sorted[i];
                const x1 = timeToX(prev.testedAt);
                const x2 = timeToX(snap.testedAt);
                const y1 = noteToY(noteToIndex(prev.highNote));
                const y2 = noteToY(noteToIndex(snap.highNote));
                return <Line key={`h${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#EF444455" strokeWidth={1} strokeDasharray="3,3" />;
              })}
              {sorted.slice(1).map((snap, i) => {
                const prev = sorted[i];
                const x1 = timeToX(prev.testedAt);
                const x2 = timeToX(snap.testedAt);
                const y1 = noteToY(noteToIndex(prev.lowNote));
                const y2 = noteToY(noteToIndex(snap.lowNote));
                return <Line key={`l${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b82f655" strokeWidth={1} strokeDasharray="3,3" />;
              })}
            </>
          )}
        </Svg>
      </ScrollView>

      {/* Voice type */}
      {vt && (
        <View style={[styles.voiceType, { borderColor: vt.color + '55' }]}>
          <Text style={[styles.voiceTypeLabel, { color: vt.color }]}>{vt.label}</Text>
          <Text style={styles.voiceTypeRange}>Typical range: {vt.range}</Text>
        </View>
      )}

      {/* History list */}
      <Text style={styles.historyTitle}>{sorted.length} Range Test{sorted.length !== 1 ? 's' : ''}</Text>
      {[...sorted].reverse().map((snap, i) => (
        <View key={i} style={styles.historyRow}>
          <View style={styles.historyDate}>
            <Text style={styles.historyDateText}>{new Date(snap.testedAt).toLocaleDateString()}</Text>
          </View>
          <View style={styles.historyRange}>
            <Text style={[styles.historyNote, { color: '#3b82f6' }]}>{snap.lowNote}</Text>
            <View style={styles.historyBar} />
            <Text style={[styles.historyNote, { color: '#EF4444' }]}>{snap.highNote}</Text>
          </View>
          <Text style={styles.historySemitones}>{snap.semitones} st</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', padding: 24, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, gap: 16 },
  summaryItem: { alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '900', color: COLORS.text },
  summaryLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 28, backgroundColor: '#2A2A50' },
  growthBadge: { borderRadius: BORDER_RADIUS.lg, padding: 10, marginBottom: 14, alignItems: 'center' },
  growthText: { fontSize: 13, fontWeight: '700' },
  voiceType: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: BORDER_RADIUS.md, padding: 10, marginTop: 12, marginBottom: 12 },
  voiceTypeLabel: { fontSize: 15, fontWeight: '700' },
  voiceTypeRange: { fontSize: 12, color: COLORS.textMuted },
  historyTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2A2A50', gap: 12 },
  historyDate: {},
  historyDateText: { fontSize: 12, color: COLORS.textSecondary },
  historyRange: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyNote: { fontSize: 13, fontWeight: '700' },
  historyBar: { flex: 1, height: 3, backgroundColor: COLORS.primary + '55', borderRadius: 1.5 },
  historySemitones: { fontSize: 12, fontWeight: '600', color: COLORS.primaryLight },
});
