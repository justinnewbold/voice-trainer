import { useRef, useCallback, useState } from 'react';

// Plays a sine-wave reference tone at the given frequency for a short burst.
// Falls back gracefully if Web Audio is unavailable (native, no AudioContext).

export function useReferenceTone() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);

  const getCtx = (): AudioContext | null => {
    try {
      if (typeof window === 'undefined') return null;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioCtx();
      }
      return ctxRef.current;
    } catch { return null; }
  };

  const playTone = useCallback(async (frequency: number, durationMs = 600, volume = 0.35) => {
    const ctx = getCtx();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') await ctx.resume();

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      // Smooth attack + decay envelope
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.03);
      gainNode.gain.setValueAtTime(volume, ctx.currentTime + durationMs / 1000 - 0.08);
      gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + durationMs / 1000);

      setPlaying(true);
      setTimeout(() => setPlaying(false), durationMs);
    } catch { setPlaying(false); }
  }, []);

  const playNote = useCallback(async (midiNote: number, durationMs = 600) => {
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    await playTone(freq, durationMs);
  }, [playTone]);

  return { playTone, playNote, playing };
}
