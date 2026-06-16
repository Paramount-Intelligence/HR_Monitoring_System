import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../../types/messages';
import { formatMessageTime, isVoiceNoteMessage } from '../../utils/messages';
import { VoiceNoteBubble } from './VoiceNoteBubble';
import { colors, radius, spacing, typography } from '../../theme';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onRetry?: (message: Message) => void;
}

export function ChatBubble({ message, isOwn, onRetry }: ChatBubbleProps) {
  if (isVoiceNoteMessage(message)) {
    return <VoiceNoteBubble message={message} isOwn={isOwn} onRetry={onRetry} />;
  }

  const isSending = message.clientStatus === 'sending';
  const isQueued = message.clientStatus === 'queued';
  const isFailed = message.clientStatus === 'failed';
  const isDeleted = message.is_deleted;

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

          <Text style={[typography.bodyMd, styles.body, isOwn ? styles.bodyOwn : styles.bodyOther]}>
            {isDeleted ? 'Message deleted' : message.body || ' '}
          </Text>

          {message.attachments?.length ? (
            <View style={styles.attachment}>
              <Text style={[typography.caption, isOwn ? styles.bodyOwn : styles.bodyOther]}>
                Attachment: {message.attachments[0].original_file_name || 'File'}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaRow}>
            <Text style={[typography.caption, styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
              {formatMessageTime(message.created_at)}
              {isSending ? ' · Sending…' : ''}
              {isQueued ? ' · Queued' : ''}
              {isFailed ? ' · Failed — tap to retry' : ''}
            </Text>
            {deliveryLabel ? (
              <Text style={[typography.caption, styles.delivery]}>{deliveryLabel}</Text>
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
    maxWidth: '100%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
    textTransform: 'none',
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    lineHeight: 21,
  },
  bodyOwn: {
    color: colors.white,
  },
  bodyOther: {
    color: colors.text,
  },
  attachment: {
    marginTop: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.overlay,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  time: {},
  timeOwn: {
    color: 'rgba(255,255,255,0.78)',
  },
  timeOther: {
    color: colors.muted,
  },
  delivery: {
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Inter_600SemiBold',
  },
});
