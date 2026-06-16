import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NotificationBell } from '../ui/NotificationBell';
import { RoleBadge, type RoleBadgeRole } from '../ui/RoleBadge';
import { colors, layout, shadows, spacing, typography } from '../../theme';
import { getGreeting, getInitials } from '../../utils/format';
import type { User } from '../../types/user';
import type { DashboardRole } from '../../auth/role-utils';
import { getDashboardRoleLabel } from '../../auth/role-utils';

interface DashboardHeaderProps {
  user: User | null | undefined;
  imageUrl?: string;
  unreadAlerts?: number;
  dashboardRole: DashboardRole;
  sectionTitle?: string;
  sectionSubtitle?: string;
}

const ROLE_SUBTITLES: Partial<Record<DashboardRole, string>> = {
  admin: 'Workforce governance & operations',
  hr_operations: 'People operations overview',
  manager: 'Team operations & health metrics',
  team_lead: 'Assigned team delivery overview',
  employee: 'Your workday at a glance',
  intern: 'Guided view for your assignments',
};

export function DashboardHeader({
  user,
  imageUrl,
  unreadAlerts = 0,
  dashboardRole,
  sectionTitle = 'Overview',
  sectionSubtitle,
}: DashboardHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const resolvedImage = imageUrl;
  const subtitle =
    sectionSubtitle ??
    ROLE_SUBTITLES[dashboardRole] ??
    'Workforce intelligence dashboard';

  const avatar = resolvedImage ? (
    <Image source={{ uri: resolvedImage }} style={styles.avatarImage} accessibilityLabel="Profile photo" />
  ) : (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
    </View>
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.avatarSlot}>{avatar}</View>
        <Text style={[typography.headlineMd, styles.brandTitle]} numberOfLines={1}>
          PIMS Intelligence
        </Text>
        <NotificationBell
          count={unreadAlerts}
          onPress={() => router.push('/alerts')}
          accessibilityLabel="Open alerts"
        />
      </View>

      <View style={styles.hero}>
        <View style={styles.heroRow}>
          <Text style={[typography.headlineLg, styles.greeting]} numberOfLines={2}>
            {getGreeting(user?.full_name)}
          </Text>
          <RoleBadge role={dashboardRole as RoleBadgeRole} />
        </View>
        <Text style={[typography.headlineMd, styles.sectionTitle]}>{sectionTitle}</Text>
        <Text style={[typography.bodyMd, styles.subtitle]} numberOfLines={2}>
          {subtitle}
          {user?.department_name || user?.department
            ? ` · ${user.department_name ?? user.department}`
            : ''}
        </Text>
        <Text style={[typography.caption, styles.roleLine]}>
          {getDashboardRoleLabel(dashboardRole)}
          {user?.full_name ? ` · ${user.full_name}` : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.92)' : colors.surfaceElevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginHorizontal: -spacing.screenPadding,
    marginBottom: spacing.lg,
    ...shadows.tabBar,
  },
  topBar: {
    minHeight: layout.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  avatarSlot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  brandTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.primary,
    fontFamily: 'Inter_700Bold',
  },
  hero: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.lg,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  greeting: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
  },
  roleLine: {
    color: colors.muted,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
