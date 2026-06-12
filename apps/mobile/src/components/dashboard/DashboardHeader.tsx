import type { ReactNode } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PimsLogo } from '../brand/PimsLogo';
import { AppBadge } from '../ui/AppBadge';
import { colors, spacing } from '../../constants/theme';
import { formatRole, getGreeting, getInitials } from '../../utils/format';
import { getProfilePictureUrl } from '../../utils/media-url';
import type { User } from '../../types/user';
import { normalizeRole } from '../../utils/role';

interface DashboardHeaderProps {
  user: User | null | undefined;
  imageUrl?: string;
}

export function DashboardHeader({ user, imageUrl }: DashboardHeaderProps) {
  const insets = useSafeAreaInsets();
  const role = normalizeRole(user?.role);
  const resolvedImage = imageUrl ?? getProfilePictureUrl(user);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm }]}>
      <View style={styles.topRow}>
        <PimsLogo size={36} showWordmark variant="light" />
        {resolvedImage ? (
          <Image source={{ uri: resolvedImage }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
          </View>
        )}
      </View>

      <Text style={styles.greeting} numberOfLines={2}>
        {getGreeting(user?.full_name)}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.subtitle} numberOfLines={1}>
          {formatRole(role)}
          {user?.department_name || user?.department
            ? ` · ${user.department_name ?? user.department}`
            : ''}
        </Text>
        <AppBadge label={formatRole(role)} variant="info" />
      </View>
    </View>
  );
}

export function DashboardSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    marginHorizontal: -spacing.md,
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  greeting: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  avatarText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
});
