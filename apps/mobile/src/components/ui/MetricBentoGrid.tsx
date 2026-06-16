import { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { spacing } from '../../theme';

interface MetricBentoGridProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Two-column mobile metric grid with Stitch 12px gutter. */
export function MetricBentoGrid({ children, style }: MetricBentoGridProps) {
  return <View style={[styles.grid, style]}>{children}</View>;
}

interface MetricBentoItemProps {
  children: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function MetricBentoItem({ children, fullWidth = false, style }: MetricBentoItemProps) {
  return (
    <View style={[styles.item, fullWidth && styles.fullWidth, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.gutter / 2,
  },
  item: {
    width: '50%',
    paddingHorizontal: spacing.gutter / 2,
    marginBottom: spacing.gutter,
  },
  fullWidth: {
    width: '100%',
  },
});
