import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radius, shadows, spacing } from '../../theme';
import { useReducedMotion } from '../../animations/useReducedMotion';

interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function LoadingSkeleton({
  width = '100%',
  height = 16,
  style,
  borderRadius = radius.md,
}: LoadingSkeletonProps) {
  const reducedMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    if (reducedMotion) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width, height, borderRadius, opacity: reducedMotion ? 0.6 : opacity },
        style,
      ]}
    />
  );
}

export function LoadingSkeletonCard() {
  return (
    <View style={styles.card}>
      <LoadingSkeleton width="55%" height={20} />
      <LoadingSkeleton width="35%" height={14} style={styles.gap} />
      <LoadingSkeleton width="100%" height={12} style={styles.gap} />
    </View>
  );
}

export function LoadingSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <LoadingSkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.gutter,
    ...shadows.card,
  },
  gap: {
    marginTop: spacing.sm,
  },
});
