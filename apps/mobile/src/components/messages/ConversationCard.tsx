import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Conversation } from '../../types/messages';
import {
  formatMessageTime,
  getConversationDisplayName,
  getConversationPreview,
  getInitialsFromName,
} from '../../utils/messages';
import { colors, radii, spacing } from '../../constants/theme';

interface ConversationCardProps {
  conversation: Conversation;
  currentUserId?: string;
  onPress: () => void;
}

export function ConversationCard({
  conversation,
  currentUserId,
  onPress,
}: ConversationCardProps) {
  const name = getConversationDisplayName(conversation, currentUserId);
  const preview = getConversationPreview(conversation);
  const unread = conversation.unread_count ?? 0;
  const timestamp = conversation.last_message?.created_at ?? conversation.updated_at;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitialsFromName(name)}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <Text style={styles.time}>{formatMessageTime(timestamp)}</Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.preview} numberOfLines={2}>
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    minHeight: 76,
  },
  pressed: {
    opacity: 0.92,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  time: {
    fontSize: 12,
    color: colors.mutedText,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: spacing.sm,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: colors.mutedText,
    lineHeight: 18,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
