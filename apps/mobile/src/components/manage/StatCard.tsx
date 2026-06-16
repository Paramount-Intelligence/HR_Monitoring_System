import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: string;
}

export function StatCard({ label, value, accentColor = colors.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View style={styles.inner}>
        <Text style={[typography.headlineMd, styles.value, { color: accentColor }]}>{value}</Text>
        <Text style={[typography.bodySm, styles.label]}>{label}</Text>
      </View>
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: colors.border }]} />
      <View style={[styles.inner, styles.skeleton]}>
        <View style={styles.skeletonLineLarge} />
        <View style={styles.skeletonLineSmall} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
  },
  value: {
    fontFamily: 'Inter_700Bold',
  },
  label: {
    marginTop: spacing.xs,
    color: colors.textSecondary,
    fontFamily: 'Inter_600SemiBold',
  },
  skeleton: {
    gap: spacing.sm,
  },
  skeletonLineLarge: {
    width: '50%',
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
  skeletonLineSmall: {
    width: '70%',
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.border,
  },
});
