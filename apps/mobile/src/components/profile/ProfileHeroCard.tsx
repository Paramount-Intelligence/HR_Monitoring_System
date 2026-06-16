import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { User } from '../../types/user';
import { getProfilePictureUrl } from '../../utils/media-url';
import { formatStatusLabel, getInitials, safeText } from '../../utils/format';
import { RoleBadge } from '../ui/RoleBadge';
import { StatusBadge } from '../ui/StatusBadge';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface ProfileHeroCardProps {
  user: User | null;
  cacheBust?: number;
  onImageError?: () => void;
  imageFailed?: boolean;
  isActive?: boolean;
}

export function ProfileHeroCard({
  user,
  cacheBust,
  onImageError,
  imageFailed = false,
  isActive = false,
}: ProfileHeroCardProps) {
  const imageUrl = !imageFailed
    ? getProfilePictureUrl(user, { cacheBust: cacheBust ?? user?.profile_picture_updated_at })
    : undefined;

  const department = safeText(user?.department_name ?? user?.department, '');
  const designation = safeText(user?.designation, '');
  const phone = safeText(user?.phone, '');

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.avatarWrap}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.avatarImage}
              onError={onImageError}
              accessibilityLabel="Profile photo"
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
            </View>
          )}
        </View>

        <Text style={[typography.headlineMd, styles.name]}>{safeText(user?.full_name, 'User')}</Text>
        <Text style={[typography.bodyMd, styles.email]}>{safeText(user?.email, 'No email')}</Text>

        <View style={styles.badges}>
          <RoleBadge role={user?.role} />
          {isActive ? (
            <StatusBadge label={formatStatusLabel(user?.status)} variant="success" />
          ) : user?.status ? (
            <StatusBadge label={formatStatusLabel(user?.status)} variant="neutral" />
          ) : null}
        </View>

        {(department || designation) ? (
          <View style={styles.metaRow}>
            {department ? (
              <View style={styles.metaItem}>
                <Ionicons name="business-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText}>{department}</Text>
              </View>
            ) : null}
            {designation ? (
              <View style={styles.metaItem}>
                <Ionicons name="briefcase-outline" size={14} color={colors.muted} />
                <Text style={styles.metaText}>{designation}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {phone ? (
          <View style={styles.metaItem}>
            <Ionicons name="call-outline" size={14} color={colors.muted} />
            <Text style={styles.metaText}>{phone}</Text>
          </View>
        ) : null}
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
    padding: spacing.lg,
    alignItems: 'center',
  },
  avatarWrap: {
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.secondaryContainer,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
  },
  name: {
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
  },
  email: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  metaRow: {
    marginTop: spacing.md,
    gap: spacing.xs,
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  metaText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});
