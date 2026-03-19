import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  profile: any;
  session: Session | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const safeSet = useCallback((setter: Function, value: any) => {
    if (mountedRef.current) setter(value);
  }, []);

  const handleError = useCallback((err: any) => {
    const msg = err?.message || 'Something went wrong';
    safeSet(setError, msg);
    return { error: msg };
  }, [safeSet]);

  const clearError = useCallback(() => setError(null), []);

  const fetchProfile = useCallback(async (userId: string) => {
    if (!supabase || !userId) return null;
    try {
      const { data, error: err } = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (err) throw err;
      safeSet(setProfile, data);
      return data;
    } catch { safeSet(setProfile, null); return null; }
  }, [safeSet]);

  useEffect(() => {
    mountedRef.current = true;
    if (!isSupabaseConfigured()) { setLoading(false); return; }

    supabase!.auth.getSession().then(({ data: { session: s } }) => {
      safeSet(setSession, s);
      safeSet(setUser, s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      safeSet(setLoading, false);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, s) => {
      safeSet(setSession, s);
      safeSet(setUser, s?.user ?? null);
      if (event === 'SIGNED_IN' && s?.user) await fetchProfile(s.user.id);
      if (event === 'SIGNED_OUT') safeSet(setProfile, null);
    });

    return () => { mountedRef.current = false; subscription.unsubscribe(); };
  }, [safeSet, fetchProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName = '') => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();
    try {
      const { data, error: err } = await supabase.auth.signUp({
        email, password, options: { data: { display_name: displayName } },
      });
      if (err) throw err;
      if (data.user && !data.session) return { needsConfirmation: true };
      return { user: data.user };
    } catch (err) { return handleError(err); }
  }, [handleError, clearError]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      return { user: data.user };
    } catch (err) { return handleError(err); }
  }, [handleError, clearError]);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    clearError();
    await supabase.auth.signOut();
  }, [clearError]);

  const resetPassword = useCallback(async (email: string) => {
    if (!supabase) return handleError({ message: 'Auth not configured' });
    clearError();
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email);
      if (err) throw err;
      return { sent: true };
    } catch (err) { return handleError(err); }
  }, [handleError, clearError]);

  const updateProfile = useCallback(async (updates: any) => {
    if (!supabase || !user) return handleError({ message: 'Not logged in' });
    clearError();
    try {
      const { data, error: err } = await supabase.from('profiles')
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select().single();
      if (err) throw err;
      safeSet(setProfile, data);
      return { profile: data };
    } catch (err) { return handleError(err); }
  }, [user, handleError, clearError, safeSet]);

  return {
    user, profile, session, loading, error,
    isAuthenticated: !!session,
    signUp, signIn, signOut, resetPassword, updateProfile, clearError,
  };
}
