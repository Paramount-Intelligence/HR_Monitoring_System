import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ANIMATION, EASING } from './animation-config';
import { useReducedMotion } from './useReducedMotion';

interface UseFadeInOptions {
  delay?: number;
  duration?: number;
  translateY?: number;
  autoStart?: boolean;
}

export function useFadeIn({
  delay = 0,
  duration = ANIMATION.cardEntrance,
  translateY = 10,
  autoStart = true,
}: UseFadeInOptions = {}) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const offsetY = useRef(new Animated.Value(reducedMotion ? 0 : translateY)).current;

  useEffect(() => {
    if (!autoStart || reducedMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASING.entrance,
        useNativeDriver: true,
      }),
      Animated.timing(offsetY, {
        toValue: 0,
        duration,
        delay,
        easing: EASING.entrance,
        useNativeDriver: true,
      }),
    ]).start();
  }, [autoStart, delay, duration, offsetY, opacity, reducedMotion, translateY]);

  return {
    style: {
      opacity,
      transform: [{ translateY: offsetY }],
    },
  };
}
