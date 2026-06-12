import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { colors, layout, radii, spacing } from '../../constants/theme';

interface MessageSendButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}

export function MessageSendButton({ disabled = false, loading = false, onPress }: MessageSendButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="Send"
      disabled={isDisabled}
      onPress={onPress}
      style={[styles.button, isDisabled && styles.disabled]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} size="small" />
      ) : (
        <>
          <Ionicons name="send" size={14} color={colors.white} />
          <Text style={styles.label}>Send</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: layout.touchTargetMin,
    minWidth: layout.touchTargetMin,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
  },
  disabled: {
    backgroundColor: colors.mutedText,
    opacity: 0.55,
  },
  label: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
