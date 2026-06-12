import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { ANIMATION, EASING } from './animation-config';
import { useReducedMotion } from './useReducedMotion';

interface UseSlideInOptions {
  distance?: number;
  delay?: number;
  duration?: number;
  fromTop?: boolean;
}

export function useSlideIn({
  distance = 16,
  delay = 0,
  duration = ANIMATION.modalEntrance,
  fromTop = false,
}: UseSlideInOptions = {}) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(
    new Animated.Value(reducedMotion ? 0 : fromTop ? -distance : distance)
  ).current;

  useEffect(() => {
    if (reducedMotion) return;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: EASING.entrance,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: EASING.entrance,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, duration, opacity, reducedMotion, translateY]);

  return {
    style: {
      opacity,
      transform: [{ translateY }],
    },
  };
}
