import { useCallback } from 'react';
import { Platform, Vibration } from 'react-native';

// On native we use expo-haptics for quality haptic patterns.
// On web we fall back to the Vibration API (works on Android Chrome, silent on iOS Safari).
// Import is conditional so expo-haptics doesn't crash on web.

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationStyle = 'success' | 'warning' | 'error';

async function nativeImpact(style: ImpactStyle) {
  try {
    const Haptics = await import('expo-haptics');
    const map = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    await Haptics.impactAsync(map[style]);
  } catch {}
}

async function nativeNotification(style: NotificationStyle) {
  try {
    const Haptics = await import('expo-haptics');
    const map = {
      success: Haptics.NotificationFeedbackType.Success,
      warning: Haptics.NotificationFeedbackType.Warning,
      error: Haptics.NotificationFeedbackType.Error,
    };
    await Haptics.notificationAsync(map[style]);
  } catch {}
}

function webVibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {}
}

export function useHaptics() {
  // 🎵 Light tap — every correct note hit
  const hitNote = useCallback(() => {
    if (Platform.OS !== 'web') { nativeImpact('light'); }
    else { webVibrate(30); }
  }, []);

  // 🔥 Medium buzz — combo milestone (every 5 notes)
  const hitCombo = useCallback(() => {
    if (Platform.OS !== 'web') { nativeImpact('medium'); }
    else { webVibrate([20, 30, 20]); }
  }, []);

  // 🏆 Double buzz — exercise complete with good accuracy
  const completeFanfare = useCallback(() => {
    if (Platform.OS !== 'web') { nativeNotification('success'); }
    else { webVibrate([40, 60, 40, 60, 80]); }
  }, []);

  // ❌ Error buzz — missed note or wrong answer
  const miss = useCallback(() => {
    if (Platform.OS !== 'web') { nativeNotification('error'); }
    else { webVibrate([60, 40]); }
  }, []);

  // 🎉 Achievement unlocked
  const achievement = useCallback(() => {
    if (Platform.OS !== 'web') { nativeNotification('success'); }
    else { webVibrate([30, 50, 30, 50, 120]); }
  }, []);

  // 🔔 Countdown tick
  const countdownTick = useCallback((count: number) => {
    if (Platform.OS !== 'web') { nativeImpact(count === 1 ? 'heavy' : 'light'); }
    else { webVibrate(count === 1 ? 60 : 20); }
  }, []);

  return { hitNote, hitCombo, completeFanfare, miss, achievement, countdownTick };
}
