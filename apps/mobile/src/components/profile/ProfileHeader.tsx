import { Image, StyleSheet, Text, View } from 'react-native';
import type { User } from '../../types/user';
import { getProfilePictureUrl } from '../../utils/media-url';
import { formatRole, formatStatusLabel, getInitials, safeText } from '../../utils/format';
import { colors, badgePalettes, radii, spacing } from '../../constants/theme';

interface ProfileHeaderProps {
  user: User | null;
  cacheBust?: number;
  onImageError?: () => void;
  imageFailed?: boolean;
  isActive?: boolean;
}

export function ProfileHeader({
  user,
  cacheBust,
  onImageError,
  imageFailed = false,
  isActive = false,
}: ProfileHeaderProps) {
  const imageUrl = !imageFailed
    ? getProfilePictureUrl(user, { cacheBust: cacheBust ?? user?.profile_picture_updated_at })
    : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.avatarWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatarImage}
            onError={onImageError}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{getInitials(user?.full_name)}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{safeText(user?.full_name, 'User')}</Text>
      <Text style={styles.email}>{safeText(user?.email, 'No email')}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{formatRole(user?.role)}</Text>
      </View>
      {isActive ? (
        <View style={styles.activeBadge}>
          <Text style={styles.activeText}>{formatStatusLabel(user?.status)}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarWrap: {
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.border,
  },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: colors.mutedText,
    marginTop: spacing.xs,
  },
  roleBadge: {
    marginTop: spacing.md,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  roleText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  activeBadge: {
    marginTop: spacing.sm,
    backgroundColor: badgePalettes.success.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  activeText: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 12,
  },
});
