import { StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../animations/AnimatedPressable';
import { colors, layout, radii } from '../../constants/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface AppIconButtonProps extends Omit<PressableProps, 'children'> {
  icon: IoniconName;
  accessibilityLabel: string;
  size?: number;
  color?: string;
  variant?: 'default' | 'dark' | 'danger';
}

export function AppIconButton({
  icon,
  accessibilityLabel,
  size = 22,
  color,
  variant = 'default',
  disabled,
  style,
  ...props
}: AppIconButtonProps) {
  const iconColor =
    color ??
    (variant === 'dark'
      ? colors.white
      : variant === 'danger'
        ? colors.danger
        : colors.primary);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={8}
      style={[
        styles.base,
        variant === 'dark' && styles.dark,
        variant === 'danger' && styles.danger,
        disabled && styles.disabled,
        typeof style === 'function' ? undefined : (style as StyleProp<ViewStyle>),
      ]}
      {...props}
    >
      <Ionicons name={icon} size={size} color={iconColor} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minWidth: layout.touchTargetMin,
    minHeight: layout.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  dark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  danger: {
    backgroundColor: colors.errorSurface,
  },
  disabled: {
    opacity: 0.45,
  },
});
