import React, { useEffect, useState, useCallback } from 'react';
import { Stack } from 'expo-router';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { AuthProvider, useAuthContextSafe } from '../src/auth/AuthContext';
import { fullSync } from '../src/auth/syncService';
import AuthScreen from '../src/screens/AuthScreen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { hasCompletedOnboarding, markOnboardingComplete } from '../src/utils/storage';
import { CelebrationProvider } from '../src/contexts/CelebrationContext';
import CelebrationToast from '../src/components/CelebrationToast';

// Lazy import splash screen (may not be available on all platforms)
let SplashScreen: any = null;
try {
  SplashScreen = require('expo-splash-screen');
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

// Lazy import onboarding
const OnboardingScreen = React.lazy(() => import('../src/screens/OnboardingScreen'));

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function prepare() {
      try {
        // Check onboarding status
        const completed = await hasCompletedOnboarding();
        setNeedsOnboarding(!completed);
        setAppReady(true);
      } catch (e: any) {
        setError(e.message || 'Unknown error');
        setAppReady(true);
      }
    }
    prepare();
  }, []);

  // Hide splash once layout is ready
  const onLayoutReady = useCallback(async () => {
    if (appReady) {
      try {
        await SplashScreen?.hideAsync();
      } catch {}
    }
  }, [appReady]);

  const handleOnboardingComplete = useCallback(async () => {
    await markOnboardingComplete();
    setNeedsOnboarding(false);
  }, []);

  if (error) {
    return (
      <View style={styles.center} onLayout={onLayoutReady}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMsg}>{error}</Text>
      </View>
    );
  }

  if (!appReady) {
    // Splash screen is still visible — render nothing
    return null;
  }

  // Show onboarding for first-time users
  if (needsOnboarding) {
    return (
      <View style={styles.container} onLayout={onLayoutReady}>
        <StatusBar style="light" />
        <React.Suspense fallback={
          <View style={[styles.center]}>
            <Text style={styles.loading}>Loading...</Text>
          </View>
        }>
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </React.Suspense>
      </View>
    );
  }

  return (
    <AuthProvider>
    <CelebrationProvider>
    <ErrorBoundary>
    <View style={styles.container} onLayout={onLayoutReady}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          // iOS-native slide transitions
          animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade',
          contentStyle: { backgroundColor: '#0A0A1A' },
        }}
      />
      {/* Global celebration toast — sits on top of everything */}
      <CelebrationToast />
    </View>
    </ErrorBoundary>
    </CelebrationProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loading: { color: '#A855F7', fontSize: 18 },
  errorTitle: { color: '#EF4444', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  errorMsg: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
});
