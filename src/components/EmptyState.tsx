import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;              // emoji icon
  ionicon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  compact?: boolean;          // smaller padding for use inside cards
}

export default function EmptyState({
  icon,
  ionicon,
  title,
  body,
  ctaLabel,
  onCta,
  compact = false,
}: EmptyStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {/* Icon */}
      {ionicon ? (
        <View style={styles.ioniconWrap}>
          <Ionicons name={ionicon} size={32} color={COLORS.textMuted} />
        </View>
      ) : icon ? (
        <Text style={styles.emoji}>{icon}</Text>
      ) : null}

      <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
      <Text style={[styles.body, compact && styles.bodyCompact]}>{body}</Text>

      {ctaLabel && onCta && (
        <TouchableOpacity style={styles.cta} onPress={onCta}>
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Pre-configured empties for each screen ────────────────────────────────────

export function EmptySessionHistory({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      icon="🎵"
      title="No sessions yet"
      body="Complete your first exercise to see your session history here."
      ctaLabel={onStart ? "Start practicing" : undefined}
      onCta={onStart}
    />
  );
}

export function EmptyRecordings({ onStart }: { onStart?: () => void }) {
  return (
    <EmptyState
      icon="🎙️"
      title="No recordings yet"
      body="Complete a Scales or Songs exercise to see your recordings here with pitch overlay playback."
      ctaLabel={onStart ? "Try Scales" : undefined}
      onCta={onStart}
    />
  );
}

export function EmptyFavoriteRecordings() {
  return (
    <EmptyState
      icon="♥"
      title="No favorites yet"
      body="Tap the heart on any recording to save it here for quick access."
      compact
    />
  );
}

export function EmptyAchievements() {
  return (
    <EmptyState
      ionicon="trophy-outline"
      title="Achievements loading..."
      body="Keep practicing and your earned achievements will appear here."
      compact
    />
  );
}

export function EmptyVocalRange({ onTest }: { onTest?: () => void }) {
  return (
    <EmptyState
      icon="🎤"
      title="Range not tested yet"
      body="Use the Pitch Detector to find your vocal range. It takes about 2 minutes."
      ctaLabel={onTest ? "Test my range" : undefined}
      onCta={onTest}
    />
  );
}

export function EmptySkillTree() {
  return (
    <EmptyState
      icon="🌱"
      title="Loading your skill tree..."
      body="Your skills are being calculated based on your practice history."
      compact
    />
  );
}

export function EmptyCoachHistory() {
  return (
    <EmptyState
      icon="🎤"
      title="Meet your Vocal Coach"
      body="Ask anything about singing technique, breath control, or how to improve your pitch. Your coach knows your training history."
      compact
    />
  );
}

export function EmptyWeeklyPlan() {
  return (
    <EmptyState
      icon="📋"
      title="No plan yet"
      body='Tap "Generate My Plan" and Claude will create a personalized 7-day training schedule based on your progress.'
      compact
    />
  );
}

export function EmptyDailyChallenge() {
  return (
    <EmptyState
      ionicon="flash-outline"
      title="Challenge loading..."
      body="Today's challenge will appear here. Check back in a moment."
      compact
    />
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  compact: {
    paddingVertical: 20,
  },
  ioniconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  emoji: {
    fontSize: 44,
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 15,
  },
  body: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  bodyCompact: {
    fontSize: 12,
    lineHeight: 17,
  },
  cta: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: BORDER_RADIUS.lg,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
