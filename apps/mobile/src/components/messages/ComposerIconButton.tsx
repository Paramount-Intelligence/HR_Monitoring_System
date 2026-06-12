import { Pressable, StyleSheet, type PressableProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { colors, radii } from '../../constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface ComposerIconButtonProps extends Omit<PressableProps, 'children'> {
  icon: IoniconName;
  label: string;
  active?: boolean;
}

export function ComposerIconButton({
  icon,
  label,
  disabled,
  active = false,
  style,
  ...props
}: ComposerIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={(state) => [
        styles.button,
        active && styles.active,
        disabled && styles.disabled,
        state.pressed && !disabled && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <Ionicons
        name={icon}
        size={18}
        color={disabled ? colors.mutedText : active ? colors.primary : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: {
    backgroundColor: colors.overlay,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    backgroundColor: colors.overlay,
  },
});
