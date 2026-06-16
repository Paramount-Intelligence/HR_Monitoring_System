import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { useUnreadNotificationCount, useOpenAlertsCount } from '../../hooks/useAlerts';
import { colors, radius, shadows, spacing, typography } from '../../theme';

export function ProfileAlertsCard() {
  const router = useRouter();
  const unreadQuery = useUnreadNotificationCount();
  const openAlertsQuery = useOpenAlertsCount();

  const unreadNotifications = unreadQuery.data ?? 0;
  const openAlerts = openAlertsQuery.data ?? 0;
  const total = unreadNotifications + openAlerts;

  return (
    <AnimatedPressable
      onPress={() => router.push('/alerts')}
      accessibilityRole="button"
      style={styles.card}
    >
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="notifications-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.copy}>
          <Text style={[typography.titleMd, styles.title]}>Notifications & Alerts</Text>
          <Text style={[typography.bodyMd, styles.subtitle]}>
            {total > 0
              ? `${total} item${total === 1 ? '' : 's'} need attention`
              : 'View workforce alerts and updates'}
          </Text>
        </View>
        {total > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{total > 99 ? '99+' : total}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  accent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
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
