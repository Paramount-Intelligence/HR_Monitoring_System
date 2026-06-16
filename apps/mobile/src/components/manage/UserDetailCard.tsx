import { StyleSheet, Text, View } from 'react-native';
import { RoleBadge } from '../ui/RoleBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';
import { formatDateTime, getInitials, safeText } from '../../utils/format';
import type { User } from '../../types/user';

interface UserDetailCardProps {
  user: User;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
  const statusVariant =
    user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : 'neutral';

  const rows = [
    { label: 'Department', value: safeText(user.department_name ?? user.department, '—') },
    { label: 'Designation', value: safeText(user.designation, '—') },
    { label: 'Manager', value: safeText(user.manager_name, '—') },
    {
      label: 'Shift',
      value: user.shift_name
        ? `${user.shift_name}${user.shift_timing ? ` · ${user.shift_timing}` : ''}`
        : '—',
    },
    { label: 'Phone', value: safeText(user.phone, '—') },
    ...(user.created_at
      ? [{ label: 'Joined', value: formatDateTime(user.created_at) }]
      : []),
  ];

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.hero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={[typography.headlineMd, styles.name]}>{user.full_name}</Text>
            <Text style={[typography.bodyMd, styles.email]}>{user.email}</Text>
            <View style={styles.badges}>
              <RoleBadge role={user.role} />
              <StatusBadge label={safeText(user.status, 'unknown')} variant={statusVariant} />
            </View>
          </View>
        </View>

        {rows.map((row, index) => (
          <View
            key={row.label}
            style={[styles.row, index === rows.length - 1 && styles.rowLast]}
          >
            <Text style={[typography.bodySm, styles.label]}>{row.label}</Text>
            <Text style={[typography.bodyMd, styles.value]} numberOfLines={2}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
    padding: spacing.md,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  email: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  rowLast: {},
  label: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontFamily: 'Inter_600SemiBold',
  },
  value: {
    marginTop: 4,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
});
