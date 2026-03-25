import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, loadVocalRange, getCoachHistory, saveCoachMessage, clearCoachHistory, CoachMessage, getBests } from '../utils/storage';
import { loadRecentReplays } from '../utils/sessionReplay';
import { EXERCISES, SONG_MELODIES } from '../utils/scales';

const QUICK_PROMPTS = [
  "How can I improve my pitch accuracy?",
  "What exercises are best for my voice type?",
  "How do I stop going flat on high notes?",
  "Tips for warming up my voice?",
  "How do I increase my vocal range?",
  "What is head voice vs chest voice?",
];

interface PracticeDay {
  day: string;
  focus: string;
  exercises: string[];
  duration: string;
  tip: string;
  isRest?: boolean;
}

interface WeeklyPlan {
  summary: string;
  focusArea: string;
  days: PracticeDay[];
  generatedAt: number;
}

async function callClaude(messages: { role: string; content: string }[], system: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system,
        messages,
      }),
    });
    if (!res.ok) {
      if (res.status === 401) return "⚠️ AI Coach needs an API key. Add the Anthropic API key to Vercel environment variables.";
      return `Error ${res.status} — please try again.`;
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response.';
  } catch {
    return "Unable to reach AI Coach. Check your connection.";
  }
}

async function generateWeeklyPlan(systemPrompt: string): Promise<WeeklyPlan | null> {
  const planPrompt = `Generate a 7-day vocal training plan for this singer. Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{
  "summary": "2-sentence overview of this week's focus",
  "focusArea": "main skill being developed this week",
  "days": [
    {
      "day": "Monday",
      "focus": "short focus title",
      "exercises": ["Exercise 1 name", "Exercise 2 name"],
      "duration": "15-20 min",
      "tip": "one specific actionable tip for today",
      "isRest": false
    }
  ]
}
Use real exercise names from the app where possible: Do-Re-Mi, Three Note Step, Octave Jump, Full Major Scale, Minor Scale, Arpeggio Climb, Pentatonic Flow, Jazz Licks, Wide Intervals. One day should be a rest day. Make the plan progressive and build on each day.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [{ role: 'user', content: planPrompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, generatedAt: Date.now() };
  } catch { return null; }
}

const DAY_COLORS = ['#7c6af7', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#8b5cf6'];

export default function AICoachScreen() {
  const [tab, setTab] = useState<'chat' | 'plan'>('chat');
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [history, progress, range, bests, replays] = await Promise.all([
        getCoachHistory(), loadProgress(), loadVocalRange(), getBests(), loadRecentReplays(5),
      ]);
      setMessages(history);

      const rangeInfo = range
        ? `Vocal range: ${range.lowNote}–${range.highNote} (${range.voiceType}, ${range.semitones} semitones).`
        : 'Vocal range: not yet tested.';

      // Build weak spots from bests
      const weakSpots = Object.entries(bests)
        .filter(([, b]: any) => b.accuracy < 75 && b.attempts >= 2)
        .map(([id]: any) => {
          const ex = EXERCISES.find(e => e.id === id) || SONG_MELODIES.find(s => s.id === id);
          return ex ? `${ex.name} (${(bests[id] as any).accuracy}% best)` : null;
        })
        .filter(Boolean)
        .slice(0, 3);

      // Recent replay summary
      const replaySummary = replays.length > 0
        ? replays.slice(0, 3).map(r => `${r.exerciseName}: ${r.accuracy}% accuracy`).join(', ')
        : 'No recent sessions.';

      setSystemPrompt(`You are an expert vocal coach and singing teacher with decades of experience.
You give warm, encouraging, and highly actionable advice tailored to this singer.
Keep responses concise (2-4 paragraphs max) and use bullet points for exercises.
Always be positive and motivating.

Singer stats:
- Level: ${progress.level} (${progress.xp} XP)
- Sessions: ${progress.totalSessions} total, ${progress.avgAccuracy}% avg accuracy
- Streak: ${progress.currentStreak} days
- ${rangeInfo}
- Recent sessions: ${replaySummary}
${weakSpots.length > 0 ? `- Exercises needing work: ${weakSpots.join(', ')}` : ''}`);
    })();
  }, []));

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');
    const userMsg: CoachMessage = { role: 'user', content, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveCoachMessage(userMsg);
    setLoading(true);
    const reply = await callClaude(newMessages.map(m => ({ role: m.role, content: m.content })), systemPrompt);
    const assistantMsg: CoachMessage = { role: 'assistant', content: reply, timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);
    await saveCoachMessage(assistantMsg);
    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, loading, messages, systemPrompt]);

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    const plan = await generateWeeklyPlan(systemPrompt);
    setWeeklyPlan(plan);
    setPlanLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>🎤 AI Vocal Coach</Text>
            <Text style={styles.subtitle}>Powered by Claude AI</Text>
          </View>
          {tab === 'chat' && messages.length > 0 && (
            <TouchableOpacity onPress={async () => { await clearCoachHistory(); setMessages([]); }} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {/* Tab bar */}
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, tab === 'chat' && styles.tabActive]} onPress={() => setTab('chat')}>
            <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>💬 Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'plan' && styles.tabActive]} onPress={() => setTab('plan')}>
            <Text style={[styles.tabText, tab === 'plan' && styles.tabTextActive]}>📅 Weekly Plan</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {tab === 'chat' && (
        <>
          <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {messages.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🎵</Text>
                <Text style={styles.emptyTitle}>Meet Your Vocal Coach</Text>
                <Text style={styles.emptyText}>Ask me anything about singing technique, exercises, breath control, or how to improve your pitch. I know your training history and will give personalized advice.</Text>
                <Text style={styles.quickTitle}>Try asking:</Text>
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((p, i) => (
                    <TouchableOpacity key={i} style={styles.quickChip} onPress={() => sendMessage(p)}>
                      <Text style={styles.quickChipText}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {messages.map((msg, i) => (
              <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                {msg.role === 'assistant' && <View style={styles.aiLabel}><Text style={styles.aiLabelText}>🎤 Coach</Text></View>}
                <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>{msg.content}</Text>
              </View>
            ))}
            {loading && (
              <View style={[styles.bubble, styles.aiBubble]}>
                <View style={styles.aiLabel}><Text style={styles.aiLabelText}>🎤 Coach</Text></View>
                <View style={styles.typingDots}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.typingText}>  thinking...</Text>
                </View>
              </View>
            )}
          </ScrollView>
          {messages.length > 0 && messages.length < 4 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
              {QUICK_PROMPTS.slice(0, 4).map((p, i) => (
                <TouchableOpacity key={i} style={styles.quickRowChip} onPress={() => sendMessage(p)}>
                  <Text style={styles.quickRowChipText}>{p}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask your vocal coach..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
              onPress={() => sendMessage()} disabled={!input.trim() || loading}>
              <Ionicons name="send" size={20} color={input.trim() && !loading ? '#fff' : COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {tab === 'plan' && (
        <ScrollView style={styles.planScroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={styles.planIntro}>
            <Text style={styles.planIntroTitle}>🗓 Your Weekly Practice Plan</Text>
            <Text style={styles.planIntroText}>
              Claude analyzes your recent sessions, accuracy data, and vocal range to build a personalized 7-day plan.
            </Text>
            <TouchableOpacity
              style={[styles.generateBtn, planLoading && styles.generateBtnDisabled]}
              onPress={handleGeneratePlan}
              disabled={planLoading}
            >
              {planLoading ? (
                <><ActivityIndicator size="small" color="#fff" /><Text style={styles.generateBtnText}>  Generating plan...</Text></>
              ) : (
                <><Ionicons name="sparkles" size={18} color="#fff" /><Text style={styles.generateBtnText}>{weeklyPlan ? 'Regenerate Plan' : 'Generate My Plan'}</Text></>
              )}
            </TouchableOpacity>
          </View>

          {weeklyPlan && (
            <>
              <View style={styles.planSummaryCard}>
                <Text style={styles.planFocus}>This week: {weeklyPlan.focusArea}</Text>
                <Text style={styles.planSummary}>{weeklyPlan.summary}</Text>
                <Text style={styles.planGenerated}>Generated {new Date(weeklyPlan.generatedAt).toLocaleDateString()}</Text>
              </View>

              {weeklyPlan.days.map((day, i) => (
                <View key={i} style={[styles.dayCard, day.isRest && styles.dayCardRest, { borderLeftColor: DAY_COLORS[i % DAY_COLORS.length] }]}>
                  <View style={styles.dayHeader}>
                    <View style={[styles.dayBadge, { backgroundColor: DAY_COLORS[i % DAY_COLORS.length] + '33' }]}>
                      <Text style={[styles.dayName, { color: DAY_COLORS[i % DAY_COLORS.length] }]}>{day.day}</Text>
                    </View>
                    <Text style={styles.dayDuration}>{day.isRest ? '😴 Rest' : `⏱ ${day.duration}`}</Text>
                  </View>
                  <Text style={styles.dayFocus}>{day.focus}</Text>
                  {!day.isRest && day.exercises.length > 0 && (
                    <View style={styles.dayExercises}>
                      {day.exercises.map((ex, j) => (
                        <View key={j} style={styles.dayExerciseRow}>
                          <Text style={styles.dayExerciseDot}>•</Text>
                          <Text style={styles.dayExerciseText}>{ex}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {day.tip && (
                    <View style={styles.dayTip}>
                      <Text style={styles.dayTipIcon}>💡</Text>
                      <Text style={styles.dayTipText}>{day.tip}</Text>
                    </View>
                  )}
                </View>
              ))}
            </>
          )}

          {!weeklyPlan && !planLoading && (
            <View style={styles.planEmpty}>
              <Text style={styles.planEmptyIcon}>📋</Text>
              <Text style={styles.planEmptyTitle}>No plan yet</Text>
              <Text style={styles.planEmptyText}>Tap "Generate My Plan" above and Claude will create a personalized 7-day training schedule based on your progress.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 12, paddingHorizontal: SPACING.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  clearBtn: { padding: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: BORDER_RADIUS.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  // Chat
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  emptyState: { alignItems: 'center', paddingTop: 20 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  quickTitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 10, alignSelf: 'flex-start' },
  quickGrid: { gap: 8, width: '100%' },
  quickChip: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#2A2A50' },
  quickChipText: { color: COLORS.textSecondary, fontSize: 13 },
  quickRow: { maxHeight: 50, marginBottom: 4 },
  quickRowChip: { backgroundColor: '#1E1E3A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2A2A50', height: 36 },
  quickRowChipText: { color: COLORS.textSecondary, fontSize: 12 },
  bubble: { maxWidth: '85%', borderRadius: BORDER_RADIUS.lg, padding: 12, marginBottom: 12 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary },
  aiBubble: { alignSelf: 'flex-start', backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50' },
  aiLabel: { marginBottom: 4 },
  aiLabelText: { fontSize: 11, color: COLORS.primaryLight, fontWeight: '600' },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: COLORS.text },
  typingDots: { flexDirection: 'row', alignItems: 'center' },
  typingText: { color: COLORS.textMuted, fontSize: 13 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#13132A', borderTopWidth: 1, borderTopColor: '#2A2A50', gap: 8 },
  input: { flex: 1, backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: '#2A2A50' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#2A2A50' },
  // Plan tab
  planScroll: { flex: 1 },
  planIntro: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A50' },
  planIntroTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  planIntroText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 18, marginBottom: 14 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, padding: 14, borderRadius: BORDER_RADIUS.lg },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  planSummaryCard: { backgroundColor: '#1a1030', borderRadius: BORDER_RADIUS.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#7c6af744' },
  planFocus: { fontSize: 13, color: COLORS.primaryLight, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  planSummary: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  planGenerated: { fontSize: 11, color: COLORS.textMuted, marginTop: 8 },
  dayCard: { backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#2A2A50', borderLeftWidth: 4 },
  dayCardRest: { opacity: 0.7 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  dayName: { fontSize: 13, fontWeight: '800' },
  dayDuration: { fontSize: 12, color: COLORS.textMuted },
  dayFocus: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  dayExercises: { marginBottom: 8 },
  dayExerciseRow: { flexDirection: 'row', gap: 6, marginBottom: 3 },
  dayExerciseDot: { color: COLORS.textMuted, fontSize: 14 },
  dayExerciseText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  dayTip: { flexDirection: 'row', gap: 6, backgroundColor: '#1E1E3A', borderRadius: 8, padding: 10, marginTop: 4 },
  dayTipIcon: { fontSize: 14 },
  dayTipText: { fontSize: 12, color: COLORS.textMuted, flex: 1, lineHeight: 17 },
  planEmpty: { alignItems: 'center', paddingTop: 40 },
  planEmptyIcon: { fontSize: 48, marginBottom: 12 },
  planEmptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  planEmptyText: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },
});
