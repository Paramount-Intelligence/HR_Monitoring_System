import { StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';
import { formatRole, formatTime, safeText } from '../../utils/format';
import type { User } from '../../types/user';

interface UserDetailCardProps {
  user: User;
}

export function UserDetailCard({ user }: UserDetailCardProps) {
  const statusVariant =
    user.status === 'active' ? 'success' : user.status === 'suspended' ? 'danger' : 'neutral';

  return (
    <View style={styles.card}>
      <Text style={styles.name}>{user.full_name}</Text>
      <Text style={styles.email}>{user.email}</Text>
      <View style={styles.badges}>
        <AppBadge label={formatRole(user.role)} variant="info" />
        <AppBadge label={safeText(user.status, 'unknown')} variant={statusVariant} />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Department</Text>
        <Text style={styles.value}>{safeText(user.department_name ?? user.department, '—')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Designation</Text>
        <Text style={styles.value}>{safeText(user.designation, '—')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Manager</Text>
        <Text style={styles.value}>{safeText(user.manager_name, '—')}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Shift</Text>
        <Text style={styles.value}>
          {user.shift_name ? `${user.shift_name}${user.shift_timing ? ` · ${user.shift_timing}` : ''}` : '—'}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{safeText(user.phone, '—')}</Text>
      </View>
      {user.created_at ? (
        <View style={styles.row}>
          <Text style={styles.label}>Joined</Text>
          <Text style={styles.value}>{formatTime(user.created_at)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  email: {
    marginTop: 4,
    fontSize: 14,
    color: colors.mutedText,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  value: {
    marginTop: 4,
    fontSize: 15,
    color: colors.text,
  },
});
