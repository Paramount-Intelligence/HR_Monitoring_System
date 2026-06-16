import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AudioPlayer } from 'expo-audio/build/AudioModule.types';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { openAppSettings } from '../../permissions/device-permissions';
import {
  VOICE_NOTE_MAX_SECONDS,
  formatDurationSeconds,
} from '../../utils/messages';
import { colors, radius, spacing, typography } from '../../theme';

export type VoiceRecorderPhase = 'idle' | 'recording' | 'preview' | 'uploading';

interface VoiceNoteRecorderProps {
  disabled?: boolean;
  uploading?: boolean;
  onSend: (uri: string, durationSeconds: number) => Promise<void>;
  onCancel?: () => void;
  onPhaseChange?: (phase: VoiceRecorderPhase) => void;
  children?: ReactNode;
}

async function ensureMicrophonePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    const { PermissionsAndroid } = await import('react-native');
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  const { requestRecordingPermissionsAsync } = await import('expo-audio');
  const result = await requestRecordingPermissionsAsync();
  return result.granted;
}

export function VoiceNoteRecorder({
  disabled = false,
  uploading = false,
  onSend,
  onCancel,
  onPhaseChange,
  children,
}: VoiceNoteRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<VoiceRecorderPhase>('idle');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewDuration, setPreviewDuration] = useState(0);
  const previewPlayerRef = useRef<AudioPlayer | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const setPhaseSafe = useCallback(
    (next: VoiceRecorderPhase) => {
      setPhase(next);
      onPhaseChange?.(next);
    },
    [onPhaseChange]
  );

  const cleanupPreviewPlayer = useCallback(() => {
    const player = previewPlayerRef.current;
    previewPlayerRef.current = null;
    setPreviewPlaying(false);
    if (!player) return;
    try {
      player.pause();
      player.remove();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupPreviewPlayer();
      try {
        void recorder.stop();
      } catch {
        // Native recorder may already be released on unmount.
      }
    };
  }, [cleanupPreviewPlayer, recorder]);

  const reset = useCallback(async () => {
    cleanupPreviewPlayer();
    if (previewUri) {
      void FileSystem.deleteAsync(previewUri, { idempotent: true });
    }
    setPreviewUri(null);
    setPreviewDuration(0);
    setPhaseSafe('idle');
    onCancel?.();
  }, [cleanupPreviewPlayer, onCancel, previewUri, setPhaseSafe]);

  const startRecording = async () => {
    if (disabled || uploading) return;

    const granted = await ensureMicrophonePermission();
    if (!granted) {
      Alert.alert(
        'Microphone access needed',
        'Allow microphone access to record voice notes.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openAppSettings() },
        ]
      );
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
      });
      await recorder.prepareToRecordAsync();
      recorder.record({ forDuration: VOICE_NOTE_MAX_SECONDS });
      setPhaseSafe('recording');
    } catch {
      Alert.alert('Recording unavailable', 'Unable to start voice recording on this device.');
    }
  };

  const stopRecording = async () => {
    if (phase !== 'recording') return;
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const durationSeconds = Math.max(
        1,
        Math.min(
          VOICE_NOTE_MAX_SECONDS,
          Math.round((recorderState.durationMillis || recorder.currentTime * 1000) / 1000)
        )
      );
      if (!uri) {
        Alert.alert('Recording failed', 'No audio was captured. Please try again.');
        await reset();
        return;
      }
      setPreviewUri(uri);
      setPreviewDuration(durationSeconds);
      setPhaseSafe('preview');
    } catch {
      Alert.alert('Recording failed', 'Unable to finish recording.');
      await reset();
    }
  };

  const cancelRecording = async () => {
    if (phase === 'recording') {
      try {
        await recorder.stop();
      } catch {
        // ignore
      }
    }
    try {
      if (recorder.uri) {
        void FileSystem.deleteAsync(recorder.uri, { idempotent: true });
      }
    } catch {
      // ignore
    }
    await reset();
  };

  const togglePreview = async () => {
    if (!previewUri) return;
    if (previewPlaying) {
      cleanupPreviewPlayer();
      return;
    }

    try {
      const { createAudioPlayer, setAudioModeAsync: setMode } = await import('expo-audio');
      await setMode({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      const player = createAudioPlayer({ uri: previewUri });
      previewPlayerRef.current = player;
      player.play();
      setPreviewPlaying(true);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          cleanupPreviewPlayer();
        }
      });
    } catch {
      Alert.alert('Playback unavailable', 'Unable to preview this recording.');
    }
  };

  const handleSend = async () => {
    if (!previewUri || uploading) return;
    cleanupPreviewPlayer();
    setPhaseSafe('uploading');
    try {
      await onSend(previewUri, previewDuration);
      void FileSystem.deleteAsync(previewUri, { idempotent: true });
      setPreviewUri(null);
      setPreviewDuration(0);
      setPhaseSafe('idle');
    } catch {
      setPhaseSafe('preview');
    }
  };

  const elapsedSeconds = Math.max(
    0,
    Math.round((recorderState.durationMillis || recorder.currentTime * 1000) / 1000)
  );
  const nearLimit = elapsedSeconds >= VOICE_NOTE_MAX_SECONDS - 5;

  return (
    <>
      {phase !== 'idle' ? (
        <View style={styles.panel}>
          {phase === 'recording' ? (
            <>
              <View style={styles.recordingRow}>
                <View style={styles.recordingDot} />
                <Text style={[typography.bodyMd, styles.recordingLabel]}>
                  Recording {formatDurationSeconds(elapsedSeconds)}
                </Text>
                {nearLimit ? (
                  <Text style={[typography.caption, styles.limitHint]}>
                    Max {VOICE_NOTE_MAX_SECONDS}s
                  </Text>
                ) : null}
              </View>
              <View style={styles.actions}>
                <AnimatedPressable onPress={() => void cancelRecording()} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Cancel</Text>
                </AnimatedPressable>
                <AnimatedPressable onPress={() => void stopRecording()} style={styles.primaryBtn}>
                  <Ionicons name="stop" size={16} color={colors.white} />
                  <Text style={styles.primaryBtnText}>Stop</Text>
                </AnimatedPressable>
              </View>
            </>
          ) : null}

          {phase === 'preview' || phase === 'uploading' ? (
            <>
              <View style={styles.previewRow}>
                <AnimatedPressable
                  onPress={() => void togglePreview()}
                  disabled={phase === 'uploading'}
                  style={styles.previewPlay}
                >
                  <Ionicons
                    name={previewPlaying ? 'pause' : 'play'}
                    size={18}
                    color={colors.primary}
                  />
                </AnimatedPressable>
                <View style={styles.previewCopy}>
                  <Text style={[typography.bodyMd, styles.previewTitle]}>Voice note ready</Text>
                  <Text style={[typography.caption, styles.previewMeta]}>
                    {formatDurationSeconds(previewDuration)}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <AnimatedPressable
                  disabled={phase === 'uploading'}
                  onPress={() => void reset()}
                  style={styles.secondaryBtn}
                >
                  <Text style={styles.secondaryBtnText}>Delete</Text>
                </AnimatedPressable>
                <AnimatedPressable
                  disabled={phase === 'uploading'}
                  onPress={() => void handleSend()}
                  style={[styles.primaryBtn, phase === 'uploading' && styles.primaryBtnDisabled]}
                >
                  {phase === 'uploading' ? (
                    <Text style={styles.primaryBtnText}>Uploading…</Text>
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color={colors.white} />
                      <Text style={styles.primaryBtnText}>Send</Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      <View style={styles.row}>
        {phase === 'idle' ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="Record voice note"
            disabled={disabled || uploading}
            onPress={() => void startRecording()}
            style={[styles.iconButton, (disabled || uploading) && styles.iconButtonDisabled]}
          >
            <Ionicons name="mic-outline" size={22} color={colors.primary} />
          </AnimatedPressable>
        ) : null}
        {children}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryContainer,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  panel: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: spacing.sm,
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingLabel: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  limitHint: {
    color: colors.warning,
    fontFamily: 'Inter_600SemiBold',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewPlay: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryContainer,
  },
  previewCopy: {
    flex: 1,
  },
  previewTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  previewMeta: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
