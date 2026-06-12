import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';

interface AppSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export function AppSkeleton({
  width = '100%',
  height = 16,
  style,
  borderRadius = radii.sm,
}: AppSkeletonProps) {
  return <View style={[styles.base, { width, height, borderRadius }, style]} />;
}

export function AppSkeletonCard() {
  return (
    <View style={styles.card}>
      <AppSkeleton width="55%" height={20} />
      <AppSkeleton width="35%" height={14} style={styles.gap} />
      <AppSkeleton width="100%" height={12} style={styles.gap} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.border,
    opacity: 0.7,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  gap: {
    marginTop: spacing.sm,
  },
});
