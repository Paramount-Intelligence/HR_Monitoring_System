import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { User } from '../../types/user';
import { RoleBadge } from '../ui/RoleBadge';
import { colors, radius, spacing, typography } from '../../theme';
import { getInitials, safeText } from '../../utils/format';

interface AssigneeOptionCardProps {
  user: User;
  selected?: boolean;
  onPress: () => void;
}

export function AssigneeOptionCard({ user, selected = false, onPress }: AssigneeOptionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={[typography.bodyMd, styles.name]}>{user.full_name}</Text>
        <Text style={[typography.caption, styles.meta]}>
          {safeText(user.designation ?? user.department_name ?? user.department, 'Team member')}
        </Text>
      </View>
      <RoleBadge role={user.role} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  meta: {
    color: colors.textSecondary,
    marginTop: 2,
  },
});
