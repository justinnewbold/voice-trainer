import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { loadFavorites, type FavoriteEntry } from '../utils/favorites';
import { EXERCISES, SONG_MELODIES } from '../utils/scales';

interface HydratedFavorite {
  entry: FavoriteEntry;
  name: string;
  meta: string;
  emoji: string;
  level: 'beginner' | 'intermediate' | 'advanced';
}

const LEVEL_DOT: Record<HydratedFavorite['level'], string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

/**
 * Hydrates favorite entries with metadata from the exercise/song registries.
 * Filters out entries whose underlying exercise/song no longer exists.
 */
function hydrate(entries: FavoriteEntry[]): HydratedFavorite[] {
  const out: HydratedFavorite[] = [];
  for (const e of entries) {
    if (e.kind === 'exercise') {
      const ex = EXERCISES.find(x => x.id === e.id);
      if (!ex) continue;
      out.push({
        entry: e,
        name: ex.name,
        meta: `${ex.notes.length} notes · ${ex.bpm} BPM`,
        emoji: '🎼',
        level: ex.level,
      });
    } else {
      const song = SONG_MELODIES.find(s => s.id === e.id);
      if (!song) continue;
      out.push({
        entry: e,
        name: song.name,
        meta: song.artist,
        emoji: song.emoji || '🎶',
        level: song.level,
      });
    }
  }
  return out;
}

export default function HomeFavoritesSection() {
  const router = useRouter();
  const [items, setItems] = useState<HydratedFavorite[] | null>(null);

  const refresh = useCallback(async () => {
    const list = await loadFavorites();
    setItems(hydrate(list));
  }, []);

  // Refresh whenever Home gains focus — covers the "user starred something
  // on another tab and came back" case.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Initial load
  useEffect(() => { refresh(); }, [refresh]);

  // Don't render the section at all if the user hasn't favorited anything yet.
  // (Keeps the home screen calm for new users.)
  if (items === null || items.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>⭐ Favorites</Text>
        <Text style={styles.count}>{items.length}</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.slice(0, 10).map(item => (
          <TouchableOpacity
            key={`${item.entry.kind}-${item.entry.id}`}
            style={styles.card}
            onPress={() => {
              router.push(item.entry.kind === 'exercise' ? '/(tabs)/scales' : '/(tabs)/songs');
            }}
            activeOpacity={0.75}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={[styles.levelDot, { backgroundColor: LEVEL_DOT[item.level] }]} />
            </View>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text>
            <View style={styles.footerRow}>
              <Ionicons name="play-circle" size={14} color="#A78BFA" />
              <Text style={styles.footerText}>Practice</Text>
            </View>
          </TouchableOpacity>
        ))}

        {items.length > 10 && (
          <View style={[styles.card, styles.moreCard]}>
            <Text style={styles.moreText}>+{items.length - 10}</Text>
            <Text style={styles.moreLabel}>more</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    margin: 16,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  count: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  card: {
    width: 140,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 22,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#A78BFA',
    fontWeight: '600',
  },
  moreCard: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  moreText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  moreLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
