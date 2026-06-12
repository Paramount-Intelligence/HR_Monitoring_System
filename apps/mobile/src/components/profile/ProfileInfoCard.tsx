import { StyleSheet, Text, View } from 'react-native';
import type { User } from '../../types/user';
import { formatDate, formatStatusLabel, safeText } from '../../utils/format';
import { colors, radii, spacing } from '../../constants/theme';

interface ProfileInfoCardProps {
  user: User | null;
}

export function ProfileInfoCard({ user }: ProfileInfoCardProps) {
  const rows = [
    { label: 'Work Email', value: safeText(user?.email) },
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
      <Text style={styles.title}>Account Details</Text>
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index === rows.length - 1 && styles.rowLast]}
        >
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    color: colors.mutedText,
    fontSize: 14,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
});
