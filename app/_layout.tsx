import React, { useEffect, useState, useCallback, ErrorInfo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { COLORS } from '../src/constants/theme';

// Lazy import to avoid SSR issues
const OnboardingScreen = React.lazy(() => import('../src/screens/OnboardingScreen'));

// Error boundary for catching runtime errors
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App Error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>
            {this.state.error.message}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Safe async storage check that works on both web and native
async function checkOnboarding(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      // Direct localStorage check on web - avoids AsyncStorage SSR issues
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('vt_onboarded_v1') === 'true';
      }
      return false;
    }
    // Native: use AsyncStorage
    const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
    return (await AsyncStorage.getItem('vt_onboarded_v1')) === 'true';
  } catch {
    return false;
  }
}

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding().then(done => {
      setShowOnboarding(!done);
    }).catch(() => {
      setShowOnboarding(true); // Default to showing onboarding on error
    });
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.setItem('vt_onboarded_v1', 'true');
      } else {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem('vt_onboarded_v1', 'true');
      }
    } catch {}
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={COLORS.primaryLight} size="large" />
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <ErrorBoundary>
        <GestureHandlerRootView style={styles.container}>
          <StatusBar style="light" />
          <React.Suspense fallback={
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator color={COLORS.primaryLight} size="large" />
            </View>
          }>
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </React.Suspense>
        </GestureHandlerRootView>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
});
