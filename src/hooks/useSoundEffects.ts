import { useRef, useCallback } from 'react';

// All sounds synthesized via Web Audio API — no audio files needed.
// Falls back silently on native / no AudioContext.

function getCtx(ctxRef: React.MutableRefObject<AudioContext | null>): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  } catch { return null; }
}

function playOsc(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  freqEnd?: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
  if (freqEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + startOffset + duration);
  }
  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.01);
  gain.gain.setValueAtTime(volume, ctx.currentTime + startOffset + duration - 0.04);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration);
}

export function useSoundEffects() {
  const ctxRef = useRef<AudioContext | null>(null);

  const resume = async (ctx: AudioContext) => {
    if (ctx.state === 'suspended') await ctx.resume();
  };

  // 🎵 Soft chime — played on each correct note hit
  const playNoteHit = useCallback(async () => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    // Two-partial chime: fundamental + octave
    playOsc(ctx, 1046.5, 0, 0.18, 0.18, 'sine');    // C6
    playOsc(ctx, 2093.0, 0, 0.12, 0.08, 'sine');    // C7 (octave)
  }, []);

  // 🎉 Fanfare — played on exercise complete with good accuracy
  const playFanfare = useCallback(async () => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    // Rising major arpeggio: C5 E5 G5 C6
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      playOsc(ctx, freq, i * 0.1, 0.25, 0.22, 'sine');
    });
    // Final chord sustain
    [523.25, 659.25, 783.99].forEach(freq => {
      playOsc(ctx, freq, 0.42, 0.5, 0.14, 'sine');
    });
  }, []);

  // 😅 Simple fanfare for completion below 80%
  const playComplete = useCallback(async () => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    playOsc(ctx, 523.25, 0,    0.15, 0.18, 'sine');
    playOsc(ctx, 659.25, 0.16, 0.15, 0.18, 'sine');
    playOsc(ctx, 523.25, 0.32, 0.25, 0.14, 'sine');
  }, []);

  // ❌ Error tone — played on a miss or wrong note
  const playMiss = useCallback(async () => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    // Short descending blip
    playOsc(ctx, 220, 0, 0.12, 0.12, 'triangle', 160);
  }, []);

  // 🏆 Achievement unlocked jingle
  const playAchievement = useCallback(async () => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    const notes = [659.25, 783.99, 987.77, 1318.5];
    notes.forEach((freq, i) => {
      playOsc(ctx, freq, i * 0.08, 0.2, 0.2, 'sine');
    });
  }, []);

  // 🔔 Countdown beep — low for 3/2, high for 1
  const playCountdownBeep = useCallback(async (count: number) => {
    const ctx = getCtx(ctxRef);
    if (!ctx) return;
    await resume(ctx);
    const freq = count === 1 ? 880 : 440;
    playOsc(ctx, freq, 0, 0.08, 0.15, 'sine');
  }, []);

  return { playNoteHit, playFanfare, playComplete, playMiss, playAchievement, playCountdownBeep };
}
