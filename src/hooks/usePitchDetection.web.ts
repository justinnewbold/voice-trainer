import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { detectPitch, createSmoother, frequencyToNoteInfo, getPitchHint, getPitchColor, NoteInfo } from '../utils/pitchUtils';

const BUFFER_SIZE = 4096;

export interface PitchState {
  frequency: number;
  noteInfo: NoteInfo;
  pitchHint: 'on-pitch' | 'too-low' | 'too-high' | 'silent';
  color: string;
  isListening: boolean;
  hasPermission: boolean | null;
  volume: number;
  confidence: number;
  isStable: boolean;
  error: string | null;
}

const SILENT_NOTE: NoteInfo = { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 };

export function usePitchDetection() {
  const [state, setState] = useState<PitchState>({
    frequency: -1, noteInfo: SILENT_NOTE, pitchHint: 'silent',
    color: '#475569', isListening: false, hasPermission: null,
    volume: 0, confidence: 0, isStable: false, error: null,
  });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const bufferRef = useRef(new Float32Array(BUFFER_SIZE));
  const smootherRef = useRef(createSmoother());
  const isActiveRef = useRef(false);
  const isPausedRef = useRef(false);

  const silenceState = useCallback(() => {
    setState(prev => ({
      ...prev, frequency: -1, noteInfo: SILENT_NOTE,
      pitchHint: 'silent', color: '#475569', volume: 0, confidence: 0, isStable: false,
    }));
  }, []);

  const analyze = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current || isPausedRef.current) return;
    analyserRef.current.getFloatTimeDomainData(bufferRef.current);

    let sum = 0;
    for (let i = 0; i < bufferRef.current.length; i++) sum += bufferRef.current[i] ** 2;
    const volume = Math.sqrt(sum / bufferRef.current.length);

    if (volume > 0.01) {
      const sampleRate = audioCtxRef.current?.sampleRate || 44100;
      const { freq, confidence } = detectPitch(bufferRef.current, sampleRate);
      const { smoothedFreq, isStable } = smootherRef.current(freq, confidence);

      if (smoothedFreq > 0) {
        const noteInfo = frequencyToNoteInfo(smoothedFreq);
        const pitchHint = getPitchHint(noteInfo.cents);
        setState(prev => ({
          ...prev, frequency: smoothedFreq, noteInfo, pitchHint,
          color: getPitchColor(pitchHint),
          volume: Math.min(1, volume * 5), confidence: Math.round(confidence * 100), isStable,
        }));
      } else {
        setState(prev => ({
          ...prev, frequency: -1, noteInfo: SILENT_NOTE, pitchHint: 'silent', color: '#475569',
          volume: Math.min(1, volume * 5), confidence: 0, isStable: false,
        }));
      }
    } else {
      setState(prev => ({
        ...prev, frequency: -1, noteInfo: SILENT_NOTE,
        pitchHint: 'silent', color: '#475569', volume: 0, confidence: 0, isStable: false,
      }));
    }

    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  // ── AppState: pause RAF when backgrounded, resume when active ──
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        isPausedRef.current = true;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        silenceState();
      } else if (nextState === 'active' && isActiveRef.current) {
        isPausedRef.current = false;
        rafRef.current = requestAnimationFrame(analyze);
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [analyze, silenceState]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      stream.getTracks().forEach(t => t.stop());
      setState(prev => ({ ...prev, hasPermission: true }));
      return true;
    } catch {
      setState(prev => ({ ...prev, hasPermission: false }));
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, sampleRate: 44100 },
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx({ sampleRate: 44100 });
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = BUFFER_SIZE;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
      streamRef.current = stream;
      smootherRef.current = createSmoother();
      isActiveRef.current = true;
      isPausedRef.current = false;

      setState(prev => ({ ...prev, isListening: true, hasPermission: true, error: null }));
      rafRef.current = requestAnimationFrame(analyze);
    } catch (err: any) {
      const message = err.name === 'NotAllowedError' ? 'Microphone permission denied'
        : err.name === 'NotFoundError' ? 'No microphone found'
        : 'Could not access microphone';
      setState(prev => ({ ...prev, error: message, hasPermission: err.name === 'NotAllowedError' ? false : prev.hasPermission }));
    }
  }, [analyze]);

  const stopListening = useCallback(() => {
    isActiveRef.current = false;
    isPausedRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    analyserRef.current = null;
    setState(prev => ({
      ...prev, isListening: false, frequency: -1, noteInfo: SILENT_NOTE,
      pitchHint: 'silent', color: '#475569', volume: 0, confidence: 0, isStable: false,
    }));
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return { ...state, startListening, stopListening, requestPermission };
}
