import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadProgress, UserProgress } from '../utils/storage';

export async function pullProgress(userId: string) {
  if (!isSupabaseConfigured() || !userId || !supabase) return null;
  try {
    const { data, error } = await supabase.from('user_progress').select('*').eq('user_id', userId).single();
    if (error) { if (error.code === 'PGRST116') return null; throw error; }
    return data;
  } catch (err) { console.error('pullProgress:', err); return null; }
}

export async function pushProgress(userId: string, progressData: UserProgress) {
  if (!isSupabaseConfigured() || !userId || !supabase) return false;
  try {
    const { error } = await supabase.from('user_progress').upsert({
      user_id: userId,
      total_sessions: progressData.totalSessions || 0,
      total_minutes: progressData.totalMinutes || 0,
      current_streak: progressData.currentStreak || 0,
      longest_streak: progressData.longestStreak || 0,
      avg_accuracy: progressData.avgAccuracy || 0,
      xp: progressData.xp || 0,
      level: progressData.level || 'beginner',
      sessions: progressData.sessions || [],
      last_date: progressData.lastDate || null,
      completed_ids: progressData.completedIds || [],
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (err) { console.error('pushProgress:', err); return false; }
}

export async function pushVocalRange(userId: string, rangeData: any) {
  if (!isSupabaseConfigured() || !userId || !rangeData || !supabase) return false;
  try {
    const { error } = await supabase.from('user_vocal_range').upsert({
      user_id: userId,
      low_note: rangeData.lowNote,
      high_note: rangeData.highNote,
      voice_type: rangeData.voiceType,
      semitones: rangeData.semitones,
      tested_at: rangeData.testedAt ? new Date(rangeData.testedAt).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (err) { console.error('pushVocalRange:', err); return false; }
}

export async function fullSync(userId: string) {
  if (!isSupabaseConfigured() || !userId) return { success: false };
  try {
    const remote = await pullProgress(userId);
    const local = await loadProgress();
    const merged = remote && remote.xp > (local.xp || 0)
      ? { ...local, totalSessions: remote.total_sessions, totalMinutes: remote.total_minutes,
          currentStreak: remote.current_streak, longestStreak: Math.max(remote.longest_streak, local.longestStreak),
          avgAccuracy: remote.avg_accuracy, xp: remote.xp, level: remote.level,
          sessions: remote.sessions || [], lastDate: remote.last_date,
          completedIds: [...new Set([...(remote.completed_ids || []), ...local.completedIds])] }
      : local;
    await pushProgress(userId, merged);
    return { success: true };
  } catch { return { success: false }; }
}
