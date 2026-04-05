import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, BORDER_RADIUS } from '../constants/theme';

interface Props {
  isPlaying: boolean;
  bpm: number;
  currentBeat: number;
  beatsPerMeasure: number;
  onToggle: () => void;
  onSetBpm: (bpm: number) => void;
  onSetBeats?: (beats: number) => void;
}

const BPM_PRESETS = [60, 72, 80, 100, 120, 140];

export default function MetronomeBadge({ isPlaying, bpm, currentBeat, beatsPerMeasure, onToggle, onSetBpm, onSetBeats }: Props) {
  const [showSettings, setShowSettings] = useState(false);

  const beats = Array.from({ length: beatsPerMeasure }, (_, i) => i);

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity style={[styles.toggleBtn, isPlaying && styles.toggleBtnActive]} onPress={onToggle} activeOpacity={0.7}>
          <Ionicons name={isPlaying ? 'pause' : 'metronome'} size={16} color={isPlaying ? '#fff' : COLORS.textMuted} />
        </TouchableOpacity>

        {/* Beat dots */}
        <View style={styles.beatDots}>
          {beats.map(i => (
            <View
              key={i}
              style={[
                styles.beatDot,
                i === 0 && styles.beatDotDownbeat,
                isPlaying && currentBeat === i && styles.beatDotActive,
                isPlaying && currentBeat === i && i === 0 && styles.beatDotDownbeatActive,
              ]}
            />
          ))}
        </View>

        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.bpmLabel}>
          <Text style={[styles.bpmText, isPlaying && styles.bpmTextActive]}>{bpm}</Text>
          <Text style={styles.bpmUnit}>BPM</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Metronome Settings</Text>

            {/* BPM control */}
            <View style={styles.bpmControl}>
              <TouchableOpacity style={styles.bpmBtn} onPress={() => onSetBpm(bpm - 5)}>
                <Ionicons name="remove" size={20} color={COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bpmBtn} onPress={() => onSetBpm(bpm - 1)}>
                <Text style={styles.bpmBtnText}>-1</Text>
              </TouchableOpacity>
              <View style={styles.bpmDisplay}>
                <Text style={styles.bpmDisplayText}>{bpm}</Text>
                <Text style={styles.bpmDisplayUnit}>BPM</Text>
              </View>
              <TouchableOpacity style={styles.bpmBtn} onPress={() => onSetBpm(bpm + 1)}>
                <Text style={styles.bpmBtnText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bpmBtn} onPress={() => onSetBpm(bpm + 5)}>
                <Ionicons name="add" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Presets */}
            <View style={styles.presetRow}>
              {BPM_PRESETS.map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.presetBtn, bpm === p && styles.presetBtnActive]}
                  onPress={() => onSetBpm(p)}
                >
                  <Text style={[styles.presetText, bpm === p && styles.presetTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Beats per measure */}
            {onSetBeats && (
              <View style={styles.beatsRow}>
                <Text style={styles.beatsLabel}>Beats per measure</Text>
                <View style={styles.beatsOptions}>
                  {[2, 3, 4, 6].map(b => (
                    <TouchableOpacity
                      key={b}
                      style={[styles.beatOption, beatsPerMeasure === b && styles.beatOptionActive]}
                      onPress={() => onSetBeats(b)}
                    >
                      <Text style={[styles.beatOptionText, beatsPerMeasure === b && styles.beatOptionTextActive]}>{b}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowSettings(false)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#13132A',
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  toggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: COLORS.primary,
  },
  beatDots: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  beatDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A50',
  },
  beatDotDownbeat: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3A60',
  },
  beatDotActive: {
    backgroundColor: COLORS.primaryLight,
    transform: [{ scale: 1.3 }],
  },
  beatDotDownbeatActive: {
    backgroundColor: COLORS.accent,
  },
  bpmLabel: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bpmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  bpmTextActive: {
    color: COLORS.primaryLight,
  },
  bpmUnit: {
    fontSize: 9,
    color: COLORS.textMuted,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#13132A',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  bpmControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bpmBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  bpmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  bpmDisplay: {
    alignItems: 'center',
    minWidth: 60,
  },
  bpmDisplayText: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.primaryLight,
  },
  bpmDisplayUnit: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 18,
  },
  presetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: '#1E1E3A',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  presetBtnActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  presetText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  presetTextActive: {
    color: COLORS.primaryLight,
  },
  beatsRow: {
    marginBottom: 18,
  },
  beatsLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  beatsOptions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  beatOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E3A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A50',
  },
  beatOptionActive: {
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
  },
  beatOptionText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  beatOptionTextActive: {
    color: COLORS.primaryLight,
  },
  closeBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
