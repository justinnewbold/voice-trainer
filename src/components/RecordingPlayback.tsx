import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Svg, { Path, Line, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';
import { SessionReplay, PitchSample } from '../utils/sessionReplay';

interface Props {
  replay: SessionReplay;
  width: number;
}

const GRAPH_H = 160;
const PLAYHEAD_COLOR = '#A855F7';

export default function RecordingPlayback({ replay, width }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0); // 0–1
  const [speed, setSpeed] = useState(1);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const startPosRef = useRef(0);

  const validSamples = replay.samples.filter(s => s.note !== '-' && s.freq > 0);
  const maxT = validSamples.length > 0 ? validSamples[validSamples.length - 1].t : 1;
  const durationSec = (replay.durationMs / 1000).toFixed(1);

  // Current time label
  const currentTime = (playbackPosition * replay.durationMs / 1000).toFixed(1);

  // Find the sample nearest to the current playback position
  const currentSampleIdx = validSamples.findIndex(s => s.t / maxT >= playbackPosition);
  const currentSample = validSamples[Math.max(0, currentSampleIdx - 1)] || null;

  const animate = useCallback(() => {
    if (!startTimeRef.current) return;
    const elapsed = (Date.now() - startTimeRef.current) * speed;
    const totalMs = replay.durationMs;
    const newPos = startPosRef.current + elapsed / totalMs;

    if (newPos >= 1) {
      setPlaybackPosition(1);
      setIsPlaying(false);
      return;
    }

    setPlaybackPosition(newPos);
    animRef.current = requestAnimationFrame(animate);
  }, [replay.durationMs, speed]);

  const play = useCallback(() => {
    if (playbackPosition >= 1) setPlaybackPosition(0);
    startTimeRef.current = Date.now();
    startPosRef.current = playbackPosition >= 1 ? 0 : playbackPosition;
    setIsPlaying(true);
    animRef.current = requestAnimationFrame(animate);
  }, [playbackPosition, animate]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, play, pause]);

  const restart = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setPlaybackPosition(0);
    setIsPlaying(false);
  }, []);

  const toggleSpeed = useCallback(() => {
    setSpeed(prev => prev === 1 ? 0.5 : prev === 0.5 ? 0.75 : 1);
  }, []);

  // Scrub
  const handleScrub = useCallback((evt: any) => {
    const touch = evt.nativeEvent;
    const pos = Math.max(0, Math.min(1, touch.locationX / width));
    setPlaybackPosition(pos);
    startPosRef.current = pos;
    startTimeRef.current = Date.now();
  }, [width]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (validSamples.length < 2) {
    return (
      <View style={[styles.empty, { width }]}>
        <Ionicons name="mic-off-outline" size={32} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>Not enough pitch data for playback</Text>
      </View>
    );
  }

  // Build pitch path with color segments
  const segments: { path: string; color: string }[] = [];
  let currentPath = '';
  let currentColor = COLORS.success;

  for (let i = 0; i < validSamples.length; i++) {
    const s = validSamples[i];
    const x = (s.t / maxT) * width;
    const clampedCents = Math.max(-60, Math.min(60, s.cents));
    const y = GRAPH_H / 2 - (clampedCents / 60) * (GRAPH_H / 2 - 8);
    const color = Math.abs(s.cents) <= 15 ? '#10B981' : Math.abs(s.cents) <= 35 ? '#F59E0B' : '#EF4444';

    if (i === 0) {
      currentPath = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else if (color !== currentColor) {
      segments.push({ path: currentPath, color: currentColor });
      const prevX = (validSamples[i - 1].t / maxT) * width;
      const prevCents = Math.max(-60, Math.min(60, validSamples[i - 1].cents));
      const prevY = GRAPH_H / 2 - (prevCents / 60) * (GRAPH_H / 2 - 8);
      currentPath = `M ${prevX.toFixed(1)} ${prevY.toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentColor = color;
    } else {
      currentPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }
  if (currentPath) segments.push({ path: currentPath, color: currentColor });

  // Target note markers
  const noteMarkers = replay.noteResults.map((nr, i) => {
    const idx = Math.floor((i / replay.noteResults.length) * validSamples.length);
    const s = validSamples[idx];
    if (!s) return null;
    return { x: (s.t / maxT) * width, note: nr.targetNote, hit: nr.hit };
  }).filter(Boolean) as { x: number; note: string; hit: boolean }[];

  const playheadX = playbackPosition * width;

  return (
    <View>
      {/* Current note readout */}
      <View style={styles.readoutRow}>
        <View style={styles.readoutItem}>
          <Text style={styles.readoutLabel}>Position</Text>
          <Text style={styles.readoutValue}>{currentTime}s / {durationSec}s</Text>
        </View>
        {currentSample && (
          <>
            <View style={styles.readoutDivider} />
            <View style={styles.readoutItem}>
              <Text style={styles.readoutLabel}>Note</Text>
              <Text style={[styles.readoutValue, { color: currentSample.hit ? COLORS.success : '#F59E0B' }]}>
                {currentSample.note}{currentSample.octave}
              </Text>
            </View>
            <View style={styles.readoutDivider} />
            <View style={styles.readoutItem}>
              <Text style={styles.readoutLabel}>Cents</Text>
              <Text style={[styles.readoutValue, {
                color: Math.abs(currentSample.cents) <= 15 ? COLORS.success : Math.abs(currentSample.cents) <= 35 ? '#F59E0B' : '#EF4444'
              }]}>
                {currentSample.cents > 0 ? '+' : ''}{currentSample.cents}¢
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Interactive pitch graph */}
      <TouchableOpacity activeOpacity={1} onPress={handleScrub}>
        <Svg width={width} height={GRAPH_H}>
          <Rect x={0} y={0} width={width} height={GRAPH_H} fill="#0A0A1A" rx={8} />

          {/* In-tune zone */}
          <Rect
            x={0}
            y={GRAPH_H / 2 - (15 / 60) * (GRAPH_H / 2 - 8)}
            width={width}
            height={(15 / 60) * (GRAPH_H - 16)}
            fill="#10B98112"
          />

          {/* Center line */}
          <Line x1={0} y1={GRAPH_H / 2} x2={width} y2={GRAPH_H / 2} stroke="#2A2A50" strokeWidth={1} strokeDasharray="4,4" />

          {/* Note markers */}
          {noteMarkers.map((m, i) => (
            <React.Fragment key={i}>
              <Line x1={m.x} y1={0} x2={m.x} y2={GRAPH_H} stroke={m.hit ? '#10B98125' : '#EF444425'} strokeWidth={1} />
              <SvgText x={m.x} y={GRAPH_H - 4} fill={m.hit ? '#10B981' : '#EF4444'} fontSize={8} textAnchor="middle" opacity={0.6}>
                {m.note}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Pitch line segments */}
          {segments.map((seg, i) => {
            const segOpacity = 1;
            return (
              <Path
                key={i}
                d={seg.path}
                stroke={seg.color}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={segOpacity}
              />
            );
          })}

          {/* Playhead */}
          <Line x1={playheadX} y1={0} x2={playheadX} y2={GRAPH_H} stroke={PLAYHEAD_COLOR} strokeWidth={2} />
          <Circle cx={playheadX} cy={GRAPH_H / 2} r={5} fill={PLAYHEAD_COLOR} />

          {/* Labels */}
          <SvgText x={6} y={13} fill="#EF4444" fontSize={9} opacity={0.7}>Sharp ♯</SvgText>
          <SvgText x={6} y={GRAPH_H - 5} fill="#F59E0B" fontSize={9} opacity={0.7}>Flat ♭</SvgText>
        </Svg>
      </TouchableOpacity>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${playbackPosition * 100}%` }]} />
      </View>

      {/* Transport controls */}
      <View style={styles.transport}>
        <TouchableOpacity style={styles.transportBtn} onPress={restart}>
          <Ionicons name="play-skip-back" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.playBtn} onPress={togglePlayback}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.speedBtn} onPress={toggleSpeed}>
          <Text style={styles.speedText}>{speed}x</Text>
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {[['#10B981', 'On pitch'], ['#F59E0B', 'Close'], ['#EF4444', 'Off'], [PLAYHEAD_COLOR, 'Playhead']].map(([c, l]) => (
          <View key={l} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: c }]} />
            <Text style={styles.legendText}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  readoutItem: {
    alignItems: 'center',
  },
  readoutLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  readoutValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  readoutDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2A2A50',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#2A2A50',
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PLAYHEAD_COLOR,
    borderRadius: 1.5,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  transportBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#1E1E3A',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  speedText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  legend: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 10,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
});
