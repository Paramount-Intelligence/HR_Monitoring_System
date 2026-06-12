import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION } from '../../animations/animation-config';
import { useReducedMotion } from '../../animations/useReducedMotion';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface AnimatedTabIconProps {
  name: IoniconName;
  focused: boolean;
  color: string;
}

export function AnimatedTabIcon({ name, focused, color }: AnimatedTabIconProps) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(focused ? ANIMATION.tabIconScale : 1)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.spring(scale, {
      toValue: focused ? ANIMATION.tabIconScale : 1,
      useNativeDriver: true,
      speed: 28,
      bounciness: 0,
    }).start();
  }, [focused, reducedMotion, scale]);

  return (
    <Animated.View style={reducedMotion ? undefined : { transform: [{ scale }] }}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}
