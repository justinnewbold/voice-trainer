import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, ScrollView } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText, Path, Defs, LinearGradient as SvgGradient, Stop, G } from 'react-native-svg';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { SessionReplay } from '../utils/sessionReplay';
import { UserProgress, levelInfo } from '../utils/storage';

interface Props {
  replay?: SessionReplay;
  progress?: UserProgress;
  exerciseName?: string;
  accuracy?: number;
  score?: number;
  onClose?: () => void;
}

const CARD_W = 320;
const CARD_H = 480;

function getGrade(accuracy: number): { letter: string; color: string; label: string } {
  if (accuracy >= 95) return { letter: 'S', color: '#fbbf24', label: 'Perfect' };
  if (accuracy >= 85) return { letter: 'A', color: '#10b981', label: 'Excellent' };
  if (accuracy >= 75) return { letter: 'B', color: '#06b6d4', label: 'Great' };
  if (accuracy >= 60) return { letter: 'C', color: '#f59e0b', label: 'Good' };
  return { letter: 'D', color: '#ef4444', label: 'Keep Practicing' };
}

function StarRow({ count }: { count: number }) {
  return (
    <G>
      {[0, 1, 2, 3, 4].map(i => (
        <SvgText key={i} x={CARD_W / 2 - 48 + i * 24} y={220} fontSize={18} textAnchor="middle" fill={i < count ? '#fbbf24' : '#2A2A50'}>★</SvgText>
      ))}
    </G>
  );
}

export function ScoreCardSVG({ replay, progress, exerciseName, accuracy: accProp, score: scoreProp }: Props) {
  const accuracy = accProp ?? replay?.accuracy ?? 0;
  const score = scoreProp ?? replay?.score ?? 0;
  const name = exerciseName ?? replay?.exerciseName ?? 'Session';
  const duration = replay ? Math.round(replay.durationMs / 1000) : 0;
  const hitCount = replay?.noteResults.filter(n => n.hit).length ?? 0;
  const totalNotes = replay?.noteResults.length ?? 0;
  const grade = getGrade(accuracy);
  const stars = accuracy >= 95 ? 5 : accuracy >= 85 ? 4 : accuracy >= 70 ? 3 : accuracy >= 55 ? 2 : 1;
  const li = progress ? levelInfo(progress.xp) : null;
  const streak = progress?.currentStreak ?? 0;
  const dateStr = new Date().toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Svg width={CARD_W} height={CARD_H}>
      <Defs>
        <SvgGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1a0a2e" />
          <Stop offset="1" stopColor="#0A0A1A" />
        </SvgGradient>
        <SvgGradient id="accent" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#7c6af7" />
          <Stop offset="1" stopColor="#ec4899" />
        </SvgGradient>
      </Defs>

      {/* Card background */}
      <Rect x={0} y={0} width={CARD_W} height={CARD_H} fill="url(#bg)" rx={20} />

      {/* Top accent bar */}
      <Rect x={0} y={0} width={CARD_W} height={6} fill="url(#accent)" rx={3} />

      {/* App name */}
      <SvgText x={CARD_W / 2} y={36} fontSize={13} fill="#a78bfa" textAnchor="middle" fontWeight="700" letterSpacing={2}>
        VOICE TRAINER
      </SvgText>

      {/* Exercise name */}
      <SvgText x={CARD_W / 2} y={62} fontSize={16} fill="#F1F5F9" textAnchor="middle" fontWeight="700">
        {name.length > 28 ? name.slice(0, 25) + '…' : name}
      </SvgText>

      {/* Grade circle */}
      <Circle cx={CARD_W / 2} cy={130} r={52} fill={grade.color + '22'} stroke={grade.color} strokeWidth={3} />
      <SvgText x={CARD_W / 2} y={118} fontSize={44} fill={grade.color} textAnchor="middle" fontWeight="900">{grade.letter}</SvgText>
      <SvgText x={CARD_W / 2} y={148} fontSize={11} fill={grade.color} textAnchor="middle" fontWeight="600">{grade.label}</SvgText>

      {/* Stars */}
      <StarRow count={stars} />

      {/* Accuracy big number */}
      <SvgText x={CARD_W / 2} y={260} fontSize={48} fill="#F1F5F9" textAnchor="middle" fontWeight="900">
        {accuracy}%
      </SvgText>
      <SvgText x={CARD_W / 2} y={280} fontSize={12} fill="#475569" textAnchor="middle">accuracy</SvgText>

      {/* Divider */}
      <Rect x={24} y={296} width={CARD_W - 48} height={1} fill="#2A2A50" />

      {/* Stats row */}
      {[
        { label: 'Score', value: score > 0 ? String(score) : '—', x: CARD_W / 4 },
        { label: 'Notes', value: totalNotes > 0 ? `${hitCount}/${totalNotes}` : '—', x: CARD_W / 2 },
        { label: 'Time', value: duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : '—', x: (CARD_W * 3) / 4 },
      ].map(s => (
        <G key={s.label}>
          <SvgText x={s.x} y={326} fontSize={18} fill="#F1F5F9" textAnchor="middle" fontWeight="800">{s.value}</SvgText>
          <SvgText x={s.x} y={342} fontSize={10} fill="#475569" textAnchor="middle">{s.label}</SvgText>
        </G>
      ))}

      {/* Divider */}
      <Rect x={24} y={358} width={CARD_W - 48} height={1} fill="#2A2A50" />

      {/* Level + streak */}
      <G>
        <SvgText x={CARD_W / 4} y={386} fontSize={14} fill="#a78bfa" textAnchor="middle" fontWeight="700">
          {li ? `${li.emoji} ${li.label}` : '🌱 Beginner'}
        </SvgText>
        <SvgText x={CARD_W / 4} y={402} fontSize={10} fill="#475569" textAnchor="middle">Level</SvgText>

        <SvgText x={(CARD_W * 3) / 4} y={386} fontSize={14} fill="#f97316" textAnchor="middle" fontWeight="700">
          {streak}🔥
        </SvgText>
        <SvgText x={(CARD_W * 3) / 4} y={402} fontSize={10} fill="#475569" textAnchor="middle">Day Streak</SvgText>
      </G>

      {/* Date */}
      <SvgText x={CARD_W / 2} y={440} fontSize={11} fill="#2A2A50" textAnchor="middle">{dateStr}</SvgText>

      {/* Bottom tag */}
      <Rect x={CARD_W / 2 - 60} y={452} width={120} height={20} fill="#1E1E3A" rx={10} />
      <SvgText x={CARD_W / 2} y={466} fontSize={10} fill="#475569" textAnchor="middle">voice-trainer.newbold.cloud</SvgText>
    </Svg>
  );
}

