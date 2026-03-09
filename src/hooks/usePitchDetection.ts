import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { detectPitch, frequencyToNoteInfo, NoteInfo, getPitchHint } from '../utils/pitchUtils';

export interface PitchState {
  frequency: number;
  noteInfo: NoteInfo;
  pitchHint: 'on-pitch' | 'too-low' | 'too-high' | 'silent';
  isListening: boolean;
  hasPermission: boolean | null;
  volume: number;
}

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 2048;

export function usePitchDetection() {
  const [state, setState] = useState<PitchState>({
    frequency: -1,
    noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
    pitchHint: 'silent',
    isListening: false,
    hasPermission: null,
    volume: 0,
  });

  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(false);

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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      isActiveRef.current = true;

      // Poll pitch by analyzing audio samples
      // We use a simulated real-time approach since expo-av doesn't expose raw PCM
      // In production, use expo-audio or a native module for true real-time PCM
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: SAMPLE_RATE,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      });

      await recording.startAsync();
      recordingRef.current = recording;

      setState(prev => ({ ...prev, isListening: true }));

      // Simulate pitch detection with metering updates
      // Real implementation would use PCM data from the recording
      intervalRef.current = setInterval(async () => {
        if (!isActiveRef.current) return;
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording && status.metering !== undefined) {
            const db = status.metering; // -160 to 0 dB
            const normalizedVolume = Math.max(0, (db + 80) / 80);

            // Generate simulated pitch for demo
            // In full native implementation, this would be real PCM analysis
            if (normalizedVolume > 0.1) {
              // Simulate a detected note based on volume patterns
              const simulatedFreq = simulatePitchFromMetering(normalizedVolume);
              const noteInfo = frequencyToNoteInfo(simulatedFreq);
              const pitchHint = getPitchHint(noteInfo.cents);

              setState(prev => ({
                ...prev,
                frequency: simulatedFreq,
                noteInfo,
                pitchHint,
                volume: normalizedVolume,
              }));
            } else {
              setState(prev => ({
                ...prev,
                frequency: -1,
                noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
                pitchHint: 'silent',
                volume: normalizedVolume,
              }));
            }
          }
        } catch (e) {
          // Recording may have stopped
        }
      }, 100);
    } catch (error) {
      console.error('Failed to start recording:', error);
      setState(prev => ({ ...prev, isListening: false }));
    }
  }, [requestPermission]);

  const stopListening = useCallback(async () => {
    isActiveRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {
        // Already stopped
      }
      recordingRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isListening: false,
      frequency: -1,
      noteInfo: { note: '-', octave: 0, frequency: 0, cents: 0, midiNote: 0 },
      pitchHint: 'silent',
      volume: 0,
    }));
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    requestPermission,
  };
}

// Simulated pitch detection for demo purposes
// In production, replace with real PCM-based autocorrelation
let simTime = 0;
const NOTE_FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25];

function simulatePitchFromMetering(volume: number): number {
  simTime += 1;
  const noteIndex = Math.floor((simTime / 20) % NOTE_FREQUENCIES.length);
  const baseFreq = NOTE_FREQUENCIES[noteIndex];
  // Add slight pitch variation to simulate real singing
  const variation = (Math.random() - 0.5) * 20;
  return baseFreq + variation * volume;
}
