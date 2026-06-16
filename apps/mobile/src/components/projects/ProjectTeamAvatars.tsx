import { StyleSheet, Text, View } from 'react-native';
import { getInitials } from '../../utils/format';
import { colors, radius, spacing, typography } from '../../theme';

interface ProjectTeamAvatarsProps {
  ownerName?: string | null;
  managerName?: string | null;
  count?: number;
}

export function ProjectTeamAvatars({ ownerName, managerName, count = 2 }: ProjectTeamAvatarsProps) {
  const names = [ownerName, managerName].filter(Boolean) as string[];
  const display = names.slice(0, 3);

  return (
    <View style={styles.row}>
      <View style={styles.avatars}>
        {display.map((name, index) => (
          <View key={`${name}-${index}`} style={[styles.avatar, index > 0 && styles.avatarOverlap]}>
            <Text style={styles.initials}>{getInitials(name)}</Text>
          </View>
        ))}
      </View>
      <Text style={[typography.caption, styles.label]}>
        {count} member{count === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.secondaryContainer,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  initials: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  label: {
    color: colors.textSecondary,
  },
});
