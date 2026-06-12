import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { spacing } from '../../constants/theme';

interface ReportMetricGridProps {
  children: ReactNode;
}

export function ReportMetricGrid({ children }: ReportMetricGridProps) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
