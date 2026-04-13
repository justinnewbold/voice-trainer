import React, { useState, useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Platform, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { A11Y } from '../../src/hooks/useAccessibility';

const MORE_ITEMS = [
  { label: 'Interval Trainer', icon: 'ear' as const, route: '/(tabs)/intervals', desc: 'Ear training for all 13 intervals', color: '#7c6af7' },
  { label: 'Sight Singing', icon: 'eye' as const, route: '/(tabs)/sightsing', desc: 'Read music and sing it back', color: '#06b6d4' },
  { label: 'Duet / Harmony', icon: 'git-branch' as const, route: '/(tabs)/duet', desc: 'Sing harmony over a drone note', color: '#10b981' },
  { label: 'Key Detector', icon: 'musical-note' as const, route: '/(tabs)/key', desc: "Find what key you're singing in", color: '#f59e0b' },
  { label: 'Warmup', icon: 'flame' as const, route: '/(tabs)/warmup', desc: 'Breathing & vocal prep exercises', color: '#f97316' },
  { label: 'AI Coach', icon: 'chatbubble-ellipses' as const, route: '/(tabs)/coach', desc: 'Personalized coaching & plans', color: '#a78bfa' },
  { label: 'Progress', icon: 'bar-chart' as const, route: '/(tabs)/progress', desc: 'Stats, achievements & history', color: '#34d399' },
  { label: 'Skill Tree', icon: 'git-network' as const, route: '/(tabs)/skilltree', desc: 'Unlock skills & track mastery', color: '#7c3aed' },
  { label: 'Settings', icon: 'settings' as const, route: '/(tabs)/settings', desc: 'Preferences & notifications', color: '#94a3b8' },
];

function MoreDrawer({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const [BlurViewComponent, setBlurViewComponent] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('expo-blur').then(mod => setBlurViewComponent(() => mod.BlurView)).catch(() => {});
    }
  }, []);

  const navigate = (route: string) => { onClose(); setTimeout(() => router.push(route as any), 80); };

  const drawerContent = (
    <>
      <View style={styles.drawerHandle} />
      <Text style={styles.drawerTitle}>More</Text>
      <ScrollView contentContainerStyle={styles.drawerItems}>
        {MORE_ITEMS.map(item => (
          <TouchableOpacity
            key={item.label}
            style={styles.drawerItem}
            onPress={() => navigate(item.route)}
            activeOpacity={0.7}
            accessibilityLabel={`${item.label}: ${item.desc}`}
            accessibilityRole="button"
          >
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
    </>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose} />
        {Platform.OS !== 'web' && BlurViewComponent ? (
          <BlurViewComponent intensity={80} tint="dark" style={styles.drawer}>
            <View style={styles.drawerBlurOverlay}>{drawerContent}</View>
          </BlurViewComponent>
        ) : (
          <View style={[styles.drawer, styles.drawerFallback]}>{drawerContent}</View>
        )}
      </View>
    </Modal>
  );
}

function MoreTabButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.moreTabBtn} onPress={onPress} activeOpacity={0.7} {...A11Y.moreTab}>
      <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textSecondary} />
      <Text style={styles.moreTabLabel}>More</Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const [moreVisible, setMoreVisible] = useState(false);
  const [BlurViewComponent, setBlurViewComponent] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      import('expo-blur').then(mod => setBlurViewComponent(() => mod.BlurView)).catch(() => {});
    }
  }, []);

  const tabBarBackground = () => {
    if (Platform.OS !== 'web' && BlurViewComponent) {
      return (
        <BlurViewComponent intensity={60} tint="dark" style={StyleSheet.absoluteFill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(19, 19, 42, 0.5)' }]} />
        </BlurViewComponent>
      );
    }
    return undefined;
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Platform.OS !== 'web' && BlurViewComponent ? 'transparent' : '#13132AEE',
            borderTopColor: '#2A2A5066',
            borderTopWidth: StyleSheet.hairlineWidth,
            height: Platform.OS === 'web' ? 56 : 64,
            paddingBottom: Platform.OS === 'web' ? 4 : 10,
            position: Platform.OS !== 'web' ? 'absolute' : undefined,
            ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)' } as any : {}),
          },
          tabBarBackground: Platform.OS !== 'web' ? tabBarBackground : undefined,
          tabBarActiveTintColor: COLORS.primaryLight,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />, tabBarAccessibilityLabel: 'Home tab' }} />
        <Tabs.Screen name="pitch" options={{ title: 'Pitch', tabBarIcon: ({ color, size }) => <Ionicons name="mic" size={size} color={color} />, tabBarAccessibilityLabel: 'Pitch detector tab' }} />
        <Tabs.Screen name="scales" options={{ title: 'Scales', tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} />, tabBarAccessibilityLabel: 'Scales and exercises tab' }} />
        <Tabs.Screen name="songs" options={{ title: 'Songs', tabBarIcon: ({ color, size }) => <Ionicons name="headset" size={size} color={color} />, tabBarAccessibilityLabel: 'Song matching tab' }} />

        <Tabs.Screen name="intervals" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="sightsing" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="duet" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="warmup" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="key" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="coach" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="progress" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="more-placeholder" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="skilltree" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
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
  drawer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#2A2A5066', maxHeight: '85%', overflow: 'hidden' },
  drawerFallback: { backgroundColor: '#13132AEE', ...(Platform.OS === 'web' ? { backdropFilter: 'blur(30px) saturate(200%)', WebkitBackdropFilter: 'blur(30px) saturate(200%)' } as any : {}) },
  drawerBlurOverlay: { backgroundColor: 'rgba(10, 10, 26, 0.35)', paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  drawerHandle: { width: 40, height: 4, backgroundColor: '#ffffff33', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, paddingHorizontal: 20, paddingVertical: 10 },
  drawerItems: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(30, 30, 58, 0.6)', borderRadius: 16, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2A2A5044' },
  drawerIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  drawerItemText: { flex: 1 },
  drawerItemLabel: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  drawerItemDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  moreTabBtnWrapper: { position: 'absolute', top: Platform.OS === 'ios' ? 54 : 16, right: 16, zIndex: 100 },
  moreTabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30, 30, 58, 0.7)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: '#2A2A5066', ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' } as any : {}) },
  moreTabLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
});
