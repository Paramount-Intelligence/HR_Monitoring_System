import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Message } from '../../types/messages';
import { formatMessageTime } from '../../utils/messages';
import { colors, radii, spacing } from '../../constants/theme';

interface ChatBubbleProps {
  message: Message;
  isOwn: boolean;
  onRetry?: (message: Message) => void;
}

export function ChatBubble({ message, isOwn, onRetry }: ChatBubbleProps) {
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
        style={[styles.bubblePressable]}
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
          <Text style={styles.sender}>{message.sender.full_name}</Text>
        ) : null}

        <Text style={[styles.body, isOwn ? styles.bodyOwn : styles.bodyOther]}>
          {isDeleted ? 'Message deleted' : message.body || ' '}
        </Text>

        {message.attachments?.length ? (
          <View style={styles.attachment}>
            <Text style={[styles.attachmentText, isOwn && styles.bodyOwn]}>
              📎 {message.attachments[0].original_file_name || 'Attachment'}
            </Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <Text style={[styles.time, isOwn ? styles.timeOwn : styles.timeOther]}>
            {formatMessageTime(message.created_at)}
            {isSending ? ' · Sending…' : ''}
            {isQueued ? ' · Queued' : ''}
            {isFailed ? ' · Failed — tap to retry' : ''}
          </Text>
          {deliveryLabel ? (
            <Text style={styles.delivery}>{deliveryLabel}</Text>
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
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radii.sm,
  },
  bubbleOther: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: radii.sm,
  },
  bubbleFailed: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  bubbleSending: {
    opacity: 0.75,
  },
  sender: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  body: {
    fontSize: 15,
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
    borderRadius: radii.sm,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  attachmentText: {
    fontSize: 13,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },
  time: {
    fontSize: 11,
  },
  timeOwn: {
    color: 'rgba(255,255,255,0.78)',
  },
  timeOther: {
    color: colors.mutedText,
  },
  delivery: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
});
