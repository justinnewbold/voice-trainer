import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function TabsLayout() {
  return (
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="warmup" options={{ title: 'Warmup', tabBarIcon: ({ color, size }) => <Ionicons name="flame" size={size} color={color} /> }} />
      <Tabs.Screen name="pitch" options={{ title: 'Pitch', tabBarIcon: ({ color, size }) => <Ionicons name="mic" size={size} color={color} /> }} />
      <Tabs.Screen name="scales" options={{ title: 'Scales', tabBarIcon: ({ color, size }) => <Ionicons name="musical-notes" size={size} color={color} /> }} />
      <Tabs.Screen name="songs" options={{ title: 'Songs', tabBarIcon: ({ color, size }) => <Ionicons name="headset" size={size} color={color} /> }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Stats', tabBarIcon: ({ color, size }) => <Ionicons name="bar-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
