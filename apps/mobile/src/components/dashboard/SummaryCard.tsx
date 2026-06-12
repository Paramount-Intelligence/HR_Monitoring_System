import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radii, spacing } from '../../constants/theme';

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
      <Text style={styles.title}>{title}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <Text style={styles.value}>{value}</Text>
      )}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </FadeSlideIn>
  );
}

export function SummaryCardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, styles.skeleton, style]}>
      <View style={[styles.accent, styles.skeletonBlock]} />
      <View style={[styles.skeletonLine, { width: '55%' }]} />
      <View style={[styles.skeletonLine, { width: '70%', marginTop: spacing.sm }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    minHeight: 108,
  },
  accent: {
    height: 4,
    borderRadius: radii.pill,
    marginBottom: spacing.sm,
    width: 40,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedText,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
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
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
});
