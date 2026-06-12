import { StyleSheet, Text, View, type PressableProps, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { colors } from '../../constants/theme';

interface CallControlButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  label: string;
  variant?: 'default' | 'danger' | 'success';
  active?: boolean;
  children: ReactNode;
  style?: ViewStyle;
}

export function CallControlButton({
  label,
  variant = 'default',
  active = false,
  disabled,
  children,
  style,
  ...props
}: CallControlButtonProps) {
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={[
        styles.base,
        variant === 'danger' && styles.danger,
        variant === 'success' && styles.success,
        variant === 'default' && styles.default,
        active && styles.active,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

export function CallControlButtonLabel({ title }: { title: string }) {
  return <Text style={styles.label}>{title}</Text>;
}

const styles = StyleSheet.create({
  base: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  default: {
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: 'rgba(254, 202, 202, 0.35)',
  },
  success: {
    backgroundColor: colors.success,
    borderColor: 'rgba(187, 247, 208, 0.35)',
  },
  active: {
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
});
