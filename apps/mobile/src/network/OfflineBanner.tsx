import { useEffect, useRef, useState } from 'react';

import { Animated, StyleSheet, Text } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';

import { ANIMATION, EASING } from '../animations/animation-config';

import { useReducedMotion } from '../animations/useReducedMotion';

import { colors, spacing } from '../theme';

import { useNetworkStore } from './network-store';



const BANNER_COPY = {

  offline: {

    icon: 'cloud-offline-outline' as const,

    text: "You're offline. Some actions will sync when connection returns.",

    bg: colors.onPrimaryFixed,

  },

  weak: {

    icon: 'cellular-outline' as const,

    text: 'Weak connection. Some updates may take longer.',

    bg: colors.warning,

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

  const visible = bannerMode !== 'hidden';

  const config = visible ? BANNER_COPY[bannerMode as keyof typeof BANNER_COPY] : null;



  const [mounted, setMounted] = useState(visible);

  const translateY = useRef(new Animated.Value(visible ? 0 : -80)).current;

  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;



  useEffect(() => {

    if (visible) {

      setMounted(true);

      if (reducedMotion) {

        translateY.setValue(0);

        opacity.setValue(1);

        return;

      }

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



    if (!mounted) return;



    if (reducedMotion) {

      setMounted(false);

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

    ]).start(({ finished }) => {

      if (finished) setMounted(false);

    });

  }, [mounted, opacity, reducedMotion, translateY, visible]);



  if (!mounted || !config) return null;



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

      pointerEvents="box-none"

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


