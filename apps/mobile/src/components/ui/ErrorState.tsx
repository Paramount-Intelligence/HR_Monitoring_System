import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../theme';
import { AppButton } from './AppButton';

interface ErrorStateProps {
  title?: string;
  message?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  description,
  onRetry,
  retryLabel = 'Retry',
}: ErrorStateProps) {
  const body = description ?? message ?? 'Unable to load data. Please try again.';

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={28} color={colors.danger} />
      </View>
      <Text style={[typography.titleMd, styles.title]}>{title}</Text>
      <Text style={[typography.bodyMd, styles.message]}>{body}</Text>
      {onRetry ? (
        <AppButton title={retryLabel} variant="secondary" onPress={onRetry} style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.dangerTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
  },
  message: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
  button: {
    minWidth: 160,
    marginTop: spacing.sm,
  },
});
