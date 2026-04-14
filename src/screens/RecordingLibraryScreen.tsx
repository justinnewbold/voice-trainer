import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator,
  Platform, useWindowDimensions, RefreshControl, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import {
  LibraryEntry, loadLibrary, toggleFavorite, updateTitle, updateNotes,
  deleteRecordingMeta, getAccuracyTrend, buildSparkline, getTitle,
  formatDuration, formatRelativeDate, AccuracyPoint,
} from '../utils/recordingLibrary';
import { analyzeReplay } from '../utils/sessionReplay';
import RecordingPlayback from '../components/RecordingPlayback';
import WaveformSparkline from '../components/WaveformSparkline';
import Svg, { Polyline, Line, Circle, Text as SvgText, Rect } from 'react-native-svg';

type FilterTab = 'all' | 'favorites' | 'scales' | 'songs';

// ─── Accuracy trend mini-chart ─────────────────────────────────────────────────
function TrendChart({ points, width }: { points: AccuracyPoint[]; width: number }) {
  if (points.length < 2) return (
    <View style={styles.trendEmpty}>
      <Text style={styles.trendEmptyText}>
        Practice this exercise more times to see your accuracy trend
      </Text>
    </View>
  );

  const H = 100;
  const PAD = { top: 12, bottom: 24, left: 28, right: 8 };
  const chartW = width - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minAcc = Math.max(0, Math.min(...points.map(p => p.accuracy)) - 10);
  const maxAcc = Math.min(100, Math.max(...points.map(p => p.accuracy)) + 10);
  const range = maxAcc - minAcc || 10;

  const px = (i: number) => PAD.left + (i / (points.length - 1)) * chartW;
  const py = (acc: number) => PAD.top + chartH - ((acc - minAcc) / range) * chartH;

  const polylinePoints = points.map((p, i) => `${px(i).toFixed(1)},${py(p.accuracy).toFixed(1)}`).join(' ');
  const latestAcc = points[points.length - 1].accuracy;
  const prevAcc = points[points.length - 2]?.accuracy ?? latestAcc;
  const delta = latestAcc - prevAcc;
  const trend = delta > 2 ? '↑' : delta < -2 ? '↓' : '→';
  const trendColor = delta > 2 ? COLORS.success : delta < -2 ? '#EF4444' : '#F59E0B';

  return (
    <View>
      <View style={styles.trendHeader}>
        <Text style={styles.trendTitle}>Accuracy over time</Text>
        <Text style={[styles.trendDelta, { color: trendColor }]}>
          {trend} {Math.abs(Math.round(delta))}% vs last
        </Text>
      </View>
      <Svg width={width} height={H}>
        <Rect x={0} y={0} width={width} height={H} fill="#0A0A1A" rx={8} />
        {/* Grid lines */}
        {[0, 50, 100].map(v => {
          const y = py(Math.max(minAcc, Math.min(maxAcc, v)));
          return (
            <React.Fragment key={v}>
              <Line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y}
                stroke="#2A2A50" strokeWidth={1} strokeDasharray="3,3" />
              <SvgText x={PAD.left - 4} y={y + 4} fill="#475569" fontSize={8} textAnchor="end">{v}</SvgText>
            </React.Fragment>
          );
        })}
        {/* Trend line */}
        <Polyline points={polylinePoints} fill="none" stroke={COLORS.primaryLight} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <Circle key={i} cx={px(i)} cy={py(p.accuracy)} r={3}
            fill={p.accuracy >= 80 ? COLORS.success : p.accuracy >= 60 ? '#F59E0B' : '#EF4444'} />
        ))}
        {/* X labels — show first and last only */}
        <SvgText x={px(0)} y={H - 4} fill="#475569" fontSize={8} textAnchor="middle">
          {points[0].label}
        </SvgText>
        <SvgText x={px(points.length - 1)} y={H - 4} fill="#475569" fontSize={8} textAnchor="middle">
          {points[points.length - 1].label}
        </SvgText>
      </Svg>
    </View>
  );
}

