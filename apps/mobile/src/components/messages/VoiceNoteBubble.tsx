import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioPlayer } from 'expo-audio/build/AudioModule.types';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '../../types/messages';
import { getAuthenticatedAttachmentSource } from '../../api/messages.api';
import {
  formatDurationSeconds,
  formatMessageTime,
  getVoiceNoteAttachment,
  getVoiceNoteDuration,
} from '../../utils/messages';
import { colors, radius, spacing, typography } from '../../theme';
import {
  clearActiveVoicePlayback,
  getActiveVoiceMessageId,
  registerActiveVoicePlayback,
  stopActiveVoicePlayback,
} from './voice-note-playback';

interface VoiceNoteBubbleProps {
  message: Message;
  isOwn: boolean;
  onRetry?: (message: Message) => void;
}

export function VoiceNoteBubble({ message, isOwn, onRetry }: VoiceNoteBubbleProps) {
  const attachment = getVoiceNoteAttachment(message);
  const durationSeconds = getVoiceNoteDuration(message) || 0;
  const isSending = message.clientStatus === 'sending';
  const isQueued = message.clientStatus === 'queued';
  const isFailed = message.clientStatus === 'failed';
  const playerRef = useRef<AudioPlayer | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackError, setPlaybackError] = useState(false);

  const cleanupPlayer = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    setPlaying(false);
    if (!player) return;
    try {
      player.pause();
      player.remove();
    } catch {
      // ignore
    }
    clearActiveVoicePlayback(message.id);
  }, [message.id]);

  useEffect(() => {
    return () => {
      cleanupPlayer();
    };
  }, [cleanupPlayer]);

  useEffect(() => {
    if (getActiveVoiceMessageId() !== message.id && playing) {
      cleanupPlayer();
    }
  }, [cleanupPlayer, message.id, playing]);

  const togglePlayback = async () => {
    if (!attachment || isSending || playbackError) return;

    if (playing) {
      cleanupPlayer();
      return;
    }

    stopActiveVoicePlayback();
    setLoading(true);
    setPlaybackError(false);

    try {
      const source =
        message.clientVoiceLocalUri && attachment.id === message.clientId
          ? { uri: message.clientVoiceLocalUri }
          : await getAuthenticatedAttachmentSource(attachment.id);
      const { createAudioPlayer, setAudioModeAsync } = await import('expo-audio');
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers',
      });
      const player = createAudioPlayer(source);
      playerRef.current = player;
      registerActiveVoicePlayback(message.id, player);
      player.play();
      setPlaying(true);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.duration && status.duration > 0 && status.currentTime != null) {
          setProgress(Math.min(1, status.currentTime / status.duration));
        }
        if (status.didJustFinish) {
          cleanupPlayer();
          setProgress(0);
        }
      });
    } catch {
      setPlaybackError(true);
      cleanupPlayer();
    } finally {
      setLoading(false);
    }
  };

  const deliveryLabel =
    isOwn && message.delivery_status === 'seen'
      ? 'Seen'
      : isOwn && message.delivery_status === 'delivered'
        ? 'Delivered'
        : isOwn && message.delivery_status === 'sent'
          ? 'Sent'
          : null;

  return (
    <View style={[styles.row, isOwn ? styles.rowOwn : styles.rowOther]}>
      <Pressable
        disabled={!isFailed || !onRetry}
        onPress={() => isFailed && onRetry?.(message)}
        style={styles.bubblePressable}
      >
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
            isFailed && styles.bubbleFailed,
            (isSending || isQueued) && styles.bubbleSending,
          ]}
        >
          {!isOwn ? (
            <Text style={[typography.labelSm, styles.sender]}>{message.sender.full_name}</Text>
          ) : null}

          <View style={styles.voiceRow}>
            <Pressable
              onPress={() => void togglePlayback()}
              disabled={isSending || isQueued || playbackError || !attachment}
              style={[styles.playButton, isOwn ? styles.playButtonOwn : styles.playButtonOther]}
            >
              {loading || isSending ? (
                <ActivityIndicator size="small" color={isOwn ? colors.white : colors.primary} />
              ) : (
                <Ionicons
                  name={playing ? 'pause' : playbackError ? 'alert-circle-outline' : 'play'}
                  size={18}
                  color={isOwn ? colors.white : colors.primary}
                />
              )}
            </Pressable>

            <View style={styles.voiceCopy}>
              <Text style={[typography.bodyMd, isOwn ? styles.bodyOwn : styles.bodyOther]}>
                Voice message
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    isOwn ? styles.progressFillOwn : styles.progressFillOther,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[typography.caption, isOwn ? styles.metaOwn : styles.metaOther]}>
                {formatDurationSeconds(durationSeconds)}
                {playbackError ? ' · Playback failed' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={[typography.caption, isOwn ? styles.metaOwn : styles.metaOther]}>
              {formatMessageTime(message.created_at)}
              {isSending ? ' · Sending…' : ''}
              {isQueued ? ' · Queued' : ''}
              {isFailed ? ' · Failed — tap to retry' : ''}
            </Text>
            {deliveryLabel ? (
              <Text style={[typography.caption, styles.metaOwn]}>{deliveryLabel}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  rowOwn: {
    alignItems: 'flex-end',
  },
  rowOther: {
    alignItems: 'flex-start',
  },
  bubblePressable: {
    maxWidth: '82%',
  },
  bubble: {
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 220,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bubbleSending: {
    opacity: 0.75,
  },
  sender: {
    color: colors.primary,
    marginBottom: 4,
    fontFamily: 'Inter_600SemiBold',
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonOwn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  playButtonOther: {
    backgroundColor: colors.secondaryContainer,
  },
  voiceCopy: {
    flex: 1,
    gap: 4,
  },
  bodyOwn: {
    color: colors.white,
    fontFamily: 'Inter_600SemiBold',
  },
  bodyOther: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.overlay,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressFillOwn: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  progressFillOther: {
    backgroundColor: colors.primary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaOwn: {
    color: 'rgba(255,255,255,0.78)',
  },
  metaOther: {
    color: colors.muted,
  },
});
