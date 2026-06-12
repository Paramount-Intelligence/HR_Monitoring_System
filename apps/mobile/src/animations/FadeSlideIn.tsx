import type { ReactNode } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { useFadeIn } from './useFadeIn';
import { ANIMATION } from './animation-config';

interface FadeSlideInProps {
  children: ReactNode;
  delay?: number;
  index?: number;
  style?: StyleProp<ViewStyle>;
  translateY?: number;
}

export function FadeSlideIn({
  children,
  delay = 0,
  index = 0,
  style,
  translateY = 10,
}: FadeSlideInProps) {
  const staggerDelay = delay + Math.min(index, ANIMATION.maxStaggerItems) * ANIMATION.staggerStep;
  const { style: animatedStyle } = useFadeIn({
    delay: staggerDelay,
    translateY,
  });

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
