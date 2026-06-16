import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

interface UsePulseRingOptions {
  enabled?: boolean;
  minScale?: number;
  maxScale?: number;
  duration?: number;
}

/** Subtle repeating ring pulse for incoming calls. */
export function usePulseRing({
  enabled = true,
  minScale = 1.05,
  maxScale = 1.18,
  duration = 900,
}: UsePulseRingOptions = {}) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(minScale)).current;
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!enabled || reducedMotion) {
      scale.setValue(minScale);
      opacity.setValue(0.45);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: maxScale,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.12,
            duration,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: minScale,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.5,
            duration,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loop.start();
    return () => {
      loop.stop();
    };
  }, [duration, enabled, maxScale, minScale, opacity, reducedMotion, scale]);

  return {
    style: reducedMotion
      ? undefined
      : {
          opacity,
          transform: [{ scale }],
        },
  };
}
