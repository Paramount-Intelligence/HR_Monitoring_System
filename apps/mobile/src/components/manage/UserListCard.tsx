import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RoleBadge } from '../ui/RoleBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { getInitials } from '../../utils/format';
import type { User } from '../../types/user';

interface UserListCardProps {
  user: User;
  subtitle?: string;
  statusLabel?: string;
  statusVariant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  onPress?: () => void;
}

export function UserListCard({
  user,
  subtitle,
  statusLabel,
  statusVariant = 'neutral',
  onPress,
}: UserListCardProps) {
  const department = user.department_name ?? user.department;

  const content = (
    <>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
        </View>
        <View style={styles.content}>
          <Text style={[typography.titleMd, styles.name]} numberOfLines={1}>
            {user.full_name}
          </Text>
          <View style={styles.badges}>
            <RoleBadge role={user.role} />
            {statusLabel ? <StatusBadge label={statusLabel} variant={statusVariant} /> : null}
          </View>
          {department ? (
            <Text style={[typography.bodySm, styles.meta]} numberOfLines={1}>
              {department}
              {user.designation ? ` · ${user.designation}` : ''}
            </Text>
          ) : user.designation ? (
            <Text style={[typography.bodySm, styles.meta]} numberOfLines={1}>
              {user.designation}
            </Text>
          ) : null}
          {subtitle ? (
            <Text style={[typography.caption, styles.subtitle]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {onPress ? (
          <Text style={styles.chevron}>›</Text>
        ) : null}
      </View>
    </>
  );

  if (!onPress) {
    return <View style={styles.card}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
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
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '300',
  },
});
