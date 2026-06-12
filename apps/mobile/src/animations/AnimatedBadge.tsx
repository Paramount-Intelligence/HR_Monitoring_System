import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { ANIMATION, EASING } from './animation-config';
import { colors, radii, spacing } from '../constants/theme';

interface AnimatedBadgeProps {
  count: number;
  style?: ViewStyle;
}

export function AnimatedBadge({ count, style }: AnimatedBadgeProps) {
  const scale = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;
  const opacity = useRef(new Animated.Value(count > 0 ? 1 : 0)).current;

  useEffect(() => {
    if (count <= 0) {
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0,
          duration: ANIMATION.badgeTransition,
          easing: EASING.exit,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: ANIMATION.badgeTransition,
          easing: EASING.exit,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 24,
        bounciness: 4,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: ANIMATION.badgeTransition,
        easing: EASING.entrance,
        useNativeDriver: true,
      }),
    ]).start();
  }, [count, opacity, scale]);

  if (count <= 0) return null;

  return (
    <Animated.View style={[styles.badge, style, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  text: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
