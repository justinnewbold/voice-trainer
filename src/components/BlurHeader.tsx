import React from 'react';
import { View, Text, StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS } from '../constants/theme';

interface Props {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: ViewStyle;
  rightElement?: React.ReactNode;
}

/**
 * Frosted glass header that uses expo-blur on iOS/Android
 * and a CSS backdrop-filter on web.
 * Falls back to a solid gradient if blur isn't available.
 */
export default function BlurHeader({ title, subtitle, children, style, rightElement }: Props) {
  const [BlurView, setBlurView] = React.useState<any>(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      import('expo-blur').then(mod => setBlurView(() => mod.BlurView)).catch(() => {});
    }
  }, []);

  const content = (
    <>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
        </View>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {children}
    </>
  );

  // iOS: frosted glass
  if (Platform.OS !== 'web' && BlurView) {
    return (
      <BlurView intensity={60} tint="dark" style={[styles.container, styles.blurContainer, style]}>
        <View style={styles.blurOverlay}>
          {content}
        </View>
      </BlurView>
    );
  }

  // Web: CSS backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View
        style={[styles.container, styles.webBlurContainer, style]}
        // @ts-ignore - web-only style property
        accessibilityRole="header"
      >
        {content}
      </View>
    );
  }

  // Fallback: solid background
  return (
    <View style={[styles.container, styles.fallbackContainer, style]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'android' ? 44 : 16,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  blurContainer: {
    overflow: 'hidden',
  },
  blurOverlay: {
    // Semi-transparent overlay on top of blur
    backgroundColor: 'rgba(10, 10, 26, 0.4)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A5066',
  },
  webBlurContainer: {
    backgroundColor: 'rgba(10, 10, 26, 0.75)',
    // Web-only: backdrop-filter is handled in web CSS
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    } : {}),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A5066',
  },
  fallbackContainer: {
    backgroundColor: '#13132AEE',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A5066',
  },
  textContainer: {
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rightElement: {
    marginLeft: 12,
  },
});
