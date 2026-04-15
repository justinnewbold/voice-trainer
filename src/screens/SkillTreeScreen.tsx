import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Animated, Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import { loadProgress, UserProgress } from '../utils/storage';
import { ScreenErrorBoundary } from '../components/ErrorBoundary';
import { SkeletonSkillTier } from '../components/Skeleton';
import {
  loadSkillProgress, resolveSkillNodes, checkAndAwardSkills,
  SkillNode, SkillProgress, SKILL_DEFS, TIER_LABELS, TIER_COLORS,
} from '../utils/skillTree';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Node sizes & layout ─────────────────────────────────────────────────────
const NODE_SIZE = 72;
const NODE_GAP = 16;
const NODES_PER_ROW = 3;

// ─── Status styling ──────────────────────────────────────────────────────────
function nodeColors(node: SkillNode, tierColor: string) {
  switch (node.status) {
    case 'completed':
      return { bg: tierColor + '33', border: tierColor, icon: tierColor, ring: tierColor + '66' };
    case 'in_progress':
      return { bg: COLORS.primary + '22', border: COLORS.primaryLight, icon: COLORS.primaryLight, ring: COLORS.primaryLight + '44' };
    case 'available':
      return { bg: COLORS.surface, border: COLORS.primary + '88', icon: COLORS.text, ring: COLORS.primary + '33' };
    case 'locked':
    default:
      return { bg: '#0E0E20', border: '#2A2A50', icon: COLORS.textMuted, ring: 'transparent' };
  }
}

// ─── Connector line between rows ─────────────────────────────────────────────
function TierConnector({ fromTier, toTier, nodes }: { fromTier: number; toTier: number; nodes: SkillNode[] }) {
  const fromDefs = SKILL_DEFS.filter(d => d.tier === fromTier);
  const allFromDone = fromDefs.every(d => nodes.find(n => n.id === d.id)?.status === 'completed');
  const color = allFromDone ? TIER_COLORS[toTier] : '#2A2A50';
  return (
    <View style={styles.connectorWrapper}>
      <View style={[styles.connectorLine, { backgroundColor: color }]} />
      <View style={[styles.connectorDot, { backgroundColor: color }]} />
    </View>
  );
}

