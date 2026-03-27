import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Text as SvgText, Path } from 'react-native-svg';
import { COLORS, BORDER_RADIUS, SPACING, FONTS } from '../constants/theme';
import { usePitchDetection } from '../hooks/usePitchDetection';
import { useKeepAwake } from '../hooks/useKeepAwake';
import { useReferenceTone } from '../hooks/useReferenceTone';

// ── Music theory ──────────────────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const DISPLAY_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];

function midiToFreq(midi: number) { return 440 * Math.pow(2, (midi - 69) / 12); }
function freqToMidi(freq: number) { return 69 + 12 * Math.log2(freq / 440); }
function noteLabel(midi: number) {
  const name = NOTE_NAMES[((midi % 12) + 12) % 12];
  return (name.includes('#') ? name.replace('#', '♯') : name) + Math.floor(midi / 12 - 1);
}

// Harmony intervals above root
const HARMONY_TARGETS = [
  { semitones: 3,  name: 'Minor 3rd',   abbr: 'm3',  color: '#f59e0b', description: 'Dark, emotional harmony' },
  { semitones: 4,  name: 'Major 3rd',   abbr: 'M3',  color: '#10b981', description: 'Bright, sweet harmony' },
  { semitones: 5,  name: 'Perfect 4th', abbr: 'P4',  color: '#06b6d4', description: 'Powerful, open sound' },
  { semitones: 7,  name: 'Perfect 5th', abbr: 'P5',  color: '#7c6af7', description: 'Strong, classic harmony' },
  { semitones: 8,  name: 'Minor 6th',   abbr: 'm6',  color: '#ec4899', description: 'Bittersweet, rich tone' },
  { semitones: 9,  name: 'Major 6th',   abbr: 'M6',  color: '#f97316', description: 'Warm, soulful harmony' },
  { semitones: 12, name: 'Octave',      abbr: 'P8',  color: '#a78bfa', description: 'Pure unison — an octave higher' },
];

// Root note options (C3–C5)
const ROOT_OPTIONS = [
  { midi: 48, label: 'C3 — Bass' },
  { midi: 52, label: 'E3' },
  { midi: 55, label: 'G3' },
  { midi: 57, label: 'A3' },
  { midi: 60, label: 'C4 — Middle C' },
  { midi: 62, label: 'D4' },
  { midi: 64, label: 'E4' },
  { midi: 65, label: 'F4' },
  { midi: 67, label: 'G4' },
  { midi: 69, label: 'A4' },
  { midi: 72, label: 'C5 — High C' },
];

