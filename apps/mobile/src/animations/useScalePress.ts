import { useRef } from 'react';
import { Animated } from 'react-native';
import { ANIMATION } from './animation-config';
import { useReducedMotion } from './useReducedMotion';

export function useScalePress(disabled = false) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (value: number) => {
    if (disabled || reducedMotion) return;
    Animated.timing(scale, {
      toValue: value,
      duration: ANIMATION.pressDuration,
      useNativeDriver: true,
    }).start();
  };

  return {
    scaleStyle: reducedMotion ? undefined : { transform: [{ scale }] },
    onPressIn: () => animateTo(ANIMATION.pressScale),
    onPressOut: () => animateTo(1),
  };
}
