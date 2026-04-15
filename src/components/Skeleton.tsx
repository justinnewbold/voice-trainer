import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

// ── Base shimmer ──────────────────────────────────────────────────────────────
interface ShimmerProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Shimmer({ width = '100%', height = 16, borderRadius = 8, style }: ShimmerProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: '#2A2A50', opacity },
        style,
      ]}
    />
  );
}

// ── Stat card skeleton (used in HomeScreen header strip) ──────────────────────
export function SkeletonStatStrip() {
  return (
    <View style={s.strip}>
      {[0, 1, 2, 3].map(i => (
        <View key={i} style={s.stripItem}>
          <Shimmer width={36} height={18} borderRadius={4} style={{ marginBottom: 4 }} />
          <Shimmer width={48} height={10} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

// ── Section card skeleton ─────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <View style={s.card}>
      <Shimmer width={100} height={11} borderRadius={4} style={{ marginBottom: 12 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Shimmer
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={13}
          borderRadius={4}
          style={{ marginBottom: i < lines - 1 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

// ── List row skeleton ─────────────────────────────────────────────────────────
export function SkeletonRow() {
  return (
    <View style={s.row}>
      <Shimmer width={40} height={40} borderRadius={12} />
      <View style={{ flex: 1, gap: 6 }}>
        <Shimmer width="70%" height={13} borderRadius={4} />
        <Shimmer width="45%" height={10} borderRadius={4} />
      </View>
      <Shimmer width={36} height={22} borderRadius={10} />
    </View>
  );
}

// ── Quick action grid skeleton ────────────────────────────────────────────────
export function SkeletonQuickGrid() {
  return (
    <View style={s.quickGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={s.quickCard}>
          <Shimmer width={44} height={44} borderRadius={12} style={{ marginBottom: 8 }} />
          <Shimmer width="70%" height={12} borderRadius={4} style={{ marginBottom: 4 }} />
          <Shimmer width="50%" height={10} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

// ── Challenge card skeleton ───────────────────────────────────────────────────
export function SkeletonChallengeCard() {
  return (
    <View style={s.challengeCard}>
      <View style={{ flex: 1, gap: 6 }}>
        <Shimmer width="60%" height={15} borderRadius={4} />
        <Shimmer width="80%" height={11} borderRadius={4} />
        <Shimmer width="40%" height={12} borderRadius={4} />
      </View>
      <Shimmer width={56} height={44} borderRadius={10} />
    </View>
  );
}

// ── Progress bar skeleton ─────────────────────────────────────────────────────
export function SkeletonProgressBar() {
  return (
    <View style={{ gap: 8 }}>
      <View style={s.levelRow}>
        <Shimmer width={120} height={14} borderRadius={4} />
        <Shimmer width={60} height={12} borderRadius={4} />
      </View>
      <Shimmer width="100%" height={10} borderRadius={5} />
      <Shimmer width={140} height={10} borderRadius={4} />
    </View>
  );
}

// ── Bar chart skeleton (7-day accuracy) ──────────────────────────────────────
export function SkeletonBarChart() {
  const heights = [60, 80, 45, 90, 55, 75, 70];
  return (
    <View style={s.barChart}>
      {heights.map((h, i) => (
        <View key={i} style={s.barItem}>
          <View style={[s.barTrack]}>
            <Shimmer width="100%" height={h} borderRadius={3} style={{ marginTop: 'auto' as any }} />
          </View>
          <Shimmer width={20} height={9} borderRadius={3} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

// ── Achievement row skeleton ──────────────────────────────────────────────────
export function SkeletonAchievementRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.row, { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2A2A50' }]}>
          <Shimmer width={26} height={26} borderRadius={13} />
          <View style={{ flex: 1, gap: 5 }}>
            <Shimmer width="55%" height={13} borderRadius={4} />
            <Shimmer width="75%" height={10} borderRadius={4} />
          </View>
          <Shimmer width={22} height={22} borderRadius={11} />
        </View>
      ))}
    </>
  );
}

// ── Skill tree node skeleton ──────────────────────────────────────────────────
export function SkeletonSkillTier() {
  return (
    <View style={s.tierCard}>
      <View style={s.tierHeader}>
        <Shimmer width={60} height={22} borderRadius={8} />
        <Shimmer width={100} height={16} borderRadius={4} style={{ flex: 1, marginLeft: 10 }} />
        <Shimmer width={50} height={16} borderRadius={4} />
      </View>
      <View style={s.nodeRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={s.nodeItem}>
            <Shimmer width={72} height={72} borderRadius={36} />
            <Shimmer width={60} height={20} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Recording row skeleton ────────────────────────────────────────────────────
export function SkeletonRecordingRows({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[s.row, s.recordingRow]}>
          <Shimmer width={40} height={40} borderRadius={12} />
          <View style={{ flex: 1, gap: 5 }}>
            <Shimmer width="65%" height={14} borderRadius={4} />
            <Shimmer width="40%" height={10} borderRadius={4} />
            <Shimmer width={120} height={24} borderRadius={4} style={{ marginTop: 2 }} />
          </View>
          <View style={{ gap: 8, alignItems: 'center' }}>
            <Shimmer width={40} height={22} borderRadius={10} />
            <Shimmer width={18} height={18} borderRadius={9} />
          </View>
        </View>
      ))}
    </>
  );
}

// ── Full home screen skeleton ─────────────────────────────────────────────────
export function SkeletonHomeScreen() {
  return (
    <View style={s.homeContainer}>
      {/* Header area */}
      <View style={s.homeHeader}>
        <View style={{ gap: 8 }}>
          <Shimmer width={160} height={26} borderRadius={6} />
          <Shimmer width={100} height={14} borderRadius={4} />
        </View>
        <Shimmer width={70} height={32} borderRadius={16} />
      </View>
      <Shimmer width="100%" height={8} borderRadius={4} style={{ marginBottom: 6 }} />
      <Shimmer width="50%" height={10} borderRadius={4} style={{ marginBottom: 16 }} />
      <SkeletonStatStrip />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
  },
  stripItem: {
    flex: 1,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#13132A',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#13132A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  recordingRow: {
    marginBottom: 8,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCard: {
    width: '30%',
    backgroundColor: '#1E1E3A',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  challengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E3A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A5055',
    gap: 12,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: 4,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '80%',
    justifyContent: 'flex-end',
  },
  tierCard: {
    backgroundColor: '#10102280',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A50',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nodeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nodeItem: {
    alignItems: 'center',
  },
  homeContainer: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  homeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
});
