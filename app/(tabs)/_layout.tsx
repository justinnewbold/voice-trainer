import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// Secondary screens shown in the More drawer
const MORE_ITEMS = [
  { label: 'Key Detector', icon: 'musical-note' as const, route: '/(tabs)/key', desc: 'Find what key you\'re singing in', color: '#f59e0b' },
  { label: 'Warmup', icon: 'flame' as const, route: '/(tabs)/warmup', desc: 'Breathing & vocal prep exercises', color: '#f97316' },
  { label: 'AI Coach', icon: 'chatbubble-ellipses' as const, route: '/(tabs)/coach', desc: 'Personalized coaching & plans', color: '#a78bfa' },
  { label: 'Progress', icon: 'bar-chart' as const, route: '/(tabs)/progress', desc: 'Stats, achievements & history', color: '#34d399' },
  { label: 'Settings', icon: 'settings' as const, route: '/(tabs)/settings', desc: 'Preferences & notifications', color: '#94a3b8' },
];

function MoreButton({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="ellipsis-horizontal" size={24} color={color} />
    </View>
  );
}

function MoreDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();

  const navigate = (route: string) => {
    onClose();
    setTimeout(() => router.push(route as any), 50);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
      <SafeAreaView style={styles.drawer}>
        <View style={styles.drawerHandle} />
        <Text style={styles.drawerTitle}>More</Text>
        <ScrollView contentContainerStyle={styles.drawerItems}>
          {MORE_ITEMS.map(item => (
            <TouchableOpacity key={item.label} style={styles.drawerItem} onPress={() => navigate(item.route)} activeOpacity={0.7}>
              <View style={[styles.drawerIcon, { backgroundColor: item.color + '22' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <View style={styles.drawerItemText}>
                <Text style={styles.drawerItemLabel}>{item.label}</Text>
                <Text style={styles.drawerItemDesc}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function TabsLayout() {
  const [moreVisible, setMoreVisible] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#13132A',
            borderTopColor: '#2A2A50',
            borderTopWidth: 1,
            height: Platform.OS === 'web' ? 56 : 64,
            paddingBottom: Platform.OS === 'web' ? 4 : 10,
          },
          tabBarActiveTintColor: COLORS.primaryLight,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        {/* Primary 5 tabs */}
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="pitch" options={{ title: 'Pitch', tabBarIcon: ({ color, size }) => <Ionicons name="mic" size={size} color={color} /> }} />
        <Tabs.Screen name="scales" options={{ title: 'Scales', tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} /> }} />
        <Tabs.Screen name="songs" options={{ title: 'Songs', tabBarIcon: ({ color, size }) => <Ionicons name="headset" size={size} color={color} /> }} />
        <Tabs.Screen
          name="more-placeholder"
          options={{
            title: 'More',
            tabBarIcon: ({ color }) => <MoreButton color={color} focused={false} />,
            tabBarButton: (props) => (
              <TouchableOpacity
                {...(props as any)}
                onPress={() => setMoreVisible(true)}
                style={[props.style, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}
              />
            ),
          }}
          listeners={{ tabPress: (e) => { e.preventDefault(); setMoreVisible(true); } }}
        />

        {/* Secondary tabs — hidden from tab bar, accessible via More drawer */}
        <Tabs.Screen name="warmup" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="key" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="coach" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="progress" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      </Tabs>

      <MoreDrawer visible={moreVisible} onClose={() => setMoreVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  drawer: {
    backgroundColor: '#13132A',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: '#2A2A50',
    maxHeight: '75%',
  },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#2A2A50', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 12 },
  drawerItems: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1E1E3A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2A2A50' },
  drawerIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  drawerItemText: { flex: 1 },
  drawerItemLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  drawerItemDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
});
