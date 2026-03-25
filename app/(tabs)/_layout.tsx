import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const MORE_ITEMS = [
  { label: 'Interval Trainer', icon: 'ear' as const,                 route: '/(tabs)/intervals',  desc: 'Ear training for all 13 intervals',  color: '#7c6af7' },
  { label: 'Sight Singing',    icon: 'eye' as const,                 route: '/(tabs)/sightsing',  desc: 'Read music and sing it back',         color: '#06b6d4' },
  { label: 'Key Detector',     icon: 'musical-note' as const,        route: '/(tabs)/key',        desc: "Find what key you're singing in",    color: '#f59e0b' },
  { label: 'Warmup',           icon: 'flame' as const,               route: '/(tabs)/warmup',     desc: 'Breathing & vocal prep exercises',   color: '#f97316' },
  { label: 'AI Coach',         icon: 'chatbubble-ellipses' as const, route: '/(tabs)/coach',      desc: 'Personalized coaching & plans',      color: '#a78bfa' },
  { label: 'Progress',         icon: 'bar-chart' as const,           route: '/(tabs)/progress',   desc: 'Stats, achievements & history',      color: '#34d399' },
  { label: 'Settings',         icon: 'settings' as const,            route: '/(tabs)/settings',   desc: 'Preferences & notifications',        color: '#94a3b8' },
];

function MoreDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const navigate = (route: string) => { onClose(); setTimeout(() => router.push(route as any), 80); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={styles.drawer}>
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
        </View>
      </View>
    </Modal>
  );
}

function MoreTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.moreTabBtn} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textMuted} />
      <Text style={styles.moreTabLabel}>More</Text>
    </TouchableOpacity>
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
        <Tabs.Screen name="index"   options={{ title: 'Home',  tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
        <Tabs.Screen name="pitch"   options={{ title: 'Pitch', tabBarIcon: ({ color, size }) => <Ionicons name="mic" size={size} color={color} /> }} />
        <Tabs.Screen name="scales"  options={{ title: 'Scales', tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} /> }} />
        <Tabs.Screen name="songs"   options={{ title: 'Songs', tabBarIcon: ({ color, size }) => <Ionicons name="headset" size={size} color={color} /> }} />

        {/* Hidden secondary tabs */}
        <Tabs.Screen name="intervals"      options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="sightsing"      options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="warmup"         options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="key"            options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="coach"          options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="progress"       options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings"       options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="more-placeholder" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      </Tabs>

      <View style={styles.moreTabBtnWrapper} pointerEvents="box-none">
        <MoreTabButton onPress={() => setMoreVisible(true)} />
      </View>

      <MoreDrawer visible={moreVisible} onClose={() => setMoreVisible(false)} />
    </>
  );
}

const TAB_HEIGHT = Platform.OS === 'web' ? 56 : 64;

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  overlay: { flex: 1 },
  drawer: { backgroundColor: '#13132A', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: 1, borderTopColor: '#2A2A50', maxHeight: '85%' },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#2A2A50', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 10 },
  drawerItems: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1E1E3A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2A2A50' },
  drawerIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  drawerItemText: { flex: 1 },
  drawerItemLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  drawerItemDesc: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  moreTabBtnWrapper: { position: 'absolute', bottom: 0, right: 0, width: '20%', height: TAB_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  moreTabBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 4 },
  moreTabLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
});