// ─── Library Row ──────────────────────────────────────────────────────────────
function LibraryRow({
  entry, onPress, onFavorite, sparkline,
}: {
  entry: LibraryEntry;
  onPress: () => void;
  onFavorite: () => void;
  sparkline: number[];
}) {
  const acc = entry.replay.accuracy;
  const accColor = acc >= 80 ? COLORS.success : acc >= 60 ? '#F59E0B' : '#EF4444';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 70, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.85}>
        {/* Type icon */}
        <View style={[styles.rowIcon, { backgroundColor: entry.replay.type === 'song' ? '#EC489922' : '#7C3AED22' }]}>
          <Text style={styles.rowIconText}>{entry.replay.type === 'song' ? '🎶' : '🎼'}</Text>
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>{getTitle(entry)}</Text>
          <Text style={styles.rowMeta}>
            {formatRelativeDate(entry.replay.startedAt)} · {formatDuration(entry.replay.durationMs)}
          </Text>
          {/* Mini waveform */}
          <View style={styles.sparklineWrap}>
            <WaveformSparkline data={sparkline} width={120} height={24} accuracy={acc} />
          </View>
        </View>

        {/* Right side */}
        <View style={styles.rowRight}>
          <View style={[styles.accBadge, { backgroundColor: accColor + '22' }]}>
            <Text style={[styles.accText, { color: accColor }]}>{acc}%</Text>
          </View>
          <TouchableOpacity onPress={onFavorite} style={styles.favBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={entry.meta.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={entry.meta.isFavorite ? '#EC4899' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  entry, visible, onClose, onUpdate, screenWidth,
}: {
  entry: LibraryEntry | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: () => void;
  screenWidth: number;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesInput, setNotesInput] = useState('');
  const [trendPoints, setTrendPoints] = useState<AccuracyPoint[]>([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [activeTab, setActiveTab] = useState<'playback' | 'analysis' | 'trend'>('playback');

  const playbackWidth = screenWidth - 48;

  const loadTrend = useCallback(async () => {
    if (!entry) return;
    setLoadingTrend(true);
    const pts = await getAccuracyTrend(entry.replay.exerciseName);
    setTrendPoints(pts);
    setLoadingTrend(false);
  }, [entry]);

  React.useEffect(() => {
    if (visible && entry) {
      setTitleInput(entry.meta.customTitle ?? '');
      setNotesInput(entry.meta.notes ?? '');
      setActiveTab('playback');
    }
  }, [visible, entry]);

  React.useEffect(() => {
    if (activeTab === 'trend' && entry) loadTrend();
  }, [activeTab, loadTrend, entry]);

  if (!entry) return null;

  const acc = entry.replay.accuracy;
  const accColor = acc >= 80 ? COLORS.success : acc >= 60 ? '#F59E0B' : '#EF4444';
  const analysis = analyzeReplay(entry.replay);

  const handleSaveTitle = async () => {
    await updateTitle(entry.replay.sessionId, titleInput);
    setEditingTitle(false);
    onUpdate();
  };

  const handleSaveNotes = async () => {
    await updateNotes(entry.replay.sessionId, notesInput);
    setEditingNotes(false);
    onUpdate();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete recording?',
      `Remove "${getTitle(entry)}" from your library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteRecordingMeta(entry.replay.sessionId);
            onUpdate();
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.detailContainer}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={onClose} style={styles.detailClose}>
            <Ionicons name="chevron-down" size={22} color={COLORS.textMuted} />
          </TouchableOpacity>
          <View style={styles.detailTitleWrap}>
            {editingTitle ? (
              <View style={styles.titleEditRow}>
                <TextInput
                  style={styles.titleInput}
                  value={titleInput}
                  onChangeText={setTitleInput}
                  placeholder="Recording name..."
                  placeholderTextColor={COLORS.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveTitle}
                />
                <TouchableOpacity onPress={handleSaveTitle} style={styles.titleSaveBtn}>
                  <Text style={styles.titleSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setEditingTitle(true)} style={styles.titlePressable}>
                <Text style={styles.detailTitle} numberOfLines={1}>{getTitle(entry)}</Text>
                <Ionicons name="pencil" size={12} color={COLORS.textMuted} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            )}
            <Text style={styles.detailSubtitle}>
              {formatRelativeDate(entry.replay.startedAt)} · {formatDuration(entry.replay.durationMs)}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Accuracy', value: `${acc}%`, color: accColor },
            { label: 'Notes hit', value: `${entry.replay.noteResults.filter(n => n.hit).length}/${entry.replay.noteResults.length}` },
            { label: 'Tendency', value: analysis.tendency, color: analysis.tendency === 'centered' ? COLORS.success : '#F59E0B' },
            { label: 'Avg cents off', value: `${analysis.avgCentsOff}¢` },
          ].map(s => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statVal, s.color ? { color: s.color } : {}]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['playback', 'analysis', 'trend'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'playback' ? '▶ Playback' : t === 'analysis' ? '📊 Analysis' : '📈 Trend'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.detailScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {/* Playback tab */}
          {activeTab === 'playback' && (
            <View style={styles.playbackWrap}>
              <RecordingPlayback replay={entry.replay} width={playbackWidth} />
            </View>
          )}

          {/* Analysis tab */}
          {activeTab === 'analysis' && (
            <View style={styles.analysisSection}>
              {analysis.worstNotes.length > 0 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisCardTitle}>⚠️ Notes needing work</Text>
                  {analysis.worstNotes.map(n => (
                    <View key={n.note} style={styles.analysisRow}>
                      <Text style={styles.analysisNote}>{n.note}</Text>
                      <View style={styles.analysisMiniBar}>
                        <View style={[styles.analysisMiniBarFill, { width: `${n.offPct}%`, backgroundColor: '#EF4444' }]} />
                      </View>
                      <Text style={styles.analysisPct}>{n.offPct}% off</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.analysisCard}>
                <Text style={styles.analysisCardTitle}>🎯 Pitch tendency</Text>
                <Text style={styles.analysisTendencyText}>
                  {analysis.tendency === 'centered'
                    ? '✅ Your pitch is well-centered — great intonation!'
                    : analysis.tendency === 'sharp'
                      ? '⬆️ You tend to sing sharp. Try relaxing your jaw and listening for the lower edge of each note.'
                      : '⬇️ You tend to sing flat. Try lifting the back of your tongue slightly and projecting forward.'}
                </Text>
              </View>

              {analysis.maxMissStreak > 1 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisCardTitle}>🔗 Longest miss streak</Text>
                  <Text style={styles.analysisTendencyText}>
                    {analysis.maxMissStreak} consecutive missed notes. Work on the middle section of this exercise.
                  </Text>
                </View>
              )}

              {/* Notes field */}
              <View style={styles.notesCard}>
                <View style={styles.notesHeader}>
                  <Text style={styles.analysisCardTitle}>📝 Personal notes</Text>
                  {!editingNotes && (
                    <TouchableOpacity onPress={() => setEditingNotes(true)}>
                      <Text style={styles.editLink}>{entry.meta.notes ? 'Edit' : 'Add note'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {editingNotes ? (
                  <>
                    <TextInput
                      style={styles.notesInput}
                      value={notesInput}
                      onChangeText={setNotesInput}
                      placeholder="What did you notice? What to work on next time..."
                      placeholderTextColor={COLORS.textMuted}
                      multiline
                      numberOfLines={3}
                    />
                    <View style={styles.notesBtns}>
                      <TouchableOpacity onPress={() => setEditingNotes(false)}>
                        <Text style={styles.notesCancelBtn}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={handleSaveNotes} style={styles.notesSaveBtn}>
                        <Text style={styles.notesSaveBtnText}>Save</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <Text style={styles.notesText}>
                    {entry.meta.notes ?? 'No notes yet. Add observations after each take.'}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Trend tab */}
          {activeTab === 'trend' && (
            <View>
              {loadingTrend ? (
                <ActivityIndicator size="small" color={COLORS.primaryLight} style={{ marginTop: 20 }} />
              ) : (
                <TrendChart points={trendPoints} width={playbackWidth} />
              )}
              {trendPoints.length >= 2 && (
                <View style={styles.trendStats}>
                  <View style={styles.trendStatItem}>
                    <Text style={styles.trendStatVal}>{Math.max(...trendPoints.map(p => p.accuracy))}%</Text>
                    <Text style={styles.trendStatLabel}>Best</Text>
                  </View>
                  <View style={styles.trendStatItem}>
                    <Text style={styles.trendStatVal}>{Math.round(trendPoints.reduce((a, p) => a + p.accuracy, 0) / trendPoints.length)}%</Text>
                    <Text style={styles.trendStatLabel}>Average</Text>
                  </View>
                  <View style={styles.trendStatItem}>
                    <Text style={styles.trendStatVal}>{trendPoints.length}</Text>
                    <Text style={styles.trendStatLabel}>Sessions</Text>
                  </View>
                  <View style={styles.trendStatItem}>
                    <Text style={[styles.trendStatVal, {
                      color: trendPoints[trendPoints.length - 1].accuracy > trendPoints[0].accuracy
                        ? COLORS.success : '#EF4444'
                    }]}>
                      {trendPoints[trendPoints.length - 1].accuracy > trendPoints[0].accuracy ? '↑' : '↓'}
                      {Math.abs(trendPoints[trendPoints.length - 1].accuracy - trendPoints[0].accuracy)}%
                    </Text>
                    <Text style={styles.trendStatLabel}>Total change</Text>
                  </View>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function RecordingLibraryScreen() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selected, setSelected] = useState<LibraryEntry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { width } = useWindowDimensions();

  const load = useCallback(async () => {
    const lib = await loadLibrary(20);
    setEntries(lib);
    // Build sparklines
    const sp: Record<string, number[]> = {};
    for (const e of lib) {
      sp[e.replay.sessionId] = buildSparkline(e.replay, 40);
    }
    setSparklines(sp);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleFavorite = async (entry: LibraryEntry) => {
    await toggleFavorite(entry.replay.sessionId);
    await load();
  };

  const filtered = entries.filter(e => {
    if (filter === 'favorites') return e.meta.isFavorite;
    if (filter === 'scales') return e.replay.type === 'scale';
    if (filter === 'songs') return e.replay.type === 'song';
    return true;
  });

  const totalDurationMs = entries.reduce((a, e) => a + e.replay.durationMs, 0);
  const avgAcc = entries.length > 0
    ? Math.round(entries.reduce((a, e) => a + e.replay.accuracy, 0) / entries.length)
    : 0;
  const favCount = entries.filter(e => e.meta.isFavorite).length;

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}
      >
        {/* Header */}
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>🎙️ Recording Library</Text>
          <Text style={styles.subtitle}>{entries.length} recordings · tap to replay with pitch overlay</Text>

          {/* Stats row */}
          {entries.length > 0 && (
            <View style={styles.headerStats}>
              {[
                { label: 'Saved', value: `${entries.length}` },
                { label: 'Avg accuracy', value: `${avgAcc}%` },
                { label: 'Total time', value: formatDuration(totalDurationMs) },
                { label: 'Favorites', value: `${favCount} ♥` },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.headerStatItem}>
                    <Text style={styles.headerStatVal}>{s.value}</Text>
                    <Text style={styles.headerStatLabel}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {(['all', 'favorites', 'scales', 'songs'] as FilterTab[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterTabText, filter === f && styles.filterTabTextActive]}>
                {f === 'all' ? 'All' : f === 'favorites' ? '♥ Saved' : f === 'scales' ? '🎼 Scales' : '🎶 Songs'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty state */}
        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎙️</Text>
            <Text style={styles.emptyTitle}>
              {filter === 'favorites' ? 'No favorites yet' : 'No recordings yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'favorites'
                ? 'Tap the heart on any recording to save it as a favorite.'
                : 'Complete a Scales or Songs exercise to see your recordings here.'}
            </Text>
          </View>
        )}

        {/* Recording list */}
        <View style={styles.list}>
          {filtered.map(entry => (
            <LibraryRow
              key={entry.replay.sessionId}
              entry={entry}
              sparkline={sparklines[entry.replay.sessionId] ?? []}
              onPress={() => setSelected(entry)}
              onFavorite={() => handleFavorite(entry)}
            />
          ))}
        </View>

        {entries.length > 0 && (
          <Text style={styles.footerNote}>
            Library stores your {entries.length} most recent recordings
          </Text>
        )}
      </ScrollView>

      <DetailModal
        entry={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onUpdate={load}
        screenWidth={width}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: SPACING.lg },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 14 },

  headerStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
  },
  headerStatItem: { flex: 1, alignItems: 'center' },
  headerStatVal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  headerStatLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#2A2A50' },

  filterRow: {
    flexDirection: 'row',
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 4,
    gap: 2,
  },
  filterTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  filterTabTextActive: { color: '#fff' },

  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },

  list: { paddingHorizontal: 16, gap: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 12,
    borderWidth: 1, borderColor: '#2A2A50',
  },
  rowIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowIconText: { fontSize: 20 },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  rowMeta: { fontSize: 11, color: COLORS.textMuted },
  sparklineWrap: { marginTop: 4 },
  rowRight: { alignItems: 'center', gap: 8 },
  accBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  accText: { fontSize: 13, fontWeight: '700' },
  favBtn: { padding: 2 },

  footerNote: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, margin: 16 },

  // Detail modal
  detailContainer: { flex: 1, backgroundColor: COLORS.background },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: '#2A2A50',
    backgroundColor: '#13132A',
  },
  detailClose: { padding: 4 },
  detailTitleWrap: { flex: 1 },
  titlePressable: { flexDirection: 'row', alignItems: 'center' },
  detailTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, flex: 1 },
  detailSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  titleEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleInput: {
    flex: 1, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 10, paddingVertical: 6, color: COLORS.text,
    fontSize: 15, borderWidth: 1, borderColor: '#2A2A50',
  },
  titleSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: BORDER_RADIUS.md },
  titleSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  statsStrip: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#13132A', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#2A2A50',
  },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },

  tabs: {
    flexDirection: 'row', backgroundColor: '#13132A',
    borderBottomWidth: 1, borderBottomColor: '#2A2A50',
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primaryLight },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primaryLight },

  detailScroll: { flex: 1 },
  playbackWrap: {
    backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg,
    padding: 16, borderWidth: 1, borderColor: '#2A2A50',
  },

  analysisSection: { gap: 12 },
  analysisCard: {
    backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#2A2A50',
  },
  analysisCardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  analysisRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  analysisNote: { width: 28, fontSize: 14, fontWeight: '700', color: COLORS.text },
  analysisMiniBar: { flex: 1, height: 6, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden' },
  analysisMiniBarFill: { height: '100%', borderRadius: 3 },
  analysisPct: { width: 52, fontSize: 11, color: '#EF4444', textAlign: 'right' },
  analysisTendencyText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  notesCard: {
    backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg,
    padding: 14, borderWidth: 1, borderColor: '#2A2A50',
  },
  notesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  editLink: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },
  notesInput: {
    backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md,
    padding: 10, color: COLORS.text, fontSize: 13,
    borderWidth: 1, borderColor: '#2A2A50', minHeight: 72,
    textAlignVertical: 'top',
  },
  notesBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  notesCancelBtn: { fontSize: 13, color: COLORS.textMuted, paddingVertical: 4 },
  notesSaveBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: BORDER_RADIUS.md },
  notesSaveBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  notesText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18 },

  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trendTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, textTransform: 'uppercase', letterSpacing: 0.4 },
  trendDelta: { fontSize: 13, fontWeight: '700' },
  trendEmpty: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 24, alignItems: 'center' },
  trendEmptyText: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
  trendStats: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg,
    padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#2A2A50',
  },
  trendStatItem: { alignItems: 'center' },
  trendStatVal: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  trendStatLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
});
