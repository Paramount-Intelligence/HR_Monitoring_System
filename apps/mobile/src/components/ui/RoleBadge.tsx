import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

export type RoleBadgeRole =
  | 'admin'
  | 'hr'
  | 'hr_operations'
  | 'manager'
  | 'team_lead'
  | 'employee'
  | 'intern'
  | 'junior_employee'
  | string;

const roleLabels: Record<string, string> = {
  admin: 'ADMIN',
  hr: 'HR',
  hr_operations: 'HR',
  manager: 'MANAGER',
  team_lead: 'TEAM LEAD',
  employee: 'EMPLOYEE',
  intern: 'INTERN',
  junior_employee: 'JUNIOR EMPLOYEE',
};

interface RoleBadgeProps {
  role?: RoleBadgeRole | null;
  style?: ViewStyle;
}

export function RoleBadge({ role, style }: RoleBadgeProps) {
  const normalized = (role ?? 'employee').toLowerCase().replace(/\s+/g, '_');
  const label = roleLabels[normalized] ?? normalized.replace(/_/g, ' ').toUpperCase();

  return (
    <View style={[styles.badge, style]}>
      <Text style={[typography.labelSm, styles.label]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.secondaryContainer,
  },
  label: {
    color: colors.onSecondaryContainer,
    fontFamily: 'Inter_600SemiBold',
  },
});
