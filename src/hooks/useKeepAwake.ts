import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Keeps the screen awake while a session is active.
 * On iOS: uses expo-keep-awake (native API)
 * On web: uses Wake Lock API (Chrome 84+), falls back silently
 */
export function useKeepAwake(isActive: boolean) {
  useEffect(() => {
    if (!isActive) return;

    let cleanup: (() => void) | undefined;

    if (Platform.OS === 'web') {
      // Web Wake Lock API
      let wakeLock: any = null;
      const acquire = async () => {
        try {
          if ('wakeLock' in navigator) {
            wakeLock = await (navigator as any).wakeLock.request('screen');
          }
        } catch {}
      };
      acquire();
      cleanup = () => {
        try { wakeLock?.release(); } catch {}
      };
    } else {
      // Native: use expo-keep-awake
      let deactivate: (() => void) | undefined;
      (async () => {
        try {
          const KeepAwake = await import('expo-keep-awake');
          KeepAwake.activateKeepAwakeAsync('pitch-session');
          deactivate = () => {
            KeepAwake.deactivateKeepAwake('pitch-session');
          };
        } catch {}
      })();
      cleanup = () => {
        deactivate?.();
      };
    }

    return () => {
      cleanup?.();
    };
  }, [isActive]);
}
