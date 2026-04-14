import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { COLORS, BORDER_RADIUS, SPACING } from '../constants/theme';
import {
  DailyPlan, PlanStep, generateDailyPlan, markStepComplete, clearDailyPlan,
} from '../utils/dailyPlan';

const STEP_COLORS = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B', '#EC4899'];

// ─── Step Card ────────────────────────────────────────────────────────────────
function StepCard({
  step, index, isCompleted, onPress,
}: {
  step: PlanStep;
  index: number;
  isCompleted: boolean;
  onPress: () => void;
}) {
  const color = STEP_COLORS[index % STEP_COLORS.length];
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.stepCard, isCompleted && styles.stepCardDone, { borderLeftColor: color }]}
        onPress={handlePress}
        activeOpacity={0.85}
      >
        {/* Number + icon */}
        <View style={styles.stepLeft}>
          <View style={[styles.stepCircle, { backgroundColor: isCompleted ? color : color + '33', borderColor: color }]}>
            {isCompleted
              ? <Ionicons name="checkmark" size={18} color="#fff" />
              : <Text style={[styles.stepNum, { color }]}>{index + 1}</Text>
            }
          </View>
          {/* Vertical line connector (not on last) */}
          <View style={styles.stepConnector} />
        </View>

        {/* Content */}
        <View style={styles.stepContent}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, isCompleted && styles.stepTitleDone]}>{step.title}</Text>
              <Text style={styles.stepSub}>{step.subtitle}</Text>
            </View>
            <View style={styles.stepMeta}>
              <Text style={styles.stepDuration}>⏱ {step.duration}</Text>
              <Text style={styles.stepXp}>+{step.xpBonus} XP</Text>
            </View>
          </View>

          {/* Tip */}
          {!isCompleted && (
            <View style={styles.tipRow}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>{step.tip}</Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: isCompleted ? '#1E2A1E' : color }]}
            onPress={handlePress}
          >
            <Text style={[styles.stepBtnText, isCompleted && { color: COLORS.success }]}>
              {isCompleted ? '✅ Completed' : 'Start →'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DailyPlanScreen() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const loadPlan = useCallback(async (force = false) => {
    if (force) setRegenerating(true);
    else setLoading(true);
    const p = await generateDailyPlan(force);
    setPlan(p);
    setLoading(false);
    setRegenerating(false);
  }, []);

  useFocusEffect(useCallback(() => { loadPlan(); }, [loadPlan]));

  const handleStepPress = async (step: PlanStep) => {
    // Mark as complete + navigate
    await markStepComplete(step.id);
    setPlan(prev => prev ? {
      ...prev,
      completedStepIds: [...prev.completedStepIds.filter(id => id !== step.id), step.id],
    } : prev);
    router.push(step.route as any);
  };

  const completedCount = plan?.completedStepIds.length ?? 0;
  const totalSteps = plan?.steps.length ?? 0;
  const allDone = completedCount === totalSteps && totalSteps > 0;
  const pct = totalSteps > 0 ? completedCount / totalSteps : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.loadingGrad} />
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingTitle}>Building your plan...</Text>
        <Text style={styles.loadingText}>Claude is analyzing your progress and crafting today's perfect practice sequence.</Text>
      </View>
    );
  }

  if (!plan) return null;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 100 : 80 }}>
      {/* Header */}
      <LinearGradient colors={['#1a0a2e', COLORS.background]} style={styles.header}>
        <Text style={styles.greeting}>{plan.greeting}</Text>
        <Text style={styles.focusArea}>Today's focus: {plan.focusArea}</Text>
        <Text style={styles.summary}>{plan.summary}</Text>

        {/* Progress ring / bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, {
              width: `${Math.round(pct * 100)}%`,
              backgroundColor: allDone ? COLORS.success : COLORS.primaryLight,
            }]} />
          </View>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>
              {allDone ? '🎉 All done!' : `${completedCount} of ${totalSteps} complete`}
            </Text>
            <Text style={styles.totalDuration}>⏱ {plan.totalDuration} total</Text>
          </View>
        </View>

        {/* Motivational note */}
        {plan.motivationalNote ? (
          <View style={styles.motNote}>
            <Text style={styles.motNoteText}>{plan.motivationalNote}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Steps */}
      <View style={styles.stepsSection}>
        <View style={styles.stepsSectionHeader}>
          <Text style={styles.stepsSectionTitle}>Today's Exercises</Text>
          <TouchableOpacity
            onPress={() => loadPlan(true)}
            disabled={regenerating}
            style={styles.regenBtn}
          >
            {regenerating
              ? <ActivityIndicator size="small" color={COLORS.primaryLight} />
              : <><Ionicons name="refresh" size={14} color={COLORS.primaryLight} /><Text style={styles.regenText}> Regenerate</Text></>
            }
          </TouchableOpacity>
        </View>

        {plan.steps.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            index={i}
            isCompleted={plan.completedStepIds.includes(step.id)}
            onPress={() => handleStepPress(step)}
          />
        ))}
      </View>

      {/* Completion banner */}
      {allDone && (
        <View style={styles.completeBanner}>
          <Text style={styles.completeBannerEmoji}>🏆</Text>
          <Text style={styles.completeBannerTitle}>Plan complete!</Text>
          <Text style={styles.completeBannerSub}>
            You finished all {totalSteps} exercises. Check back tomorrow for a fresh plan.
          </Text>
          <TouchableOpacity
            style={styles.progressBtn}
            onPress={() => router.push('/(tabs)/progress')}
          >
            <Text style={styles.progressBtnText}>View Progress →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* XP summary */}
      <View style={styles.xpSummary}>
        <Text style={styles.xpSummaryLabel}>Plan reward</Text>
        <Text style={styles.xpSummaryValue}>
          ⭐ {plan.steps.reduce((a, s) => a + s.xpBonus, 0)} XP · 💎 {plan.steps.length * 3} gems
        </Text>
        <Text style={styles.xpSummarySub}>Earned when all steps are completed</Text>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  loadingContainer: {
    flex: 1, backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  loadingGrad: { ...StyleSheet.absoluteFillObject },
  loadingTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  loadingText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  header: {
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: SPACING.lg,
  },
  greeting: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  focusArea: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },
  summary: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 16 },

  progressSection: { marginBottom: 12 },
  progressBar: {
    height: 8, backgroundColor: '#2A2A50', borderRadius: 4,
    overflow: 'hidden', marginBottom: 6,
  },
  progressFill: { height: '100%', borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  totalDuration: { fontSize: 12, color: COLORS.textMuted },

  motNote: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#7C3AED44',
  },
  motNoteText: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '600' },

  stepsSection: { paddingHorizontal: 16, paddingTop: 4 },
  stepsSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  stepsSectionTitle: {
    fontSize: 13, fontWeight: '700', color: COLORS.primaryLight,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  regenBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8 },
  regenText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },

  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A50',
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  stepCardDone: { opacity: 0.75 },

  stepLeft: { alignItems: 'center', paddingVertical: 16, paddingLeft: 12, paddingRight: 4 },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 4,
  },
  stepNum: { fontSize: 14, fontWeight: '800' },
  stepConnector: { flex: 1, width: 2, backgroundColor: '#2A2A50', borderRadius: 1, minHeight: 8 },

  stepContent: { flex: 1, padding: 14, paddingLeft: 8 },
  stepHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  stepIcon: { fontSize: 22, lineHeight: 28 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  stepTitleDone: { color: COLORS.textMuted },
  stepSub: { fontSize: 12, color: COLORS.textMuted },
  stepMeta: { alignItems: 'flex-end', gap: 2 },
  stepDuration: { fontSize: 11, color: COLORS.textMuted },
  stepXp: { fontSize: 11, color: '#A855F7', fontWeight: '700' },

  tipRow: {
    flexDirection: 'row', gap: 6,
    backgroundColor: '#1E1E3A',
    borderRadius: 8, padding: 8, marginBottom: 10,
  },
  tipIcon: { fontSize: 13 },
  tipText: { fontSize: 12, color: COLORS.textMuted, flex: 1, lineHeight: 16 },

  stepBtn: {
    paddingVertical: 9, paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md, alignItems: 'center',
  },
  stepBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  completeBanner: {
    margin: 16,
    backgroundColor: '#0D2A1A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.success + '44',
  },
  completeBannerEmoji: { fontSize: 40, marginBottom: 8 },
  completeBannerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.success, marginBottom: 6 },
  completeBannerSub: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  progressBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: BORDER_RADIUS.lg,
  },
  progressBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  xpSummary: {
    margin: 16, marginTop: 4,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A2A50',
    alignItems: 'center',
  },
  xpSummaryLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  xpSummaryValue: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  xpSummarySub: { fontSize: 11, color: COLORS.textMuted },
});
