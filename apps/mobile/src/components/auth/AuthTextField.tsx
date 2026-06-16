import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, layout, radius, spacing, typography } from '../../theme';

interface AuthTextFieldProps extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: boolean;
  secureToggle?: boolean;
  secureVisible?: boolean;
  onToggleSecure?: () => void;
}

export function AuthTextField({
  label,
  icon = 'mail-outline',
  error = false,
  secureToggle = false,
  secureVisible = false,
  onToggleSecure,
  style,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={[typography.labelSm, styles.label]}>{label}</Text>
      <View style={[styles.field, error && styles.fieldError]}>
        <Ionicons name={icon} size={20} color={colors.muted} style={styles.leadingIcon} />
        <TextInput
          placeholderTextColor={colors.muted}
          style={[typography.bodyMd, styles.input, style]}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
        />
        {secureToggle ? (
          <Pressable
            onPress={onToggleSecure}
            accessibilityRole="button"
            accessibilityLabel={secureVisible ? 'Hide password' : 'Show password'}
            hitSlop={8}
            style={styles.trailingButton}
          >
            <Ionicons
              name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'none',
    letterSpacing: 0,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.touchTargetMin,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  leadingIcon: {
    marginHorizontal: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    paddingVertical: spacing.sm,
    fontFamily: 'Inter_400Regular',
  },
  trailingButton: {
    padding: spacing.xs,
  },
});
