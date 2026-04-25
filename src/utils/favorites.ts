import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ──────────────────────────────────────────────────────────────────
export type FavoriteKind = 'exercise' | 'song';

export interface FavoriteEntry {
  id: string;          // Underlying exercise/song ID (e.g. "b1", "s7")
  kind: FavoriteKind;
  addedAt: number;     // ms timestamp
}

const FAVORITES_KEY = 'vt_favorites_v1';

// ─── Storage helpers ────────────────────────────────────────────────────────
async function getItem(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}
async function setItem(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

// ─── Public API ─────────────────────────────────────────────────────────────
/**
 * Returns all favorited entries, newest first.
 */
export async function loadFavorites(): Promise<FavoriteEntry[]> {
  const raw = await getItem(FAVORITES_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/**
 * Returns true iff a given (id, kind) pair is favorited.
 * Convenience for tinting star icons in lists without full hydration.
 */
export async function isFavorite(id: string, kind: FavoriteKind): Promise<boolean> {
  const list = await loadFavorites();
  return list.some(f => f.id === id && f.kind === kind);
}

/**
 * Add a favorite. No-op if already favorited.
 * Returns the updated list (newest first).
 */
export async function addFavorite(id: string, kind: FavoriteKind): Promise<FavoriteEntry[]> {
  const list = await loadFavorites();
  if (list.some(f => f.id === id && f.kind === kind)) {
    return list;
  }
  const next: FavoriteEntry[] = [
    { id, kind, addedAt: Date.now() },
    ...list,
  ];
  await setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

/**
 * Remove a favorite. No-op if not favorited.
 * Returns the updated list.
 */
export async function removeFavorite(id: string, kind: FavoriteKind): Promise<FavoriteEntry[]> {
  const list = await loadFavorites();
  const next = list.filter(f => !(f.id === id && f.kind === kind));
  if (next.length === list.length) return list;
  await setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

/**
 * Toggle. Returns whether the item is favorited AFTER the toggle.
 */
export async function toggleFavorite(id: string, kind: FavoriteKind): Promise<boolean> {
  const list = await loadFavorites();
  const exists = list.some(f => f.id === id && f.kind === kind);
  if (exists) {
    await removeFavorite(id, kind);
    return false;
  }
  await addFavorite(id, kind);
  return true;
}

/**
 * Clears all favorites. Used by clearProgress.
 */
export async function resetFavorites(): Promise<void> {
  try { await AsyncStorage.removeItem(FAVORITES_KEY); } catch {}
}
