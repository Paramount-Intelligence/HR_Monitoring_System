import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import type { AlertViewModel } from '../../types/alert';
import {
  getAlertAccentColor,
  getCategoryLabel,
} from '../../utils/alert-adapters';
import { formatMessageTime } from '../../utils/messages';
import { getAlertCategoryIcon } from './AlertCategoryIcon';
import { AlertSeverityBadge } from './AlertSeverityBadge';
import { AppButton } from '../ui/AppButton';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface AlertCardProps {
  alert: AlertViewModel;
  onPress: () => void;
  onDismiss?: () => void;
  dismissing?: boolean;
}

export function AlertCard({ alert, onPress, onDismiss, dismissing = false }: AlertCardProps) {
  const isUnread = !alert.isRead && !alert.isResolved;
  const accent = getAlertAccentColor(alert.severity, isUnread);
  const iconName = getAlertCategoryIcon(alert.category);

  return (
    <View style={styles.wrap}>
      <AnimatedPressable
        onPress={onPress}
        accessibilityRole="button"
        style={styles.cardPressable}
      >
        <View style={[styles.card, isUnread && styles.cardUnread]}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.inner}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name={iconName} size={18} color={colors.primary} />
            </View>
            <View style={styles.headerCopy}>
              <Text
                style={[typography.titleMd, styles.title, isUnread && styles.titleUnread]}
                numberOfLines={2}
              >
                {alert.title}
              </Text>
              <Text style={[typography.caption, styles.time]}>
                {formatMessageTime(alert.createdAt)}
              </Text>
            </View>
            {isUnread ? <View style={styles.unreadDot} /> : null}
          </View>

          <Text style={[typography.bodyMd, styles.message]} numberOfLines={3}>
            {alert.message}
          </Text>

          <View style={styles.badges}>
            <AlertSeverityBadge severity={alert.severity} resolved={alert.isResolved} />
            <View style={styles.categoryPill}>
              <Text style={[typography.labelSm, styles.categoryText]}>
                {getCategoryLabel(alert.category)}
              </Text>
            </View>
          </View>

          {alert.actionLabel ? (
            <Text style={[typography.caption, styles.actionHint]}>{alert.actionLabel}</Text>
          ) : null}
        </View>
        </View>
      </AnimatedPressable>

      {isUnread && onDismiss ? (
        <AppButton
          title={alert.source === 'alert' ? 'Mark resolved' : 'Mark read'}
          variant="ghost"
          loading={dismissing}
          onPress={onDismiss}
          style={styles.dismissBtn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  cardPressable: {
    borderRadius: radius.lg,
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
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  titleUnread: {
    fontFamily: 'Inter_700Bold',
  },
  time: {
    color: colors.muted,
    marginTop: 2,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  message: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: colors.overlay,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  categoryText: {
    color: colors.textSecondary,
    textTransform: 'none',
  },
  actionHint: {
    color: colors.primary,
    fontFamily: 'Inter_600SemiBold',
  },
  dismissBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
});
