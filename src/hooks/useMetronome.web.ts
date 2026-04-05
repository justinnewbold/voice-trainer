import { useState, useRef, useCallback, useEffect } from 'react';

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
}

export function useMetronome(initialBpm = 80) {
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: initialBpm,
    currentBeat: 0,
    beatsPerMeasure: 4,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextNoteTimeRef = useRef(0);
  const timerIdRef = useRef<number | null>(null);
  const beatRef = useRef(0);
  const isPlayingRef = useRef(false);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playClick = useCallback((time: number, isDownbeat: boolean) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    // Downbeat = higher pitch, louder
    osc.frequency.value = isDownbeat ? 1000 : 700;
    gain.gain.value = isDownbeat ? 0.3 : 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.start(time);
    osc.stop(time + 0.06);
  }, [getAudioContext]);

  const scheduler = useCallback(() => {
    if (!audioCtxRef.current || !isPlayingRef.current) return;
    const ctx = audioCtxRef.current;
    const secondsPerBeat = 60.0 / state.bpm;
    const scheduleAheadTime = 0.1;

    while (nextNoteTimeRef.current < ctx.currentTime + scheduleAheadTime) {
      const isDownbeat = beatRef.current % state.beatsPerMeasure === 0;
      playClick(nextNoteTimeRef.current, isDownbeat);

      const beat = beatRef.current % state.beatsPerMeasure;
      setState(prev => ({ ...prev, currentBeat: beat }));

      nextNoteTimeRef.current += secondsPerBeat;
      beatRef.current++;
    }

    timerIdRef.current = window.setTimeout(scheduler, 25) as unknown as number;
  }, [state.bpm, state.beatsPerMeasure, playClick]);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;
    const ctx = getAudioContext();
    isPlayingRef.current = true;
    beatRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setState(prev => ({ ...prev, isPlaying: true, currentBeat: 0 }));
    scheduler();
  }, [getAudioContext, scheduler]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (timerIdRef.current !== null) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) stop();
    else start();
  }, [start, stop]);

  const setBpm = useCallback((bpm: number) => {
    const clamped = Math.max(40, Math.min(240, bpm));
    setState(prev => ({ ...prev, bpm: clamped }));
  }, []);

  const setBeatsPerMeasure = useCallback((beats: number) => {
    setState(prev => ({ ...prev, beatsPerMeasure: Math.max(2, Math.min(8, beats)) }));
  }, []);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (timerIdRef.current !== null) clearTimeout(timerIdRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return { ...state, start, stop, toggle, setBpm, setBeatsPerMeasure };
}
