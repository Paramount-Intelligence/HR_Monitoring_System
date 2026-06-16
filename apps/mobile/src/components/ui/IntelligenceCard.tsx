import { ReactNode } from 'react';

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedPressable } from '../../animations/AnimatedPressable';

import { FadeSlideIn } from '../../animations/FadeSlideIn';

import { colors, radius, shadows, spacing, typography } from '../../theme';



interface IntelligenceCardProps {

  title?: string;

  subtitle?: string;

  accentColor?: string;

  children?: ReactNode;

  icon?: ReactNode;

  rightAction?: ReactNode;

  onPress?: () => void;

  style?: StyleProp<ViewStyle>;

  footer?: ReactNode;

  /** Stagger index for dashboard entrance animation */

  index?: number;

}



export function IntelligenceCard({

  title,

  subtitle,

  accentColor = colors.primary,

  children,

  icon,

  rightAction,

  onPress,

  style,

  footer,

  index,

}: IntelligenceCardProps) {

  const content = (

    <View style={[styles.card, style]}>

      <View style={[styles.accent, { backgroundColor: accentColor }]} />

      <View style={styles.inner}>

        {(title || subtitle || icon || rightAction) && (

          <View style={styles.headerRow}>

            <View style={styles.headerText}>

              {icon ? <View style={styles.iconWrap}>{icon}</View> : null}

              <View style={styles.headerCopy}>

                {title ? (

                  <Text style={[typography.titleMd, styles.title]} numberOfLines={2}>

                    {title}

                  </Text>

                ) : null}

                {subtitle ? (

                  <Text style={[typography.caption, styles.subtitle]} numberOfLines={2}>

                    {subtitle}

                  </Text>

                ) : null}

              </View>

            </View>

            {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}

          </View>

        )}

        {children}

        {footer}

      </View>

    </View>

  );



  const interactive = onPress ? (

    <AnimatedPressable

      onPress={onPress}

      accessibilityRole="button"

      style={styles.pressable}

    >

      {content}

    </AnimatedPressable>

  ) : (

    content

  );



  if (index != null) {

    return (

      <FadeSlideIn index={index} translateY={10} style={styles.animatedWrap}>

        {interactive}

      </FadeSlideIn>

    );

  }



  return interactive;

}



const styles = StyleSheet.create({

  animatedWrap: {

    marginBottom: spacing.md,

  },

  pressable: {

    marginBottom: spacing.md,

  },

  card: {

    backgroundColor: colors.card,

    borderRadius: radius.lg,

    overflow: 'hidden',

    flexDirection: 'row',

    ...shadows.card,

  },

  accent: {

    width: 4,

  },

  inner: {

    flex: 1,

    padding: spacing.lg,

    minWidth: 0,

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    gap: spacing.sm,

    marginBottom: spacing.sm,

  },

  headerText: {

    flex: 1,

    flexDirection: 'row',

    alignItems: 'flex-start',

    gap: spacing.sm,

    minWidth: 0,

  },

  headerCopy: {

    flex: 1,

    minWidth: 0,

  },

  iconWrap: {

    marginTop: 2,

  },

  rightAction: {

    flexShrink: 0,

  },

  title: {

    color: colors.text,

    fontFamily: 'Inter_600SemiBold',

  },

  subtitle: {

    color: colors.textSecondary,

    marginTop: 2,

  },

});


