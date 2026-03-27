import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo, PixelRatio, Platform, TextStyle } from 'react-native';

// ─── Dynamic Type Support ───────────────────────────────────────────────────
// iOS respects system font size. We scale our custom sizes accordingly.

/**
 * Returns the system font scale multiplier.
 * On iOS this reflects the Dynamic Type setting.
 * On web/Android it reflects system font scale.
 */
export function useDynamicType() {
  const [fontScale, setFontScale] = useState(PixelRatio.getFontScale());
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [boldText, setBoldText] = useState(false);

  useEffect(() => {
    // Listen for font scale changes (iOS Dynamic Type)
    // React Native exposes this through PixelRatio but no direct listener,
    // so we check on focus/interval for now
    const checkSettings = async () => {
      setFontScale(PixelRatio.getFontScale());

      try {
        const motion = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotion(motion);
      } catch {}

      try {
        const sr = await AccessibilityInfo.isScreenReaderEnabled();
        setScreenReader(sr);
      } catch {}

      try {
        const bold = await AccessibilityInfo.isBoldTextEnabled();
        setBoldText(bold);
      } catch {}
    };

    checkSettings();

    // Subscribe to accessibility changes
    const motionSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const screenReaderSub = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReader);
    const boldSub = AccessibilityInfo.addEventListener('boldTextChanged', setBoldText);

    return () => {
      motionSub?.remove();
      screenReaderSub?.remove();
      boldSub?.remove();
    };
  }, []);

  // Scale a font size respecting Dynamic Type, clamped to reasonable bounds
  const scaledFont = useCallback((baseSize: number, options?: { min?: number; max?: number }): number => {
    const min = options?.min ?? baseSize * 0.8;
    const max = options?.max ?? baseSize * 1.5;
    const scaled = baseSize * fontScale;
    return Math.round(Math.max(min, Math.min(max, scaled)));
  }, [fontScale]);

  // Get text style with accessibility-aware font weight
  const accessibleWeight = useCallback((baseWeight: TextStyle['fontWeight']): TextStyle['fontWeight'] => {
    if (!boldText) return baseWeight;
    // Bump weight up one notch when Bold Text is enabled
    const weights: TextStyle['fontWeight'][] = ['100', '200', '300', '400', '500', '600', '700', '800', '900'];
    const idx = weights.indexOf(baseWeight as any);
    if (idx >= 0 && idx < weights.length - 1) return weights[idx + 1];
    return baseWeight;
  }, [boldText]);

  return {
    fontScale,
    reduceMotion,
    screenReader,
    boldText,
    scaledFont,
    accessibleWeight,
  };
}

// ─── Accessibility Labels ───────────────────────────────────────────────────
// Centralized accessibility strings for VoiceOver

export const A11Y = {
  // Tab bar
  homeTab: { accessibilityLabel: 'Home tab', accessibilityRole: 'tab' as const },
  pitchTab: { accessibilityLabel: 'Pitch detector tab', accessibilityRole: 'tab' as const },
  scalesTab: { accessibilityLabel: 'Scales and exercises tab', accessibilityRole: 'tab' as const },
  songsTab: { accessibilityLabel: 'Song matching tab', accessibilityRole: 'tab' as const },
  moreTab: { accessibilityLabel: 'More options', accessibilityRole: 'button' as const },

  // Pitch detector
  pitchMeter: (note: string, cents: number, freq: number) => ({
    accessibilityLabel: note !== '-'
      ? `Pitch: ${note}, ${Math.abs(cents)} cents ${cents > 0 ? 'sharp' : cents < 0 ? 'flat' : 'on pitch'}, ${Math.round(freq)} hertz`
      : 'No pitch detected. Sing into the microphone.',
    accessibilityRole: 'text' as const,
    accessibilityLiveRegion: 'polite' as const,
  }),

  // Start/stop buttons
  startButton: (isRunning: boolean) => ({
    accessibilityLabel: isRunning ? 'Stop session' : 'Start session',
    accessibilityRole: 'button' as const,
    accessibilityHint: isRunning ? 'Stops the current practice session' : 'Starts pitch detection and begins practice',
  }),

  // Exercise cards
  exerciseCard: (name: string, level: string, completed: boolean) => ({
    accessibilityLabel: `${name}, ${level} level${completed ? ', completed' : ''}`,
    accessibilityRole: 'button' as const,
    accessibilityHint: `Tap to start ${name} exercise`,
  }),

  // Progress stats
  statItem: (label: string, value: string | number) => ({
    accessibilityLabel: `${label}: ${value}`,
    accessibilityRole: 'text' as const,
  }),

  // Session history
  sessionItem: (name: string, accuracy: number, date: string) => ({
    accessibilityLabel: `${name}, ${accuracy}% accuracy, ${date}`,
    accessibilityRole: 'button' as const,
    accessibilityHint: 'Swipe left to delete, tap for details',
  }),

  // Volume level
  volumeLevel: (volume: number) => ({
    accessibilityLabel: `Microphone volume: ${Math.round(volume * 100)}%`,
    accessibilityRole: 'progressbar' as const,
    accessibilityValue: { min: 0, max: 100, now: Math.round(volume * 100) },
  }),
};
