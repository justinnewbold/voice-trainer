import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, Platform } from 'react-native';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setReady(true);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    }
  }, []);

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorMsg}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  center: { flex: 1, backgroundColor: '#0A0A1A', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loading: { color: '#A855F7', fontSize: 18 },
  errorTitle: { color: '#EF4444', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  errorMsg: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
});
