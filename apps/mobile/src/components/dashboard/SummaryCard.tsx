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
        <Text style={[typography.labelSm, styles.title]}>{title.toUpperCase()}</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <Text style={[typography.headlineMd, styles.value]}>{value}</Text>
        )}
        {subtitle ? <Text style={[typography.caption, styles.subtitle]}>{subtitle}</Text> : null}
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
    minHeight: 112,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  title: {
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  value: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    marginTop: spacing.xs,
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
