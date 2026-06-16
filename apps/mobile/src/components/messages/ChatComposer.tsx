import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { VoiceNoteRecorder, type VoiceRecorderPhase } from './VoiceNoteRecorder';
import { getVoiceNoteSendErrorMessage } from '../../api/messages.api';
import { colors, layout, radius, spacing, typography } from '../../theme';

interface ChatComposerProps {
  conversationName?: string;
  onSend: (text: string) => void | Promise<void>;
  onSendVoiceNote?: (uri: string, durationSeconds: number) => Promise<void>;
  sending?: boolean;
  voiceUploading?: boolean;
  disabled?: boolean;
  offline?: boolean;
}

export function ChatComposer({
  conversationName,
  onSend,
  onSendVoiceNote,
  sending = false,
  voiceUploading = false,
  disabled = false,
  offline = false,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [voicePhase, setVoicePhase] = useState<VoiceRecorderPhase>('idle');

  const trimmed = text.trim();
  const voiceBusy = voicePhase !== 'idle';
  const canSendText = trimmed.length > 0 && !sending && !disabled && !voiceUploading && !voiceBusy;
  const canUseVoice = Boolean(onSendVoiceNote) && !disabled && !offline && trimmed.length === 0;
  const placeholder = disabled
    ? 'You cannot send messages in this conversation.'
    : offline
      ? 'Connect to the internet to send messages.'
      : conversationName
        ? `Message ${conversationName}`
        : 'Type a message…';

  const handleSend = async () => {
    if (!trimmed || sending || disabled || voiceUploading || voiceBusy) return;
    setSendError(null);
    try {
      await Promise.resolve(onSend(trimmed));
      setText('');
    } catch {
      setSendError('Message failed to send. Tap send to retry.');
    }
  };

  const handleVoiceSend = async (uri: string, durationSeconds: number) => {
    if (!onSendVoiceNote || offline) {
      throw new Error('offline');
    }
    setSendError(null);
    try {
      await onSendVoiceNote(uri, durationSeconds);
    } catch (error) {
      setSendError(getVoiceNoteSendErrorMessage(error));
      throw new Error('voice_send_failed');
    }
  };

  const composerRow = (
    <>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        maxLength={4000}
        editable={!disabled && !sending && !voiceUploading && !voiceBusy}
        style={styles.input}
        textAlignVertical="center"
      />

      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={canSendText ? 'Send message' : 'Send unavailable'}
        disabled={!canSendText}
        onPress={() => void handleSend()}
        style={[styles.sendButton, !canSendText && styles.sendDisabled]}
      >
        {sending ? (
          <Ionicons name="hourglass-outline" size={18} color={colors.white} />
        ) : (
          <Ionicons name="send" size={18} color={colors.white} />
        )}
      </AnimatedPressable>
    </>
  );

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {sendError ? (
        <View style={styles.errorBanner}>
          <Text style={[typography.caption, styles.errorText]}>{sendError}</Text>
        </View>
      ) : null}

      {canUseVoice ? (
        <VoiceNoteRecorder
          disabled={disabled || voiceUploading}
          uploading={voiceUploading}
          onSend={handleVoiceSend}
          onPhaseChange={setVoicePhase}
        >
          {composerRow}
        </VoiceNoteRecorder>
      ) : (
        <View style={styles.row}>{composerRow}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  errorBanner: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.errorContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  errorText: {
    color: colors.error,
    fontFamily: 'Inter_600SemiBold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sendButton: {
    width: layout.touchTargetMin,
    height: layout.touchTargetMin,
    borderRadius: layout.touchTargetMin / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.55,
  },
});
