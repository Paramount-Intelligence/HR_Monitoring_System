import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';
import { formatRole, getInitials } from '../../utils/format';
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
  const content = (
    <>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.name}>{user.full_name}</Text>
        <Text style={styles.meta}>
          {formatRole(user.role)}
          {user.department_name || user.department
            ? ` · ${user.department_name ?? user.department}`
            : ''}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {statusLabel ? <AppBadge label={statusLabel} variant={statusVariant} /> : null}
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
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.mutedText,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  chevron: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: '300',
  },
});
