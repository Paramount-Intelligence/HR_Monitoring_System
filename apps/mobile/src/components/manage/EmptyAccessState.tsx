import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';

interface EmptyAccessStateProps {
  title?: string;
  message?: string;
}

export function EmptyAccessState({
  title = 'Access denied',
  message = 'You do not have access to this section.',
}: EmptyAccessStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[typography.headlineMd, styles.title]}>{title}</Text>
      <Text style={[typography.bodyMd, styles.message]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
