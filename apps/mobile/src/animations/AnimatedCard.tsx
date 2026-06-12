import type { ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useFadeIn } from './useFadeIn';
import { ANIMATION } from './animation-config';
import { AnimatedPressable } from './AnimatedPressable';

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AnimatedCard({
  children,
  index = 0,
  onPress,
  disabled = false,
  style,
}: AnimatedCardProps) {
  const delay = Math.min(index, ANIMATION.maxStaggerItems) * ANIMATION.staggerStep;
  const { style: entranceStyle } = useFadeIn({ delay, translateY: 12 });

  if (onPress) {
    return (
      <Animated.View style={entranceStyle}>
        <AnimatedPressable
          accessibilityRole="button"
          disabled={disabled}
          onPress={onPress}
          style={style}
        >
          {children}
        </AnimatedPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[entranceStyle, style]}>
      {children}
    </Animated.View>
  );
}
