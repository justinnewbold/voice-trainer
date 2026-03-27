import { useCallback } from 'react';
import { Platform } from 'react-native';

// ─── Types ──────────────────────────────────────────────────────────────────
interface NotificationConfig {
  reminderHour: number;    // 0-23
  streakCount?: number;
}

// ─── iOS Native Notifications via expo-notifications ────────────────────────
async function getNativeModule() {
  try {
    const Notifications = await import('expo-notifications');
    return Notifications;
  } catch {
    return null;
  }
}

async function getDevice() {
  try {
    const Device = await import('expo-device');
    return Device;
  } catch {
    return null;
  }
}

// ─── Permission Request ─────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    }
    return false;
  }

  const Notifications = await getNativeModule();
  if (!Notifications) return false;

  const Device = await getDevice();
  // Must be on a physical device for iOS push
  if (Device && !Device.isDevice) {
    console.warn('Notifications require a physical device');
    // Allow anyway for dev builds in simulator
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    finalStatus = status;
  }

  // Configure notification handler for foreground display
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority?.HIGH,
    }),
  });

  return finalStatus === 'granted';
}

// ─── Schedule Daily Reminder ────────────────────────────────────────────────
export async function scheduleDailyReminder(config: NotificationConfig): Promise<boolean> {
  if (Platform.OS === 'web') {
    // Web: no scheduled notifications, handled at app load
    return true;
  }

  const Notifications = await getNativeModule();
  if (!Notifications) return false;

  try {
    // Cancel any existing daily reminders first
    await cancelAllReminders();

    const messages = [
      { title: '🎤 Time to practice!', body: 'Your voice is waiting. Even 5 minutes makes a difference.' },
      { title: '🎵 Daily practice', body: 'Warm up your voice and keep your streak going!' },
      { title: '🔥 Don\'t break the streak!', body: `${config.streakCount || 0} day streak — keep it alive!` },
      { title: '🎯 Quick session?', body: 'A few scales a day keeps the pitch decay away.' },
      { title: '🎤 Your vocal cords miss you', body: 'Sing a scale, match a song, or just warm up.' },
    ];

    // Pick a random message set for variety
    const msg = messages[Math.floor(Math.random() * messages.length)];

    await Notifications.scheduleNotificationAsync({
      content: {
        title: msg.title,
        body: msg.body,
        sound: 'default',
        badge: 1,
        data: { screen: 'warmup' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: config.reminderHour,
        minute: 0,
      },
    });

    return true;
  } catch (e) {
    console.error('Failed to schedule notification:', e);
    return false;
  }
}

// ─── Cancel All Reminders ───────────────────────────────────────────────────
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const Notifications = await getNativeModule();
  if (!Notifications) return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}

// ─── Badge Management ───────────────────────────────────────────────────────
export async function setBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;

  const Notifications = await getNativeModule();
  if (!Notifications) return;

  try {
    await Notifications.setBadgeCountAsync(count);
  } catch {}
}

export async function clearBadge(): Promise<void> {
  await setBadgeCount(0);
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useNotifications() {
  const enable = useCallback(async (config: NotificationConfig) => {
    const granted = await requestNotificationPermission();
    if (granted) {
      await scheduleDailyReminder(config);
      // Show immediate confirmation on native
      if (Platform.OS !== 'web') {
        const Notifications = await getNativeModule();
        if (Notifications) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🎤 Voice Trainer',
              body: `Daily reminders set for ${formatHour(config.reminderHour)}!`,
              sound: 'default',
            },
            trigger: null, // fire immediately
          });
        }
      }
    }
    return granted;
  }, []);

  const disable = useCallback(async () => {
    await cancelAllReminders();
    await clearBadge();
  }, []);

  const updateBadge = useCallback(async (streakDays: number) => {
    // Badge shows streak count as a motivator
    if (streakDays > 0) {
      await setBadgeCount(streakDays);
    } else {
      await setBadgeCount(1); // "1" = reminder to practice
    }
  }, []);

  return { enable, disable, updateBadge, clearBadge };
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}
