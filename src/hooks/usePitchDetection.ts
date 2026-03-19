import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { frequencyToNoteInfo, NoteInfo, getPitchHint, getPitchColor, createSmoother } from '../utils/pitchUtils';

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

// NOTE: expo-av doesn't expose raw PCM buffers on native.
// This uses metering + realistic simulation until a native module is integrated.
// The YIN algorithm in pitchUtils.ts is ready for when raw PCM access is available.
const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

export function usePitchDetection() {
  const [state, setState] = useState<PitchState>({
    frequency: -1,
    noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
    pitchHint: 'silent',
    color: '#475569',
    isListening: false,
    hasPermission: null,
    volume: 0,
    confidence: 0,
    isStable: false,
    error: null,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const smootherRef = useRef(createSmoother());
  const isActiveRef = useRef(false);
  const simNoteRef = useRef(0);
  const simHoldRef = useRef(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    const granted = status === 'granted';
    setState(prev => ({ ...prev, hasPermission: granted }));
    return granted;
  }, []);

  const startListening = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setState(prev => ({ ...prev, error: 'Microphone permission denied' }));
      return;
    }

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      isActiveRef.current = true;
      smootherRef.current = createSmoother();

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: { extension: '.wav', outputFormat: Audio.AndroidOutputFormat.DEFAULT, audioEncoder: Audio.AndroidAudioEncoder.DEFAULT, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
        ios: { extension: '.wav', outputFormat: Audio.IOSOutputFormat.LINEARPCM, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
        web: { mimeType: 'audio/wav', bitsPerSecond: 128000 },
        isMeteringEnabled: true,
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setState(prev => ({ ...prev, isListening: true, error: null }));

      intervalRef.current = setInterval(async () => {
        if (!isActiveRef.current) return;
        try {
          const status = await recording.getStatusAsync();
          if (!status.isRecording) return;

          const db = status.metering ?? -80;
          const normalizedVolume = Math.max(0, (db + 80) / 80);

          if (normalizedVolume > 0.12) {
            simHoldRef.current += 1;
            if (simHoldRef.current > 15) {
              simHoldRef.current = 0;
              simNoteRef.current = (simNoteRef.current + 1) % NOTE_FREQUENCIES.length;
            }
            const baseFreq = NOTE_FREQUENCIES[simNoteRef.current];
            const drift = (Math.random() - 0.5) * 16 * (1 - normalizedVolume * 0.5);
            const rawFreq = baseFreq * Math.pow(2, drift / 1200);
            const confidence = 0.7 + normalizedVolume * 0.3;
            const { smoothedFreq, isStable } = smootherRef.current(rawFreq, confidence);

            if (smoothedFreq > 0) {
              const noteInfo = frequencyToNoteInfo(smoothedFreq);
              const pitchHint = getPitchHint(noteInfo.cents);
              setState(prev => ({
                ...prev,
                frequency: smoothedFreq, noteInfo, pitchHint,
                color: getPitchColor(pitchHint),
                volume: normalizedVolume, confidence: Math.round(confidence * 100), isStable,
              }));
            }
          } else {
            simHoldRef.current = 0;
            setState(prev => ({
              ...prev,
              frequency: -1, noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
              pitchHint: 'silent', color: '#475569', volume: normalizedVolume, confidence: 0, isStable: false,
            }));
          }
        } catch {}
      }, 100);
    } catch (error: any) {
      setState(prev => ({ ...prev, isListening: false, error: error.message || 'Failed to start recording' }));
    }
  }, [requestPermission]);

  const stopListening = useCallback(async () => {
    isActiveRef.current = false;
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch {}
      recordingRef.current = null;
    }
    setState(prev => ({
      ...prev, isListening: false, frequency: -1,
      noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
      pitchHint: 'silent', color: '#475569', volume: 0, confidence: 0, isStable: false,
    }));
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) recordingRef.current.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  return { ...state, startListening, stopListening, requestPermission };
}