// ─── Individual node ─────────────────────────────────────────────────────────
function SkillNodeCard({ node, tierColor, onPress }: { node: SkillNode; tierColor: string; onPress: () => void }) {
  const colors = nodeColors(node, tierColor);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.85} style={styles.nodeWrapper}>
        {/* Glow ring for completed/in-progress */}
        {(node.status === 'completed' || node.status === 'in_progress') && (
          <View style={[styles.nodeRing, { borderColor: colors.ring, width: NODE_SIZE + 10, height: NODE_SIZE + 10, borderRadius: (NODE_SIZE + 10) / 2, top: -5, left: -5 }]} />
        )}

        <View style={[styles.nodeCircle, { backgroundColor: colors.bg, borderColor: colors.border, width: NODE_SIZE, height: NODE_SIZE, borderRadius: NODE_SIZE / 2 }]}>
          {node.status === 'locked'
            ? <Ionicons name="lock-closed" size={22} color={COLORS.textMuted} />
            : <Text style={[styles.nodeIcon, node.status === 'locked' && { opacity: 0.3 }]}>{node.icon}</Text>
          }
          {node.status === 'completed' && (
            <View style={[styles.completedBadge, { backgroundColor: tierColor }]}>
              <Ionicons name="checkmark" size={10} color="#fff" />
            </View>
          )}
        </View>

        {/* Progress ring arc (in_progress) */}
        {node.status === 'in_progress' && (
          <View style={[styles.progressArc, { width: NODE_SIZE, height: 4, borderRadius: 2, bottom: -6 }]}>
            <View style={[styles.progressArcFill, { width: `${Math.round(node.progressPct * 100)}%`, backgroundColor: COLORS.primaryLight }]} />
          </View>
        )}

        <Text style={[styles.nodeLabel, node.status === 'locked' && { color: COLORS.textMuted }]} numberOfLines={2}>
          {node.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Tier Row ─────────────────────────────────────────────────────────────────
function TierRow({ tier, nodes, onNodePress }: { tier: number; nodes: SkillNode[]; onNodePress: (node: SkillNode) => void }) {
  const color = TIER_COLORS[tier];
  const tierNodes = nodes.filter(n => n.tier === tier);
  const completedCount = tierNodes.filter(n => n.status === 'completed').length;
  const pct = tierNodes.length > 0 ? completedCount / tierNodes.length : 0;

  return (
    <View style={styles.tierRow}>
      {/* Tier header */}
      <View style={styles.tierHeader}>
        <View style={[styles.tierBadge, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          <Text style={[styles.tierNum, { color }]}>TIER {tier}</Text>
        </View>
        <Text style={[styles.tierLabel, { color }]}>{TIER_LABELS[tier]}</Text>
        <View style={styles.tierProgress}>
          <Text style={[styles.tierCount, { color: color }]}>{completedCount}/{tierNodes.length}</Text>
          <View style={styles.tierProgressBar}>
            <View style={[styles.tierProgressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
          </View>
        </View>
      </View>

      {/* Node grid */}
      <View style={styles.nodeGrid}>
        {tierNodes.map(node => (
          <SkillNodeCard
            key={node.id}
            node={node}
            tierColor={color}
            onPress={() => onNodePress(node)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function SkillDetailModal({
  node, visible, onClose, progress, skillProgress, onMarkComplete
}: {
  node: SkillNode | null;
  visible: boolean;
  onClose: () => void;
  progress: UserProgress | null;
  skillProgress: SkillProgress | null;
  onMarkComplete?: (node: SkillNode) => void;
}) {
  const router = useRouter();
  if (!node) return null;

  const color = TIER_COLORS[node.tier];
  const colors = nodeColors(node, color);
  const pctDisplay = Math.round(node.progressPct * 100);

  const statusLabel: Record<string, string> = {
    completed: '✅ Completed',
    in_progress: '⏳ In Progress',
    available: '✨ Available',
    locked: '🔒 Locked',
  };

  const handleNavigate = () => {
    if (node.route) {
      onClose();
      setTimeout(() => router.push(node.route as any), 150);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Drag handle */}
          <View style={styles.modalHandle} />

          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconCircle, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              {node.status === 'locked'
                ? <Ionicons name="lock-closed" size={28} color={COLORS.textMuted} />
                : <Text style={styles.modalIcon}>{node.icon}</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalName}>{node.name}</Text>
              <Text style={[styles.modalStatus, { color }]}>{statusLabel[node.status]}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.modalDesc}>{node.description}</Text>

          {/* Progress bar (if unlocked + not complete) */}
          {(node.status === 'in_progress' || node.status === 'available') && (
            <View style={styles.modalProgressSection}>
              <View style={styles.modalProgressHeader}>
                <Text style={styles.modalProgressLabel}>Progress</Text>
                <Text style={[styles.modalProgressPct, { color }]}>{pctDisplay}%</Text>
              </View>
              <View style={styles.modalProgressBar}>
                <View style={[styles.modalProgressFill, { width: `${pctDisplay}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.modalProgressDetail}>{node.progressCurrent} / {node.progressTotal}</Text>
            </View>
          )}

          {/* Locked: show what's needed */}
          {node.status === 'locked' && node.unlockRequires.completedSkillIds && (
            <View style={styles.modalLockSection}>
              <Text style={styles.modalLockTitle}>🔒 Complete these skills first:</Text>
              {node.unlockRequires.completedSkillIds.map(id => {
                const dep = SKILL_DEFS.find(d => d.id === id);
                const done = skillProgress?.completedIds.includes(id);
                return dep ? (
                  <View key={id} style={styles.modalLockItem}>
                    <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={done ? COLORS.success : COLORS.textMuted} />
                    <Text style={[styles.modalLockItemText, done && { color: COLORS.success }]}>{dep.icon} {dep.name}</Text>
                  </View>
                ) : null;
              })}
            </View>
          )}

          {/* Rewards */}
          <View style={styles.modalRewards}>
            <View style={[styles.modalRewardChip, { borderColor: '#F59E0B44' }]}>
              <Text style={styles.modalRewardText}>⭐ {node.xpReward} XP</Text>
            </View>
            <View style={[styles.modalRewardChip, { borderColor: '#EC489944' }]}>
              <Text style={styles.modalRewardText}>💎 {node.gemReward} gems</Text>
            </View>
          </View>

          {/* CTA */}
          {node.status !== 'locked' && node.status !== 'completed' && node.route && (
            <TouchableOpacity style={[styles.modalCTA, { backgroundColor: color }]} onPress={handleNavigate}>
              <Text style={styles.modalCTAText}>{node.routeLabel ?? 'Go Practice'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          )}

          {node.status === 'completed' && (
            <View style={[styles.modalComplete, { backgroundColor: color + '22', borderColor: color + '44' }]}>
              <Text style={[styles.modalCompleteText, { color }]}>🎉 Skill Mastered!</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SkillTreeScreen() {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [skillProgress, setSkillProgress] = useState<SkillProgress | null>(null);
  const [nodes, setNodes] = useState<SkillNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetch = useCallback(async () => {
    const [p, sp] = await Promise.all([loadProgress(), loadSkillProgress()]);
    // Auto-check for newly completed skills
    const { skillProgress: updatedSP } = await checkAndAwardSkills(p);
    const resolved = resolveSkillNodes(p, updatedSP);
    setProgress(p);
    setSkillProgress(updatedSP);
    setNodes(resolved);
  }, []);

  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  const handleNodePress = (node: SkillNode) => {
    setSelectedNode(node);
    setModalVisible(true);
  };

  const totalSkills = SKILL_DEFS.length;
  const completedSkills = nodes.filter(n => n.status === 'completed').length;
  const overallPct = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
  const tierNumbers = [1, 2, 3, 4, 5] as const;

  return (
    <ScreenErrorBoundary>
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
          <Text style={styles.title}>🌳 Skill Tree</Text>
          <Text style={styles.subtitle}>{completedSkills} of {totalSkills} skills mastered</Text>
          <View style={styles.overallBar}>
            <View style={[styles.overallFill, { width: `${overallPct}%` }]} />
          </View>
          <Text style={styles.overallPct}>{overallPct}% complete</Text>
        </LinearGradient>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {[
            { label: 'XP Earned', value: `⭐ ${skillProgress?.earnedXP ?? 0}` },
            { label: 'Gems Earned', value: `💎 ${skillProgress?.earnedGems ?? 0}` },
            { label: 'Skills Done', value: `🏅 ${completedSkills}` },
          ].map(s => (
            <View key={s.label} style={styles.statChip}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Tier rows with connectors */}
        {tierNumbers.map((tier, idx) => (
          <View key={tier}>
            <TierRow tier={tier} nodes={nodes} onNodePress={handleNodePress} />
            {idx < tierNumbers.length - 1 && (
              <TierConnector fromTier={tier} toTier={tier + 1} nodes={nodes} />
            )}
          </View>
        ))}

        <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
      </ScrollView>

      <SkillDetailModal
        node={selectedNode}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        progress={progress}
        skillProgress={skillProgress}
      />
    </View>
    </ScreenErrorBoundary>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 24 },

  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: SPACING.lg,
  },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  overallBar: { height: 8, backgroundColor: '#2A2A50', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  overallFill: { height: '100%', backgroundColor: COLORS.primaryLight, borderRadius: 4 },
  overallPct: { fontSize: 12, color: COLORS.textMuted },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  statValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  statLabel: { fontSize: 10, color: COLORS.textMuted },

  // Tier
  tierRow: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#10102280',
    borderRadius: BORDER_RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  tierBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tierNum: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  tierLabel: { fontSize: 15, fontWeight: '700', flex: 1 },
  tierProgress: { alignItems: 'flex-end', gap: 4 },
  tierCount: { fontSize: 12, fontWeight: '700' },
  tierProgressBar: { width: 60, height: 4, backgroundColor: '#2A2A50', borderRadius: 2, overflow: 'hidden' },
  tierProgressFill: { height: '100%', borderRadius: 2 },

  // Node grid
  nodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: NODE_GAP,
    justifyContent: 'space-around',
  },
  nodeWrapper: {
    alignItems: 'center',
    width: NODE_SIZE + 8,
    position: 'relative',
  },
  nodeRing: {
    position: 'absolute',
    borderWidth: 1.5,
    zIndex: 0,
  },
  nodeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
    position: 'relative',
  },
  nodeIcon: { fontSize: 26 },
  completedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 14,
  },
  progressArc: {
    backgroundColor: '#2A2A50',
    overflow: 'hidden',
    marginTop: 4,
    width: NODE_SIZE,
  },
  progressArcFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Connector
  connectorWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  connectorLine: {
    width: 2,
    height: 24,
  },
  connectorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalCard: {
    backgroundColor: '#13132A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    borderTopWidth: 1,
    borderTopColor: '#2A2A5066',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ffffff30',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  modalIcon: { fontSize: 28 },
  modalName: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  modalStatus: { fontSize: 13, fontWeight: '600' },
  modalDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalProgressSection: { marginBottom: 16 },
  modalProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  modalProgressLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  modalProgressPct: { fontSize: 13, fontWeight: '700' },
  modalProgressBar: {
    height: 8,
    backgroundColor: '#2A2A50',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  modalProgressFill: { height: '100%', borderRadius: 4 },
  modalProgressDetail: { fontSize: 12, color: COLORS.textMuted, textAlign: 'right' },
  modalLockSection: { marginBottom: 16 },
  modalLockTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  modalLockItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalLockItemText: { fontSize: 13, color: COLORS.textMuted },
  modalRewards: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  modalRewardChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#1E1E3A',
  },
  modalRewardText: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  modalCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: BORDER_RADIUS.lg,
  },
  modalCTAText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalComplete: {
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalCompleteText: { fontSize: 16, fontWeight: '700' },
});
