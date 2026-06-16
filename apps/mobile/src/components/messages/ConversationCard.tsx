import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import type { Conversation } from '../../types/messages';
import {
  formatMessageTime,
  getConversationDisplayName,
  getConversationPreview,
  getDirectParticipant,
  getInitialsFromName,
  isCallPreviewMessage,
} from '../../utils/messages';
import { RoleBadge } from '../ui/RoleBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';

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
  const participant = getDirectParticipant(conversation, currentUserId);
  const hasUnread = unread > 0;
  const isCallPreview = isCallPreviewMessage(conversation.last_message?.body);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.wrap}
    >
      <View style={[styles.card, hasUnread && styles.cardUnread]}>
        <View style={[styles.accent, { backgroundColor: hasUnread ? colors.primary : colors.outlineVariant }]} />
        <View style={styles.inner}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitialsFromName(name)}</Text>
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.topRow}>
              <Text style={[typography.titleMd, styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[typography.caption, styles.time]}>{formatMessageTime(timestamp)}</Text>
            </View>

            {participant?.role ? (
              <View style={styles.roleRow}>
                <RoleBadge role={participant.role} />
              </View>
            ) : null}

            <View style={styles.bottomRow}>
              {isCallPreview ? (
                <Ionicons name="call-outline" size={14} color={colors.textSecondary} style={styles.callIcon} />
              ) : null}
              <Text
                style={[typography.bodyMd, styles.preview, hasUnread && styles.previewUnread]}
                numberOfLines={2}
              >
                {preview}
              </Text>
              {hasUnread ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  cardUnread: {
    borderColor: `${colors.primary}40`,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
    minHeight: 76,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  nameUnread: {
    fontFamily: 'Inter_700Bold',
  },
  time: {
    color: colors.muted,
  },
  roleRow: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
    gap: spacing.xs,
  },
  callIcon: {
    marginTop: 2,
  },
  preview: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  previewUnread: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
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
