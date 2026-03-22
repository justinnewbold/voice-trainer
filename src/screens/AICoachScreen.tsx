import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { loadProgress, loadVocalRange, getCoachHistory, saveCoachMessage, clearCoachHistory, CoachMessage } from '../utils/storage';

const QUICK_PROMPTS = [
  "How can I improve my pitch accuracy?",
  "What exercises are best for my voice type?",
  "How do I stop going flat on high notes?",
  "Tips for warming up my voice?",
  "How do I increase my vocal range?",
  "What is head voice vs chest voice?",
];

async function askCoach(messages: { role: string; content: string }[], systemPrompt: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (res.status === 401) return "⚠️ The AI Coach needs an API key configured. Ask your app admin to add the Anthropic API key in settings.";
      return `Sorry, I hit an error (${res.status}). Please try again in a moment.`;
    }
    const data = await res.json();
    return data.content?.[0]?.text || 'No response — please try again.';
  } catch (e) {
    return "Unable to reach the AI Coach right now. Please check your connection and try again.";
  }
}

export default function AICoachScreen() {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const [history, progress, range] = await Promise.all([
        getCoachHistory(),
        loadProgress(),
        loadVocalRange(),
      ]);
      setMessages(history);

      const rangeInfo = range
        ? `The singer's vocal range is ${range.lowNote}–${range.highNote} (${range.voiceType}, ${range.semitones} semitones).`
        : 'The singer has not yet tested their vocal range.';

      setSystemPrompt(`You are an expert vocal coach and singing teacher with decades of experience. 
You give warm, encouraging, and highly actionable advice tailored to the individual singer.
Keep responses concise (2-4 paragraphs max) and use bullet points for exercises.
Always be positive and motivating.

Singer's current stats:
- Level: ${progress.level} (${progress.xp} XP)
- Sessions completed: ${progress.totalSessions}
- Average accuracy: ${progress.avgAccuracy}%
- Current streak: ${progress.currentStreak} days
- ${rangeInfo}`);
    })();
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    setInput('');

    const userMsg: CoachMessage = { role: 'user', content, timestamp: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    await saveCoachMessage(userMsg);
    setLoading(true);

    const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
    const reply = await askCoach(apiMessages, systemPrompt);

    const assistantMsg: CoachMessage = { role: 'assistant', content: reply, timestamp: Date.now() };
    setMessages(prev => [...prev, assistantMsg]);
    await saveCoachMessage(assistantMsg);
    setLoading(false);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, loading, messages, systemPrompt]);

  const handleClear = async () => {
    await clearCoachHistory();
    setMessages([]);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>🎤 AI Vocal Coach</Text>
            <Text style={styles.subtitle}>Powered by Claude AI</Text>
          </View>
          {messages.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView ref={scrollRef} style={styles.messages} contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>

        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyTitle}>Meet Your Vocal Coach</Text>
            <Text style={styles.emptyText}>
              Ask me anything about singing technique, exercises, breath control, or how to improve your pitch.
              I know your training history and will give you personalized advice.
            </Text>
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
            {msg.role === 'assistant' && (
              <View style={styles.aiLabel}>
                <Text style={styles.aiLabelText}>🎤 Coach</Text>
              </View>
            )}
            <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>
              {msg.content}
            </Text>
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

      {/* Quick prompts when there are messages */}
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: SPACING.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  clearBtn: { padding: 8 },
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
});
