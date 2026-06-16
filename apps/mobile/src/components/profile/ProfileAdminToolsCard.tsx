import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { canAccessManage, getManageHubTitle } from '../../utils/role';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface ProfileAdminToolsCardProps {
  role?: string | null;
}

export function ProfileAdminToolsCard({ role }: ProfileAdminToolsCardProps) {
  const router = useRouter();

  if (!canAccessManage(role)) {
    return null;
  }

  const title = getManageHubTitle(role);

  return (
    <Pressable
      onPress={() => router.push('/manage' as never)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.accent, { backgroundColor: colors.warning }]} />
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="shield-checkmark-outline" size={22} color={colors.warning} />
        </View>
        <View style={styles.copy}>
          <Text style={[typography.titleMd, styles.title]}>{title}</Text>
          <Text style={[typography.bodyMd, styles.subtitle]}>
            Users, approvals, attendance, and reports
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </View>
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
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.92,
  },
  accent: {
    width: 4,
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
});
