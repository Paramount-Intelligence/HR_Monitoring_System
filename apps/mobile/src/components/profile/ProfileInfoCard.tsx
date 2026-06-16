import { StyleSheet, Text, View } from 'react-native';
import type { User } from '../../types/user';
import { formatDate, formatStatusLabel, safeText } from '../../utils/format';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface ProfileInfoCardProps {
  user: User | null;
}

export function ProfileInfoCard({ user }: ProfileInfoCardProps) {
  const rows = [
    { label: 'Work email', value: safeText(user?.email) },
    { label: 'Department', value: safeText(user?.department_name ?? user?.department) },
    { label: 'Designation', value: safeText(user?.designation) },
    { label: 'Phone', value: safeText(user?.phone) },
    { label: 'Shift', value: safeText(user?.shift_name ?? user?.shift_timing) },
    { label: 'Manager', value: safeText(user?.manager_name) },
    { label: 'Status', value: formatStatusLabel(user?.status) },
    { label: 'Joined', value: user?.created_at ? formatDate(user.created_at) : '—' },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <Text style={[typography.titleMd, styles.title]}>Account details</Text>
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
    backgroundColor: colors.info,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.outlineVariant,
    gap: spacing.md,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    flex: 1.2,
    textAlign: 'right',
  },
});