// ── Harmony Meter SVG ─────────────────────────────────────────────────────────
function HarmonyMeter({
  rootMidi, targetMidi, sungMidi, color,
}: {
  rootMidi: number; targetMidi: number; sungMidi: number | null; color: string;
}) {
  const SIZE = 200;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 80;

  // Map semitone offset (0-12) to arc angle (bottom = 0, full circle = 12 semitones)
  function semitonesToAngle(semitones: number): number {
    return ((semitones / 12) * 360) - 90; // -90 so 0 starts at top
  }

  function polarToXY(angleDeg: number, radius: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
  }

  const targetSemitones = targetMidi - rootMidi;
  const sungSemitones = sungMidi !== null ? (sungMidi - rootMidi) : null;

  const targetAngle = semitonesToAngle(targetSemitones);
  const sungAngle = sungSemitones !== null ? semitonesToAngle(Math.max(0, Math.min(12, sungSemitones))) : null;

  const targetPos = polarToXY(targetAngle, R);
  const sungPos = sungAngle !== null ? polarToXY(sungAngle, R - 12) : null;

  // Accuracy: how close is sung to target (in semitones)
  const accuracy = sungSemitones !== null ? Math.max(0, 1 - Math.abs(sungSemitones - targetSemitones) / 2) : 0;
  const isClose = sungSemitones !== null && Math.abs(sungSemitones - targetSemitones) <= 0.5;

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* Background circle */}
      <Circle cx={CX} cy={CY} r={R} fill="#13132A" stroke="#2A2A50" strokeWidth={2} />

      {/* Reference ring */}
      <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#2A2A50" strokeWidth={16} />

      {/* Accuracy arc (how close you are) */}
      {sungSemitones !== null && (
        <Circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={isClose ? COLORS.success : COLORS.warning}
          strokeWidth={16}
          strokeDasharray={`${accuracy * 2 * Math.PI * R} ${2 * Math.PI * R}`}
          strokeDashoffset={0}
          opacity={0.4}
        />
      )}

      {/* Hour-tick marks for each semitone */}
      {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(s => {
        const angle = semitonesToAngle(s);
        const inner = polarToXY(angle, R - 12);
        const outer = polarToXY(angle, R + 2);
        return <Line key={s} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#3A3A60" strokeWidth={s % 3 === 0 ? 2 : 1} />;
      })}

      {/* Root marker (bottom = 0 semitones) */}
      {(() => { const p = polarToXY(-90, R); return <Circle cx={p.x} cy={p.y} r={6} fill={COLORS.textMuted} />; })()}
      <SvgText x={CX} y={CY + R + 16} fontSize={10} fill={COLORS.textMuted} textAnchor="middle">Root</SvgText>

      {/* Target marker */}
      <Circle cx={targetPos.x} cy={targetPos.y} r={8} fill={color} opacity={0.9} />

      {/* Sung note marker */}
      {sungPos && (
        <Circle cx={sungPos.x} cy={sungPos.y} r={6} fill={isClose ? COLORS.success : COLORS.warning}
          stroke="#fff" strokeWidth={1.5} opacity={0.9} />
      )}

      {/* Center display */}
      <SvgText x={CX} y={CY - 8} fontSize={isClose ? 28 : 22} fill={isClose ? COLORS.success : color}
        textAnchor="middle" fontWeight="900">
        {sungSemitones !== null ? `${sungSemitones >= 0 ? '+' : ''}${Math.round(sungSemitones)}` : '—'}
      </SvgText>
      <SvgText x={CX} y={CY + 14} fontSize={10} fill={COLORS.textMuted} textAnchor="middle">semitones</SvgText>
      {isClose && (
        <SvgText x={CX} y={CY + 28} fontSize={10} fill={COLORS.success} textAnchor="middle" fontWeight="700">✓ On harmony!</SvgText>
      )}
    </Svg>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DuetHarmonyScreen() {
  const [rootMidi, setRootMidi] = useState(60); // C4
  const [targetHarmony, setTargetHarmony] = useState(HARMONY_TARGETS[3]); // P5
  const [isListening, setIsListening] = useState(false);
  const [dronePlaying, setDronePlaying] = useState(false);
  const [showRootPicker, setShowRootPicker] = useState(false);
  const droneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const droneActiveRef = useRef(false);

  const { noteInfo, startListening, stopListening, volume, color } = usePitchDetection();
  const { playTone } = useReferenceTone();

  const targetMidi = rootMidi + targetHarmony.semitones;

  // Calculated sung semitones above root
  const sungMidi = noteInfo.midiNote > 0 && noteInfo.note !== '-' ? noteInfo.midiNote : null;
  const sungSemitones = sungMidi !== null ? Math.round(sungMidi - rootMidi) : null;
  const isOnHarmony = sungSemitones !== null && Math.abs(sungSemitones - targetHarmony.semitones) <= 1;
  const isOnRoot = sungSemitones !== null && Math.abs(sungSemitones) <= 1;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isOnHarmony) {
      Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 400, useNativeDriver: true }),
      ])).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [isOnHarmony]);

  // ── Drone tone loop ──────────────────────────────────────────────────────
  const startDrone = useCallback(async () => {
    droneActiveRef.current = true;
    setDronePlaying(true);
    const freq = midiToFreq(rootMidi);
    // Play drone every 1.8 seconds with a 1.6s sustain
    const tick = async () => {
      if (!droneActiveRef.current) return;
      await playTone(freq, 1600, 0.25);
    };
    await tick();
    droneIntervalRef.current = setInterval(tick, 1800);
  }, [rootMidi, playTone]);

  const stopDrone = useCallback(() => {
    droneActiveRef.current = false;
    setDronePlaying(false);
    if (droneIntervalRef.current) { clearInterval(droneIntervalRef.current); droneIntervalRef.current = null; }
  }, []);

  // ── Start/stop session ───────────────────────────────────────────────────
  const handleStart = async () => {
    await startDrone();
    await startListening();
    setIsListening(true);
  };

  const handleStop = async () => {
    stopDrone();
    await stopListening();
    setIsListening(false);
  };

  // Restart drone if root changes while active
  useEffect(() => {
    if (dronePlaying) {
      stopDrone();
      setTimeout(() => startDrone(), 100);
    }
  }, [rootMidi]);

  useEffect(() => () => { stopDrone(); }, []);

  const harmonyColor = targetHarmony.color;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <LinearGradient colors={['#1a0a2e', '#0A0A1A']} style={styles.header}>
        <Text style={styles.title}>🎼 Duet / Harmony</Text>
        <Text style={styles.subtitle}>Sing a harmony above the drone note</Text>
      </LinearGradient>

      {/* Root note selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drone Note</Text>
        <TouchableOpacity style={styles.rootSelector} onPress={() => setShowRootPicker(!showRootPicker)}>
          <View style={styles.rootLeft}>
            <Text style={styles.rootNote}>{noteLabel(rootMidi)}</Text>
            <Text style={styles.rootFreq}>{Math.round(midiToFreq(rootMidi))} Hz</Text>
          </View>
          <Ionicons name={showRootPicker ? 'chevron-up' : 'chevron-down'} size={20} color={COLORS.textMuted} />
        </TouchableOpacity>
        {showRootPicker && (
          <View style={styles.rootGrid}>
            {ROOT_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.midi}
                style={[styles.rootOption, rootMidi === opt.midi && styles.rootOptionActive]}
                onPress={() => { setRootMidi(opt.midi); setShowRootPicker(false); }}>
                <Text style={[styles.rootOptionNote, rootMidi === opt.midi && styles.rootOptionNoteActive]}>
                  {noteLabel(opt.midi)}
                </Text>
                <Text style={styles.rootOptionLabel}>{opt.label.split(' — ')[1] || ''}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Target harmony selector */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target Harmony</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.harmonyRow}>
          {HARMONY_TARGETS.map(h => (
            <TouchableOpacity key={h.semitones}
              style={[styles.harmonyChip, { borderColor: h.color + '66' }, targetHarmony.semitones === h.semitones && { backgroundColor: h.color + '22', borderColor: h.color }]}
              onPress={() => setTargetHarmony(h)}>
              <Text style={[styles.harmonyAbbr, { color: h.color }]}>{h.abbr}</Text>
              <Text style={styles.harmonyName}>{h.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={[styles.harmonyInfo, { borderColor: harmonyColor + '44' }]}>
          <Text style={[styles.harmonyInfoTitle, { color: harmonyColor }]}>
            {targetHarmony.name} above {noteLabel(rootMidi)} = {noteLabel(targetMidi)}
          </Text>
          <Text style={styles.harmonyInfoDesc}>{targetHarmony.description}</Text>
        </View>
      </View>

      {/* Main meter */}
      <View style={styles.meterSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <HarmonyMeter
            rootMidi={rootMidi}
            targetMidi={targetMidi}
            sungMidi={sungMidi}
            color={harmonyColor}
          />
        </Animated.View>

        {/* Status label */}
        <View style={styles.statusRow}>
          {!isListening ? (
            <Text style={styles.statusIdle}>Press Start to begin</Text>
          ) : noteInfo.note === '-' ? (
            <Text style={styles.statusListening}>🎤 Listening… start singing</Text>
          ) : isOnHarmony ? (
            <Text style={[styles.statusGood, { color: COLORS.success }]}>✓ Beautiful {targetHarmony.name} harmony!</Text>
          ) : isOnRoot ? (
            <Text style={styles.statusWarn}>You're on the root — sing {targetHarmony.semitones} semitones higher</Text>
          ) : (
            <Text style={styles.statusWarn}>
              {noteLabel(Math.round(rootMidi + (sungSemitones ?? 0)))} — target is {noteLabel(targetMidi)}
            </Text>
          )}
        </View>

        {/* Note labels */}
        {isListening && noteInfo.note !== '-' && (
          <View style={styles.noteLabels}>
            <View style={styles.noteLabelItem}>
              <Text style={styles.noteLabelTitle}>Drone (root)</Text>
              <Text style={styles.noteLabelNote}>{noteLabel(rootMidi)}</Text>
            </View>
            <View style={styles.noteLabelDivider} />
            <View style={styles.noteLabelItem}>
              <Text style={styles.noteLabelTitle}>Target harmony</Text>
              <Text style={[styles.noteLabelNote, { color: harmonyColor }]}>{noteLabel(targetMidi)}</Text>
            </View>
            <View style={styles.noteLabelDivider} />
            <View style={styles.noteLabelItem}>
              <Text style={styles.noteLabelTitle}>You're singing</Text>
              <Text style={[styles.noteLabelNote, { color: isOnHarmony ? COLORS.success : COLORS.warning }]}>
                {noteInfo.note}{noteInfo.octave}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Start/Stop */}
      <View style={styles.btnRow}>
        {!isListening ? (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: harmonyColor }]} onPress={handleStart}>
            <Ionicons name="mic" size={22} color="#fff" />
            <Text style={styles.startBtnText}>Start — Play Drone & Listen</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Ionicons name="stop-circle" size={22} color="#fff" />
            <Text style={styles.stopBtnText}>Stop</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* How to use */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How to Use</Text>
        {[
          ['🎵', 'Pick a drone note that fits your vocal range'],
          ['🎼', 'Choose a target harmony interval'],
          ['▶️', 'Tap Start — the drone plays on repeat'],
          ['🎤', 'Sing along, aiming for the target harmony note'],
          ['🎯', 'The meter shows how close you are in real time'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.tipRow}>
            <Text style={styles.tipIcon}>{icon}</Text>
            <Text style={styles.tipText}>{text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: SPACING.lg },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  section: { margin: 16, marginBottom: 0, backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 16, borderWidth: 1, borderColor: '#2A2A50' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primaryLight, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  rootSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 14, borderWidth: 1, borderColor: '#2A2A50' },
  rootLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  rootNote: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  rootFreq: { fontSize: 12, color: COLORS.textMuted },
  rootGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  rootOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: BORDER_RADIUS.md, backgroundColor: '#1E1E3A', borderWidth: 1, borderColor: '#2A2A50', alignItems: 'center' },
  rootOptionActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  rootOptionNote: { fontSize: 14, fontWeight: '700', color: COLORS.textMuted },
  rootOptionNoteActive: { color: COLORS.primaryLight },
  rootOptionLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 1 },
  harmonyRow: { gap: 8, paddingBottom: 8 },
  harmonyChip: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, backgroundColor: '#1E1E3A', borderWidth: 1.5, alignItems: 'center', minWidth: 70 },
  harmonyAbbr: { fontSize: 14, fontWeight: '800' },
  harmonyName: { fontSize: 9, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
  harmonyInfo: { backgroundColor: '#1E1E3A', borderRadius: BORDER_RADIUS.md, padding: 12, borderWidth: 1, marginTop: 8 },
  harmonyInfoTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  harmonyInfoDesc: { fontSize: 12, color: COLORS.textMuted },
  meterSection: { alignItems: 'center', padding: 16, gap: 12 },
  statusRow: { alignItems: 'center' },
  statusIdle: { fontSize: 14, color: COLORS.textMuted },
  statusListening: { fontSize: 14, color: COLORS.textSecondary },
  statusGood: { fontSize: 16, fontWeight: '700' },
  statusWarn: { fontSize: 13, color: COLORS.warning, textAlign: 'center' },
  noteLabels: { flexDirection: 'row', backgroundColor: '#13132A', borderRadius: BORDER_RADIUS.lg, padding: 14, borderWidth: 1, borderColor: '#2A2A50', width: '100%' },
  noteLabelItem: { flex: 1, alignItems: 'center' },
  noteLabelTitle: { fontSize: 10, color: COLORS.textMuted, marginBottom: 4 },
  noteLabelNote: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  noteLabelDivider: { width: 1, backgroundColor: '#2A2A50' },
  btnRow: { margin: 16, marginTop: 8 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: BORDER_RADIUS.lg },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: BORDER_RADIUS.lg, backgroundColor: COLORS.danger },
  stopBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  tipIcon: { fontSize: 18, width: 24 },
  tipText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
});
