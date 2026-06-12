import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { colors, layout, radii, spacing } from '../../constants/theme';

interface ChatComposerProps {
  conversationName?: string;
  onSend: (text: string) => void | Promise<void>;
  sending?: boolean;
  disabled?: boolean;
}

export function ChatComposer({
  conversationName,
  onSend,
  sending = false,
  disabled = false,
}: ChatComposerProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);

  const canSend = text.trim().length > 0 && !sending && !disabled;
  const placeholder = disabled
    ? 'You cannot send messages in this conversation.'
    : conversationName
      ? `Message ${conversationName}`
      : 'Type a message…';

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSendError(null);
    try {
      await Promise.resolve(onSend(trimmed));
      setText('');
    } catch {
      setSendError('Message failed to send. Tap send to retry.');
    }
  };

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {sendError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{sendError}</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedText}
          multiline
          maxLength={4000}
          editable={!disabled && !sending}
          style={styles.input}
          textAlignVertical="center"
        />

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={!canSend}
          onPress={() => void handleSend()}
          style={[styles.sendButton, !canSend && styles.sendDisabled]}
        >
          {sending ? (
            <Ionicons name="hourglass-outline" size={18} color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  errorBanner: {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.errorSurface,
    borderWidth: 1,
    borderColor: colors.errorBorder,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
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
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.mutedText,
    opacity: 0.55,
  },
});
