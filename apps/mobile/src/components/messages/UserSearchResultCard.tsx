import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../types/user';
import { getInitials } from '../../utils/format';
import { RoleBadge } from '../ui/RoleBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface UserSearchResultCardProps {
  user: User;
  onPress: () => void;
}

export function UserSearchResultCard({ user, onPress }: UserSearchResultCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(user.full_name)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={[typography.titleMd, styles.name]} numberOfLines={1}>
          {user.full_name}
        </Text>
        <View style={styles.metaRow}>
          <RoleBadge role={user.role} />
          {user.designation ? (
            <Text style={[typography.caption, styles.designation]} numberOfLines={1}>
              {user.designation}
            </Text>
          ) : null}
        </View>
        {user.department_name || user.department ? (
          <Text style={[typography.caption, styles.dept]} numberOfLines={1}>
            {user.department_name ?? user.department}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.card,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
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
    fontWeight: '800',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  designation: {
    color: colors.textSecondary,
  },
  dept: {
    color: colors.muted,
    marginTop: 2,
  },
});
