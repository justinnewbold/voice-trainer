import React, { useEffect, useRef, useState } from 'react';
import { TouchableOpacity, Animated, Easing, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import {
  isFavorite as checkFavorite,
  toggleFavorite as toggle,
  type FavoriteKind,
} from '../utils/favorites';

interface Props {
  id: string;
  kind: FavoriteKind;
  /** Optional callback after the toggle completes — useful for refreshing parent lists. */
  onToggle?: (favorited: boolean) => void;
  /** Visual size (default 22). The hit target stays at least 44pt. */
  size?: number;
  /** Tint when not favorited. */
  inactiveColor?: string;
  /** Tint when favorited. */
  activeColor?: string;
}

export default function FavoriteButton({
  id,
  kind,
  onToggle,
  size = 22,
  inactiveColor = 'rgba(255,255,255,0.35)',
  activeColor = '#FBBF24',
}: Props) {
  const [favorited, setFavorited] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  // Check current state on mount and whenever id/kind changes
  useEffect(() => {
    let cancelled = false;
    checkFavorite(id, kind).then(v => {
      if (!cancelled) {
        setFavorited(v);
        setLoaded(true);
      }
    });
    return () => { cancelled = true; };
  }, [id, kind]);

  const onPress = async () => {
    // Optimistic toggle for snappy feel
    const next = !favorited;
    setFavorited(next);

    // Haptic on iOS/Android (no-op on web)
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    // Pop animation
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.35, duration: 130, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1, damping: 8, stiffness: 220, useNativeDriver: true,
      }),
    ]).start();

    // Persist (and sync state if persistence diverged for any reason)
    const persisted = await toggle(id, kind);
    if (persisted !== next) {
      setFavorited(persisted);
    }
    onToggle?.(persisted);
  };

  // While loading, render an empty same-sized placeholder so the layout is stable.
  if (!loaded) {
    return <View style={[styles.touch, { width: size + 16, height: size + 16 }]} />;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.touch}
      accessibilityRole="button"
      accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={favorited ? 'star' : 'star-outline'}
          size={size}
          color={favorited ? activeColor : inactiveColor}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touch: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
