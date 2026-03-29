import { useRef, useCallback } from 'react';
import { Platform, Share } from 'react-native';

/**
 * Hook for capturing a React view as an image and sharing it.
 * Uses react-native-view-shot on native, falls back to text share on web.
 */
export function useShareImage() {
  const viewRef = useRef<any>(null);

  const shareAsImage = useCallback(async (fallbackText: string) => {
    if (Platform.OS === 'web') {
      // Web: fall back to text share
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'My Voice Trainer Score', text: fallbackText });
        } catch {}
      } else {
        // Copy to clipboard
        try {
          await navigator.clipboard.writeText(fallbackText);
        } catch {}
      }
      return;
    }

    // Native: capture view as image and share
    try {
      const ViewShot = await import('react-native-view-shot');
      if (viewRef.current) {
        const uri = await ViewShot.captureRef(viewRef.current, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        await Share.share({
          url: uri,
          title: 'My Voice Trainer Score',
          message: fallbackText,
        });
      } else {
        // No ref attached, fall back to text
        await Share.share({ message: fallbackText, title: 'My Voice Trainer Score' });
      }
    } catch {
      // View shot not available, fall back to text
      await Share.share({ message: fallbackText, title: 'My Voice Trainer Score' });
    }
  }, []);

  return { viewRef, shareAsImage };
}
