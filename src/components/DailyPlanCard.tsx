import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { DailyPlan, generateDailyPlan } from '../utils/dailyPlan';

export default function DailyPlanCard() {
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateDailyPlan().then(p => { setPlan(p); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator size="small" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Building today's plan...</Text>
      </View>
    );
  }

  if (!plan) return null;

  const completedCount = plan.completedStepIds.length;
  const totalSteps = plan.steps.length;
  const pct = totalSteps > 0 ? completedCount / totalSteps : 0;
  const allDone = completedCount === totalSteps && totalSteps > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/dailyplan' as any)} activeOpacity={0.85}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBadge}>
            <Text style={styles.iconEmoji}>🗓</Text>
          </View>
          <View>
            <Text style={styles.cardTitle}>Today's Plan</Text>
            <Text style={styles.focusLabel}>{plan.focusArea}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.duration}>⏱ {plan.totalDuration}</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, {
          width: `${Math.round(pct * 100)}%`,
          backgroundColor: allDone ? COLORS.success : COLORS.primaryLight,
        }]} />
      </View>

      {/* Step pills */}
      <View style={styles.pillsRow}>
        {plan.steps.map((step, i) => {
          const done = plan.completedStepIds.includes(step.id);
          return (
            <View key={step.id} style={[styles.pill, done && styles.pillDone]}>
              <Text style={styles.pillIcon}>{step.icon}</Text>
              <Text style={[styles.pillLabel, done && styles.pillLabelDone]} numberOfLines={1}>
                {step.title}
              </Text>
              {done && <Ionicons name="checkmark-circle" size={12} color={COLORS.success} />}
            </View>
          );
        })}
      </View>

      {/* CTA */}
      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>
          {allDone
            ? '🎉 All done! Great work today.'
            : completedCount > 0
              ? `${totalSteps - completedCount} exercise${totalSteps - completedCount > 1 ? 's' : ''} remaining`
              : `${totalSteps} exercises ready`
          }
        </Text>
        <View style={[styles.ctaBtn, allDone && styles.ctaBtnDone]}>
          <Text style={[styles.ctaBtnText, allDone && styles.ctaBtnTextDone]}>
            {allDone ? 'Review' : completedCount > 0 ? 'Continue →' : 'Start →'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#7C3AED44',
  },
  loadingText: { fontSize: 13, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  iconBadge: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#7C3AED22', alignItems: 'center', justifyContent: 'center',
  },
  iconEmoji: { fontSize: 18 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  focusLabel: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  duration: { fontSize: 11, color: COLORS.textMuted },

  progressBar: { height: 5, backgroundColor: '#2A2A50', borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 3 },

  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1E1E3A', borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: '#2A2A50',
  },
  pillDone: { borderColor: COLORS.success + '44', backgroundColor: '#0D2A1A' },
  pillIcon: { fontSize: 12 },
  pillLabel: { fontSize: 11, color: COLORS.textSecondary, maxWidth: 70 },
  pillLabelDone: { color: COLORS.success },

  ctaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ctaText: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  ctaBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20,
  },
  ctaBtnDone: { backgroundColor: '#0D2A1A', borderWidth: 1, borderColor: COLORS.success + '44' },
  ctaBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  ctaBtnTextDone: { color: COLORS.success },
});
