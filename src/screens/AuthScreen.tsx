import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { useAuthContext } from '../auth/AuthContext';

type Mode = 'signin' | 'signup' | 'reset';

export default function AuthScreen() {
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuthContext();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setMessage(null);
    clearError();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    clearError();
    setMessage(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed) { setMessage({ text: 'Please enter your email.', type: 'error' }); shake(); return; }
    if (mode !== 'reset' && !password) { setMessage({ text: 'Please enter your password.', type: 'error' }); shake(); return; }
    if (mode === 'signup' && password.length < 6) { setMessage({ text: 'Password must be at least 6 characters.', type: 'error' }); shake(); return; }

    setSubmitting(true);

    if (mode === 'reset') {
      const result = await resetPassword(emailTrimmed);
      if (result?.error) {
        setMessage({ text: result.error, type: 'error' }); shake();
      } else {
        setMessage({ text: 'Check your email for a reset link.', type: 'success' });
      }
    } else if (mode === 'signup') {
      const result = await signUp(emailTrimmed, password, displayName.trim());
      if (result?.error) {
        setMessage({ text: result.error, type: 'error' }); shake();
      } else if (result?.needsConfirmation) {
        setMessage({ text: 'Account created! Check your email to confirm, then sign in.', type: 'success' });
        switchMode('signin');
      }
      // On success with session, root layout will detect auth state change
    } else {
      const result = await signIn(emailTrimmed, password);
      if (result?.error) {
        setMessage({ text: result.error, type: 'error' }); shake();
      }
      // On success, root layout will detect auth state change
    }

    setSubmitting(false);
  };

  const isLoading = loading || submitting;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={['#1E0A3C', '#0A0A1A']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎤</Text>
          </View>
          <Text style={styles.appName}>Voice Trainer</Text>
          <Text style={styles.tagline}>
            {mode === 'signup'
              ? 'Create your account to sync progress'
              : mode === 'reset'
                ? 'Reset your password'
                : 'Sign in to sync across devices'}
          </Text>
        </View>

        {/* Form card */}
        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
          {/* Tabs (signin / signup only) */}
          {mode !== 'reset' && (
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
                onPress={() => switchMode('signin')}
              >
                <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => switchMode('signup')}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>Create account</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Display name (signup only) */}
          {mode === 'signup' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>
          )}

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={mode === 'reset' ? 'done' : 'next'}
                onSubmitEditing={mode === 'reset' ? handleSubmit : undefined}
              />
            </View>
          </View>

          {/* Password (not on reset) */}
          {mode !== 'reset' && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                  placeholderTextColor={COLORS.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {mode === 'signin' && (
                <TouchableOpacity onPress={() => switchMode('reset')} style={styles.forgotLink}>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Message */}
          {(message || error) && (
            <View style={[styles.messageBanner, (message?.type === 'error' || error) ? styles.messageBannerError : styles.messageBannerSuccess]}>
              <Ionicons
                name={(message?.type === 'error' || error) ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={15}
                color={(message?.type === 'error' || error) ? '#EF4444' : COLORS.success}
              />
              <Text style={[(message?.type === 'error' || error) ? styles.messageError : styles.messageSuccess]}>
                {message?.text || error}
              </Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.submitBtnText}>
                  {mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email'}
                </Text>
            }
          </TouchableOpacity>

          {/* Back from reset */}
          {mode === 'reset' && (
            <TouchableOpacity onPress={() => switchMode('signin')} style={styles.backLink}>
              <Ionicons name="arrow-back" size={14} color={COLORS.textMuted} />
              <Text style={styles.backLinkText}>Back to sign in</Text>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Guest / skip option */}
        <View style={styles.guestSection}>
          <Text style={styles.guestText}>
            You can use Voice Trainer without an account — your progress stays on this device only.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 60 },

  logoSection: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#7C3AED22', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#7C3AED55', marginBottom: 12,
  },
  logoEmoji: { fontSize: 36 },
  appName: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  tagline: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A50',
    marginBottom: 20,
  },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#0A0A1A',
    borderRadius: BORDER_RADIUS.lg,
    padding: 3,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: BORDER_RADIUS.md },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#fff' },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: '#2A2A50',
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: COLORS.text, fontSize: 15 },
  eyeBtn: { padding: 4 },
  forgotLink: { alignSelf: 'flex-end', marginTop: 6 },
  forgotText: { fontSize: 12, color: COLORS.primaryLight },

  messageBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 10, borderRadius: BORDER_RADIUS.md, marginBottom: 14,
  },
  messageBannerError: { backgroundColor: '#EF444422', borderWidth: 1, borderColor: '#EF444444' },
  messageBannerSuccess: { backgroundColor: COLORS.success + '22', borderWidth: 1, borderColor: COLORS.success + '44' },
  messageError: { fontSize: 13, color: '#EF4444', flex: 1, lineHeight: 18 },
  messageSuccess: { fontSize: 13, color: COLORS.success, flex: 1, lineHeight: 18 },

  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: 15,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  backLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 14,
  },
  backLinkText: { fontSize: 13, color: COLORS.textMuted },

  guestSection: { alignItems: 'center', paddingHorizontal: 16 },
  guestText: { fontSize: 12, color: COLORS.textMuted, textAlign: 'center', lineHeight: 18 },
});
