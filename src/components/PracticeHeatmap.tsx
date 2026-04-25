import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CalendarDay } from '../utils/storage';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface Props {
  days: CalendarDay[];          // chronological, oldest first
  weeks?: number;                // typically 12, but the component is data-agnostic
  /** Cell edge length in px. The default 12 matches the existing calendar grid. */
  cellSize?: number;
  /** Gap between cells. */
  cellGap?: number;
}

const DAY_LABELS = ['', 'M', '', 'W', '', 'F', '']; // sparse to avoid clutter

// Intensity buckets (XP thresholds match the previous calendar implementation)
const INTENSITY_COLORS = ['#1E1E3A', '#2d1f6e', '#4c35b5', '#7c6af7', '#a78bfa'];

function intensityFor(xp: number): number {
  if (xp === 0) return 0;
  if (xp < 50) return 1;
  if (xp < 100) return 2;
  if (xp < 200) return 3;
  return 4;
}

function formatLongDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function shortMonthName(monthIdx: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIdx];
}

export default function PracticeHeatmap({
  days,
  cellSize = 14,
  cellGap = 3,
}: Props) {
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  // Group days into Sun→Sat columns. Pad the leading edge so the very first
  // column starts on Sunday (some leading cells may be invisible spacers).
  const columns = useMemo(() => {
    if (days.length === 0) return [] as { day: CalendarDay | null; key: string }[][];
    const firstDow = days[0].dayOfWeek; // 0 = Sun
    const cols: { day: CalendarDay | null; key: string }[][] = [];
    let buf: { day: CalendarDay | null; key: string }[] = [];

    // Leading invisible spacers
    for (let i = 0; i < firstDow; i++) {
      buf.push({ day: null, key: `pad-${i}` });
    }
    for (const d of days) {
      buf.push({ day: d, key: d.date });
      if (buf.length === 7) {
        cols.push(buf);
        buf = [];
      }
    }
    if (buf.length > 0) {
      while (buf.length < 7) buf.push({ day: null, key: `tail-${buf.length}` });
      cols.push(buf);
    }
    return cols;
  }, [days]);

  // Month labels above each column where the month changes
  const monthLabels = useMemo(() => {
    const labels: { col: number; text: string }[] = [];
    let lastMonth = -1;
    columns.forEach((col, ci) => {
      const firstReal = col.find(c => c.day);
      if (!firstReal?.day) return;
      const m = new Date(firstReal.day.date + 'T00:00:00').getMonth();
      if (m !== lastMonth) {
        // Only label if there's reasonable space — skip if previous label was within 2 cols
        const prev = labels[labels.length - 1];
        if (!prev || ci - prev.col >= 3) {
          labels.push({ col: ci, text: shortMonthName(m) });
          lastMonth = m;
        }
      }
    });
    return labels;
  }, [columns]);

  // Stats banner
  const stats = useMemo(() => {
    const practiced = days.filter(d => d.xp > 0).length;
    const protectedCount = days.filter(d => d.freezeProtected).length;
    const restoredCount = days.filter(d => d.restored).length;
    const totalXp = days.reduce((sum, d) => sum + d.xp, 0);
    return { practiced, protectedCount, restoredCount, totalXp };
  }, [days]);

  const cellWidth = cellSize + cellGap;

  return (
    <View>
      {/* Stats banner */}
      <View style={styles.statsBanner}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.practiced}</Text>
          <Text style={styles.statLabel}>active days</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{stats.totalXp}</Text>
          <Text style={styles.statLabel}>total XP</Text>
        </View>
        {stats.protectedCount > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#7DD3FC' }]}>
                ❄️ {stats.protectedCount}
              </Text>
              <Text style={styles.statLabel}>protected</Text>
            </View>
          </>
        )}
        {stats.restoredCount > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#FB923C' }]}>
                🔥 {stats.restoredCount}
              </Text>
              <Text style={styles.statLabel}>restored</Text>
            </View>
          </>
        )}
      </View>

      {/* Month labels row */}
      <View style={[styles.monthRow, { marginLeft: 16, height: 14 }]}>
        {monthLabels.map(m => (
          <Text
            key={`${m.col}-${m.text}`}
            style={[styles.monthLabel, { left: m.col * cellWidth }]}
          >
            {m.text}
          </Text>
        ))}
      </View>

      <View style={styles.gridRow}>
        {/* Day-of-week labels column */}
        <View style={[styles.dowCol, { gap: cellGap }]}>
          {DAY_LABELS.map((l, i) => (
            <View
              key={i}
              style={{ height: cellSize, justifyContent: 'center', width: 12 }}
            >
              <Text style={styles.dowLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Heatmap grid */}
        <View style={styles.grid}>
          {columns.map((col, ci) => (
            <View key={ci} style={{ marginRight: cellGap, gap: cellGap }}>
              {col.map(({ day, key }) => {
                if (!day) {
                  return <View key={key} style={{ width: cellSize, height: cellSize }} />;
                }
                const intensity = intensityFor(day.xp);
                const isProtected = day.freezeProtected;
                const isRestored = day.restored;

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => setSelected(day)}
                    activeOpacity={0.6}
                    style={[
                      {
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 3,
                        backgroundColor: isProtected
                          ? '#1E3A5F'
                          : isRestored
                          ? '#3F2410'
                          : INTENSITY_COLORS[intensity],
                      },
                      isProtected && {
                        borderWidth: 1.5,
                        borderColor: '#7DD3FC',
                      },
                      isRestored && {
                        borderWidth: 1.5,
                        borderColor: '#FB923C',
                      },
                      day.isToday && {
                        borderWidth: 1.5,
                        borderColor: '#A78BFA',
                      },
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendGroup}>
          <Text style={styles.legendText}>Less</Text>
          {INTENSITY_COLORS.map((c, i) => (
            <View
              key={i}
              style={[styles.legendDot, { backgroundColor: c }]}
            />
          ))}
          <Text style={styles.legendText}>More</Text>
        </View>
        {stats.protectedCount > 0 && (
          <View style={styles.legendGroup}>
            <View style={[styles.legendDot, { backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#7DD3FC' }]} />
            <Text style={styles.legendText}>❄️ Frozen</Text>
          </View>
        )}
      </View>

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            {selected && (
              <>
                <Text style={styles.modalDate}>{formatLongDate(selected.date)}</Text>

                {selected.freezeProtected ? (
                  <View style={styles.modalStateRow}>
                    <Ionicons name="snow" size={20} color="#7DD3FC" />
                    <Text style={[styles.modalStateText, { color: '#7DD3FC' }]}>
                      Streak Freeze used
                    </Text>
                  </View>
                ) : selected.restored ? (
                  <View style={styles.modalStateRow}>
                    <Ionicons name="flame" size={20} color="#FB923C" />
                    <Text style={[styles.modalStateText, { color: '#FB923C' }]}>
                      Streak restored
                    </Text>
                  </View>
                ) : selected.xp > 0 ? (
                  <View style={styles.modalStateRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#A78BFA" />
                    <Text style={[styles.modalStateText, { color: '#A78BFA' }]}>
                      Practiced
                    </Text>
                  </View>
                ) : (
                  <View style={styles.modalStateRow}>
                    <Ionicons name="ellipse-outline" size={20} color={COLORS.textMuted} />
                    <Text style={[styles.modalStateText, { color: COLORS.textMuted }]}>
                      No practice
                    </Text>
                  </View>
                )}

                {selected.xp > 0 && (
                  <Text style={styles.modalXp}>{selected.xp} XP earned</Text>
                )}

                {selected.isToday && (
                  <Text style={styles.modalToday}>Today</Text>
                )}

                <TouchableOpacity onPress={() => setSelected(null)} style={styles.modalDismiss}>
                  <Text style={styles.modalDismissText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 4,
  },
  monthRow: {
    position: 'relative',
    marginBottom: 4,
  },
  monthLabel: {
    position: 'absolute',
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
    top: 0,
  },
  gridRow: {
    flexDirection: 'row',
  },
  dowCol: {
    marginRight: 4,
  },
  dowLabel: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flex: 1,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 12,
  },
  legendGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 22,
    minWidth: 280,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
  },
  modalStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  modalStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalXp: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  modalToday: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '700',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalDismiss: {
    marginTop: 18,
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalDismissText: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '700',
  },
});
