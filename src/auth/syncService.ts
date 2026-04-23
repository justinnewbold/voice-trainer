import { supabase, isSupabaseConfigured } from './supabaseClient';
import { loadProgress, saveProgress, UserProgress, loadVocalRange } from '../utils/storage';
import { loadSkillProgress, saveSkillProgress, SkillProgress } from '../utils/skillTree';

// ─── Progress sync ────────────────────────────────────────────────────────────

export async function pullProgress(userId: string): Promise<any | null> {
  if (!isSupabaseConfigured() || !userId || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null; // no row yet
      throw error;
    }
    return data;
  } catch (err) {
    console.error('[sync] pullProgress:', err);
    return null;
  }
}

export async function pushProgress(userId: string, progressData: UserProgress): Promise<boolean> {
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
  } catch (err) {
    console.error('[sync] pushProgress:', err);
    return false;
  }
}

// ─── Vocal range sync ─────────────────────────────────────────────────────────

export async function pushVocalRange(userId: string, rangeData: any): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !rangeData || !supabase) return false;
  try {
    const { error } = await supabase.from('user_vocal_range').upsert({
      user_id: userId,
      low_note: rangeData.lowNote,
      high_note: rangeData.highNote,
      voice_type: rangeData.voiceType,
      semitones: rangeData.semitones,
      tested_at: rangeData.testedAt
        ? new Date(rangeData.testedAt).toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[sync] pushVocalRange:', err);
    return false;
  }
}

// ─── Skill progress sync ──────────────────────────────────────────────────────

export async function pushSkillProgress(userId: string, sp: SkillProgress): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !supabase) return false;
  try {
    const { error } = await supabase.from('skill_progress').upsert({
      user_id: userId,
      completed_ids: sp.completedIds || [],
      earned_xp: sp.earnedXP || 0,
      earned_gems: sp.earnedGems || 0,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[sync] pushSkillProgress:', err);
    return false;
  }
}

export async function pullSkillProgress(userId: string): Promise<SkillProgress | null> {
  if (!isSupabaseConfigured() || !userId || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('skill_progress')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return {
      completedIds: data.completed_ids || [],
      earnedXP: data.earned_xp || 0,
      earnedGems: data.earned_gems || 0,
    };
  } catch (err) {
    console.error('[sync] pullSkillProgress:', err);
    return null;
  }
}

// ─── Full sync (on login / app focus) ─────────────────────────────────────────
// Strategy: take whichever has higher XP as the source of truth,
// then merge completedIds from both to never lose progress.

export async function fullSync(userId: string): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured() || !userId) return { success: false, message: 'Not configured' };

  try {
    const [remoteProgress, localProgress, remoteSkills, localSkills, localRange] =
      await Promise.all([
        pullProgress(userId),
        loadProgress(),
        pullSkillProgress(userId),
        loadSkillProgress(),
        loadVocalRange(),
      ]);

    // Merge progress — remote wins on XP, but merge completedIds
    const useRemote = remoteProgress && (remoteProgress.xp || 0) > (localProgress.xp || 0);
    const mergedProgress: UserProgress = useRemote
      ? {
          ...localProgress,
          totalSessions: remoteProgress.total_sessions,
          totalMinutes: remoteProgress.total_minutes,
          currentStreak: remoteProgress.current_streak,
          longestStreak: Math.max(remoteProgress.longest_streak, localProgress.longestStreak),
          avgAccuracy: remoteProgress.avg_accuracy,
          xp: remoteProgress.xp,
          level: remoteProgress.level,
          sessions: remoteProgress.sessions || [],
          lastDate: remoteProgress.last_date,
          completedIds: [
            ...new Set([
              ...(remoteProgress.completed_ids || []),
              ...(localProgress.completedIds || []),
            ]),
          ],
        }
      : localProgress;

    // Merge skill progress — union of completedIds
    const mergedSkills: SkillProgress = {
      completedIds: [
        ...new Set([
          ...(remoteSkills?.completedIds || []),
          ...(localSkills.completedIds || []),
        ]),
      ],
      earnedXP: Math.max(remoteSkills?.earnedXP || 0, localSkills.earnedXP || 0),
      earnedGems: Math.max(remoteSkills?.earnedGems || 0, localSkills.earnedGems || 0),
    };

    // Save merged data locally
    await Promise.all([
      saveProgress(mergedProgress),
      saveSkillProgress(mergedSkills),
    ]);

    // Push everything back up
    await Promise.all([
      pushProgress(userId, mergedProgress),
      pushSkillProgress(userId, mergedSkills),
      localRange ? pushVocalRange(userId, localRange) : Promise.resolve(),
    ]);

    return { success: true };
  } catch (err: any) {
    console.error('[sync] fullSync:', err);
    return { success: false, message: err?.message };
  }
}

// ─── Post-session background sync (fire-and-forget) ──────────────────────────

export async function syncAfterSession(userId: string | null): Promise<void> {
  if (!userId || !isSupabaseConfigured()) return;
  try {
    const [progress, skills] = await Promise.all([loadProgress(), loadSkillProgress()]);
    await Promise.all([
      pushProgress(userId, progress),
      pushSkillProgress(userId, skills),
    ]);
  } catch (err) {
    console.error('[sync] syncAfterSession:', err);
  }
}
