import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { useScalePress } from './useScalePress';

interface AnimatedPressableProps extends PressableProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export function AnimatedPressable({
  disabled,
  style,
  containerStyle,
  onPressIn,
  onPressOut,
  children,
  ...props
}: AnimatedPressableProps) {
  const { scaleStyle, onPressIn: scaleIn, onPressOut: scaleOut } = useScalePress(Boolean(disabled));

  return (
    <Animated.View style={[scaleStyle, containerStyle]}>
      <Pressable
        {...props}
        disabled={disabled}
        style={(state) => {
          const resolvedStyle: StyleProp<ViewStyle> =
            typeof style === 'function' ? style(state) : style;
          return resolvedStyle;
        }}
        onPressIn={(event) => {
          scaleIn();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scaleOut();
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
