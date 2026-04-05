import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

export interface MetronomeState {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
}

// Generate a short click sound buffer (PCM WAV)
function createClickWav(frequency: number, durationMs: number, volume: number): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationMs / 1000);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 30); // fast decay
    const sample = Math.sin(2 * Math.PI * frequency * t) * envelope * volume;
    view.setInt16(44 + i * 2, Math.max(-32768, Math.min(32767, sample * 32767)), true);
  }

  // Convert to base64 data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(binary);
}

export function useMetronome(initialBpm = 80) {
  const [state, setState] = useState<MetronomeState>({
    isPlaying: false,
    bpm: initialBpm,
    currentBeat: 0,
    beatsPerMeasure: 4,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatRef = useRef(0);
  const isPlayingRef = useRef(false);
  const highClickRef = useRef<Audio.Sound | null>(null);
  const lowClickRef = useRef<Audio.Sound | null>(null);

  // Preload click sounds
  const loadSounds = useCallback(async () => {
    try {
      const highUri = createClickWav(1000, 50, 0.4);
      const lowUri = createClickWav(700, 50, 0.2);
      const { sound: high } = await Audio.Sound.createAsync({ uri: highUri });
      const { sound: low } = await Audio.Sound.createAsync({ uri: lowUri });
      highClickRef.current = high;
      lowClickRef.current = low;
    } catch {}
  }, []);

  useEffect(() => { loadSounds(); }, [loadSounds]);

  const playClick = useCallback(async (isDownbeat: boolean) => {
    try {
      const sound = isDownbeat ? highClickRef.current : lowClickRef.current;
      if (sound) {
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch {}
  }, []);

  const start = useCallback(() => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;
    beatRef.current = 0;
    setState(prev => ({ ...prev, isPlaying: true, currentBeat: 0 }));

    const tick = () => {
      const isDownbeat = beatRef.current % state.beatsPerMeasure === 0;
      playClick(isDownbeat);
      setState(prev => ({ ...prev, currentBeat: beatRef.current % prev.beatsPerMeasure }));
      beatRef.current++;
    };

    tick(); // immediate first tick
    const ms = 60000 / state.bpm;
    intervalRef.current = setInterval(tick, ms);
  }, [state.bpm, state.beatsPerMeasure, playClick]);

  const stop = useCallback(() => {
    isPlayingRef.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setState(prev => ({ ...prev, isPlaying: false, currentBeat: 0 }));
  }, []);

  const toggle = useCallback(() => {
    if (isPlayingRef.current) stop();
    else start();
  }, [start, stop]);

  const setBpm = useCallback((bpm: number) => {
    const clamped = Math.max(40, Math.min(240, bpm));
    setState(prev => ({ ...prev, bpm: clamped }));
    // If playing, restart with new BPM
    if (isPlayingRef.current) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const ms = 60000 / clamped;
      intervalRef.current = setInterval(() => {
        const isDownbeat = beatRef.current % state.beatsPerMeasure === 0;
        playClick(isDownbeat);
        setState(prev => ({ ...prev, currentBeat: beatRef.current % prev.beatsPerMeasure }));
        beatRef.current++;
      }, ms);
    }
  }, [state.beatsPerMeasure, playClick]);

  const setBeatsPerMeasure = useCallback((beats: number) => {
    setState(prev => ({ ...prev, beatsPerMeasure: Math.max(2, Math.min(8, beats)) }));
  }, []);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      highClickRef.current?.unloadAsync().catch(() => {});
      lowClickRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return { ...state, start, stop, toggle, setBpm, setBeatsPerMeasure };
}
