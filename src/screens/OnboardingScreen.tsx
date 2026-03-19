import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import VocalRangeScreen from './VocalRangeScreen';
import { markOnboardingComplete } from '../utils/storage';

type Step = 'welcome' | 'mic' | 'range' | 'done';

export default function OnboardingScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const { requestPermission, hasPermission } = usePitchDetection();

  const handleAllowMic = async () => {
    const granted = await requestPermission();
    if (granted) setStep('range');
  };

  const handleFinish = async () => {
    await markOnboardingComplete();
    onComplete();
  };

  const handleSkip = async () => {
    await markOnboardingComplete();
    onComplete();
  };

  if (step === 'welcome') return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <Text style={{ fontSize: 80 }}>🎤</Text>
        <Text style={styles.heading}>Welcome to{'\n'}<Text style={{ color: COLORS.primaryLight }}>Voice Trainer</Text></Text>
        <Text style={styles.desc}>Learn to sing on pitch with real-time feedback, guided exercises, and personalized training.</Text>
        <View style={styles.features}>
          {[
            { icon: '🎯', text: 'Real-time pitch detection' },
            { icon: '🎵', text: 'Guided scales & exercises' },
            { icon: '📈', text: 'Track your progress' },
            { icon: '🧠', text: 'Personalized to your voice' },
          ].map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}><Text style={{ fontSize: 20 }}>{f.icon}</Text></View>
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep('mic')}>
          <Text style={styles.primaryBtnText}>Get Started →</Text>
        </TouchableOpacity>
        <Text style={styles.timeNote}>Takes about 2 minutes</Text>
      </View>
    </View>
  );

  if (step === 'mic') return (
    <View style={styles.container}>
      <View style={styles.centered}>
        <View style={styles.micCircle}><Text style={{ fontSize: 48 }}>🎤</Text></View>
        <Text style={styles.heading}>Allow Microphone</Text>
        <Text style={styles.desc}>Voice Trainer needs to hear you sing to detect pitch and give feedback.</Text>
        <View style={styles.privacyRow}>
          <Text style={styles.privacyText}>🔒 Audio processed locally, never uploaded</Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleAllowMic}>
          <Text style={styles.primaryBtnText}>Allow Microphone</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip setup →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (step === 'range') return <VocalRangeScreen onComplete={handleFinish} />;

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.md },
  heading: { fontSize: 28, fontWeight: '900', color: COLORS.text, textAlign: 'center', lineHeight: 36 },
  desc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  features: { width: '100%', maxWidth: 300, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  primaryBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BORDER_RADIUS.lg, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold },
  timeNote: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  micCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  privacyText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  skipText: { color: COLORS.textMuted, fontSize: FONTS.sizes.sm, marginTop: 12 },
});
