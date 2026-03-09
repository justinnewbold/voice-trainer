import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { frequencyToNoteInfo, NoteInfo, getPitchHint, createSmoother } from '../utils/pitchUtils';

export interface PitchState {
  frequency: number;
  noteInfo: NoteInfo;
  pitchHint: 'on-pitch' | 'too-low' | 'too-high' | 'silent';
  isListening: boolean;
  hasPermission: boolean | null;
  volume: number;
  confidence: number;
  isStable: boolean;
}

// NOTE: True PCM-based YIN pitch detection requires a native module on React Native
// (expo-av does not expose raw PCM buffers). This implementation uses metering
// data + a realistic simulation until a native audio module is integrated.
// The YIN algorithm is fully implemented in pitchUtils.ts for when native PCM
// access is available (e.g., via react-native-audio-record or custom module).

const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

export function usePitchDetection() {
  const [state, setState] = useState<PitchState>({
    frequency: -1,
    noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
    pitchHint: 'silent',
    isListening: false,
    hasPermission: null,
    volume: 0,
    confidence: 0,
    isStable: false,
  });

  const recordingRef  = useRef<Audio.Recording | null>(null);
  const intervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const smootherRef   = useRef(createSmoother());
  const isActiveRef   = useRef(false);
  const simTimeRef    = useRef(0);
  const simNoteRef    = useRef(0);
  const simHoldRef    = useRef(0);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Audio.requestPermissionsAsync();
    const granted = status === 'granted';
    setState(prev => ({ ...prev, hasPermission: granted }));
    return granted;
  }, []);

  const startListening = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      isActiveRef.current = true;
      smootherRef.current = createSmoother(); // fresh smoother each session

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: { extension: '.wav', outputFormat: Audio.AndroidOutputFormat.DEFAULT, audioEncoder: Audio.AndroidAudioEncoder.DEFAULT, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
        ios: { extension: '.wav', outputFormat: Audio.IOSOutputFormat.LINEARPCM, audioQuality: Audio.IOSAudioQuality.HIGH, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
        web: { mimeType: 'audio/wav', bitsPerSecond: 128000 },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      setState(prev => ({ ...prev, isListening: true }));

      intervalRef.current = setInterval(async () => {
        if (!isActiveRef.current) return;
        try {
          const status = await recording.getStatusAsync();
          if (!status.isRecording) return;

          const db = status.metering ?? -80;
          const normalizedVolume = Math.max(0, (db + 80) / 80);

          if (normalizedVolume > 0.12) {
            // Advance simulated note every ~1.5s to mimic real singing
            simHoldRef.current += 1;
            if (simHoldRef.current > 15) {
              simHoldRef.current = 0;
              simNoteRef.current = (simNoteRef.current + 1) % NOTE_FREQUENCIES.length;
            }

            const baseFreq = NOTE_FREQUENCIES[simNoteRef.current];
            // YIN-level accuracy simulation: ±8 cents max drift (vs old ±20)
            const drift = (Math.random() - 0.5) * 16 * (1 - normalizedVolume * 0.5);
            const rawFreq = baseFreq * Math.pow(2, drift / 1200);

            // Run through smoother (same as web)
            const confidence = 0.7 + normalizedVolume * 0.3;
            const { smoothedFreq, isStable } = smootherRef.current(rawFreq, confidence);

            if (smoothedFreq > 0) {
              const noteInfo = frequencyToNoteInfo(smoothedFreq);
              const pitchHint = getPitchHint(noteInfo.cents);
              setState(prev => ({
                ...prev,
                frequency: smoothedFreq,
                noteInfo,
                pitchHint,
                volume: normalizedVolume,
                confidence: Math.round(confidence * 100),
                isStable,
              }));
            }
          } else {
            simHoldRef.current = 0;
            setState(prev => ({
              ...prev,
              frequency: -1,
              noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
              pitchHint: 'silent',
              volume: normalizedVolume,
              confidence: 0,
              isStable: false,
            }));
          }
        } catch {}
      }, 100);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, isListening: false }));
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
      ...prev,
      isListening: false,
      frequency: -1,
      noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
      pitchHint: 'silent',
      volume: 0,
      confidence: 0,
      isStable: false,
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
