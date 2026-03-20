import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🎤 Voice Trainer</Text>
      <Text style={styles.subtitle}>Real-time pitch detection & vocal training</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/pitch')}>
        <Text style={styles.cardTitle}>🎯 Pitch Detector</Text>
        <Text style={styles.cardDesc}>Real-time pitch detection</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/warmup')}>
        <Text style={styles.cardTitle}>🔥 Warmup</Text>
        <Text style={styles.cardDesc}>Breathing & vocal prep</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/scales')}>
        <Text style={styles.cardTitle}>🎵 Scales</Text>
        <Text style={styles.cardDesc}>Guided exercises</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/songs')}>
        <Text style={styles.cardTitle}>🎧 Songs</Text>
        <Text style={styles.cardDesc}>Match melodies</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/(tabs)/progress')}>
        <Text style={styles.cardTitle}>📊 Progress</Text>
        <Text style={styles.cardDesc}>Stats & achievements</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A1A' },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '900', color: '#F1F5F9', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginBottom: 24 },
  card: {
    backgroundColor: '#13132A', borderRadius: 16, padding: 20, marginBottom: 12,
    borderWidth: 1, borderColor: '#2A2A50',
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#94A3B8' },
});
