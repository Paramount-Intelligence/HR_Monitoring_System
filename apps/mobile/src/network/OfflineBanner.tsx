import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ANIMATION, EASING } from '../animations/animation-config';
import { useReducedMotion } from '../animations/useReducedMotion';
import { colors, spacing } from '../constants/theme';
import { useNetworkStore } from './network-store';

const BANNER_COPY = {
  offline: {
    icon: 'cloud-offline-outline' as const,
    text: "You're offline. Some actions will sync when connection returns.",
    bg: colors.primaryDark,
  },
  weak: {
    icon: 'cellular-outline' as const,
    text: 'Weak connection. Some updates may take longer.',
    bg: colors.warningText,
  },
  reconnected: {
    icon: 'cloud-done-outline' as const,
    text: 'Back online. Syncing latest updates…',
    bg: colors.success,
  },
};

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const bannerMode = useNetworkStore((s) => s.bannerMode);
  const reducedMotion = useReducedMotion();
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const visible = bannerMode !== 'hidden';
  const config = visible ? BANNER_COPY[bannerMode as keyof typeof BANNER_COPY] : null;

  useEffect(() => {
    if (reducedMotion) return;

    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: ANIMATION.bannerSlide,
          easing: EASING.entrance,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: ANIMATION.bannerSlide,
          easing: EASING.entrance,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -80,
        duration: ANIMATION.bannerSlide,
        easing: EASING.exit,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: ANIMATION.bannerSlide,
        easing: EASING.exit,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, reducedMotion, translateY, visible]);

  if (!visible || !config) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: config.bg,
          paddingTop: Math.max(insets.top, spacing.xs),
          opacity: reducedMotion ? 1 : opacity,
          transform: reducedMotion ? undefined : [{ translateY }],
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons name={config.icon} size={16} color={colors.white} />
      <Text style={styles.text}>{config.text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});
