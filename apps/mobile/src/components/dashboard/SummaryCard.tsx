import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  loading?: boolean;
  style?: ViewStyle;
  index?: number;
}

export function SummaryCard({
  title,
  value,
  subtitle,
  accentColor = colors.primary,
  loading = false,
  style,
  index = 0,
}: SummaryCardProps) {
  return (
    <FadeSlideIn index={index} style={[styles.card, style]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <Text style={[typography.labelSm, styles.title]} numberOfLines={2} ellipsizeMode="tail">
          {title.toUpperCase()}
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <Text style={[typography.headlineMd, styles.value]} numberOfLines={2} ellipsizeMode="tail">
            {value}
          </Text>
        )}
        {subtitle ? (
          <Text style={[typography.caption, styles.subtitle]} numberOfLines={2} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </FadeSlideIn>
  );
}

export function SummaryCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, styles.skeleton, style]}>
      <View style={[styles.accent, styles.skeletonBlock]} />
      <View style={styles.content}>
        <View style={[styles.skeletonLine, { width: '55%' }]} />
        <View style={[styles.skeletonLine, { width: '40%', marginTop: spacing.sm }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    minHeight: 112,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.card,
  },
  accent: {
    width: 4,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
  },
  value: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.xs,
    flexShrink: 1,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
    flexShrink: 1,
  },
  loader: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  skeleton: {
    opacity: 0.7,
  },
  skeletonBlock: {
    backgroundColor: colors.border,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
});
