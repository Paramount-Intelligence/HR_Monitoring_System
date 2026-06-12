import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Notification } from '../../types/notification';
import {
  formatNotificationTime,
  getNotificationIcon,
  getNotificationIconColor,
} from '../../utils/notifications';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, badgePalettes, radii, spacing } from '../../constants/theme';

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  index?: number;
}

export function NotificationCard({ notification, onPress, index = 0 }: NotificationCardProps) {
  const iconName = getNotificationIcon(notification.notification_type);
  const iconColor = getNotificationIconColor(
    notification.notification_type,
    notification.is_read
  );

  return (
    <FadeSlideIn index={index} translateY={8}>
      <AnimatedPressable
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.card, !notification.is_read && styles.unread]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text
              style={[styles.title, !notification.is_read && styles.titleUnread]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            <Text style={styles.time}>{formatNotificationTime(notification.created_at)}</Text>
          </View>
          <Text style={styles.body} numberOfLines={2}>
            {notification.message}
          </Text>
        </View>
        {!notification.is_read ? <View style={styles.unreadDot} /> : null}
      </AnimatedPressable>
    </FadeSlideIn>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  unread: {
    borderColor: colors.primary,
    backgroundColor: badgePalettes.info.bg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  titleUnread: {
    fontWeight: '800',
  },
  time: {
    fontSize: 12,
    color: colors.mutedText,
  },
  body: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 19,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
});
