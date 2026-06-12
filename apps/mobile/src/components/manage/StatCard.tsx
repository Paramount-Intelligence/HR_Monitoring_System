import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  accentColor?: string;
}

export function StatCard({ label, value, accentColor = colors.primary }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function StatCardSkeleton() {
  return (
    <View style={[styles.card, styles.skeleton]}>
      <View style={styles.skeletonLineLarge} />
      <View style={styles.skeletonLineSmall} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
  },
  label: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.mutedText,
    fontWeight: '600',
  },
  skeleton: {
    gap: spacing.sm,
  },
  skeletonLineLarge: {
    width: '50%',
    height: 24,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
  skeletonLineSmall: {
    width: '70%',
    height: 14,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
  },
});
