import { StyleSheet, Text, View } from 'react-native';
import { getInitials } from '../../utils/format';
import { colors, spacing, typography } from '../../theme';

interface TaskAssigneeRowProps {
  assigneeName: string;
  assignedByName?: string;
  showAssignee?: boolean;
}

export function TaskAssigneeRow({
  assigneeName,
  assignedByName,
  showAssignee = true,
}: TaskAssigneeRowProps) {
  return (
    <View style={styles.row}>
      {showAssignee ? (
        <View style={styles.item}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>{getInitials(assigneeName)}</Text>
          </View>
          <View>
            <Text style={[typography.caption, styles.label]}>Assigned to</Text>
            <Text style={[typography.bodyMd, styles.name]} numberOfLines={1}>
              {assigneeName}
            </Text>
          </View>
        </View>
      ) : null}
      {assignedByName ? (
        <View style={styles.item}>
          <View style={[styles.avatar, styles.avatarMuted]}>
            <Text style={styles.initials}>{getInitials(assignedByName)}</Text>
          </View>
          <View>
            <Text style={[typography.caption, styles.label]}>Assigned by</Text>
            <Text style={[typography.bodyMd, styles.name]} numberOfLines={1}>
              {assignedByName}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 140,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMuted: {
    backgroundColor: colors.overlay,
  },
  initials: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  label: {
    color: colors.textSecondary,
  },
  name: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
});