export default function ScoreCard({ replay, progress, exerciseName, accuracy, score, onClose }: Props) {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      const acc = accuracy ?? replay?.accuracy ?? 0;
      const name = exerciseName ?? replay?.exerciseName ?? 'Session';
      const grade = getGrade(acc);
      const text = `🎤 Voice Trainer Result\n\n${name}\nAccuracy: ${acc}% (Grade ${grade.letter} — ${grade.label})\nStreak: ${progress?.currentStreak ?? 0}🔥 days\n\nTrain your voice at voice-trainer.newbold.cloud`;

      if (Platform.OS !== 'web') {
        await Share.share({ message: text, title: 'My Voice Trainer Score' });
      } else if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'My Voice Trainer Score', text });
      } else {
        await navigator.clipboard?.writeText(text);
        alert('Score copied to clipboard!');
      }
    } catch {}
    setSharing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Score Card</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.cardWrap}>
        <View style={styles.svgWrap}>
          <ScoreCardSVG replay={replay} progress={progress} exerciseName={exerciseName} accuracy={accuracy} score={score} />
        </View>
        <Text style={styles.hint}>📸 Screenshot to save or share</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
          <Text style={styles.shareBtnText}>{sharing ? 'Sharing…' : '↗ Share Score'}</Text>
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  closeBtn: { fontSize: 20, color: COLORS.textMuted, padding: 4 },
  cardWrap: { alignItems: 'center', padding: 16, gap: 14, paddingBottom: 40 },
  svgWrap: { borderRadius: 20, overflow: 'hidden', shadowColor: '#7c6af7', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  hint: { fontSize: 13, color: COLORS.textMuted },
  shareBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, width: '100%', alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneBtn: { backgroundColor: '#1E1E3A', paddingHorizontal: 40, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#2A2A50' },
  doneBtnText: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
});
