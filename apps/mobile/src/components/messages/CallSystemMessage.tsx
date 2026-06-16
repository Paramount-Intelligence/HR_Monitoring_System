import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message } from '../../types/messages';
import { formatMessageTime } from '../../utils/messages';
import { isCallSystemMessage } from '../../calls/call-utils';
import { colors, radius, spacing, typography } from '../../theme';

interface CallSystemMessageProps {
  message: Message;
}

function getCallIcon(body: string): keyof typeof Ionicons.glyphMap {
  const lower = body.toLowerCase();
  if (lower.includes('video')) return 'videocam';
  if (lower.includes('missed')) return 'call-outline';
  return 'call';
}

export function CallSystemMessage({ message }: CallSystemMessageProps) {
  const icon = getCallIcon(message.body);

  return (
    <View style={styles.wrap}>
      <View style={styles.pill}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <Text style={[typography.caption, styles.body]}>{message.body}</Text>
      </View>
      <Text style={[typography.caption, styles.time]}>{formatMessageTime(message.created_at)}</Text>
    </View>
  );
}

export function shouldRenderCallSystemMessage(message: Message): boolean {
  return isCallSystemMessage(message.body, message.message_type);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryTint,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    maxWidth: '90%',
  },
  body: {
    color: colors.text,
    flexShrink: 1,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'none',
  },
  time: {
    marginTop: 4,
    color: colors.muted,
  },
});
