import { StyleSheet, Text, View } from 'react-native';
import { MetricBentoGrid, MetricBentoItem } from '../ui/MetricBentoGrid';
import type { ProjectTaskSummary } from '../../types/project';
import { colors, spacing, typography } from '../../theme';

interface ProjectTaskSummaryProps {
  summary: ProjectTaskSummary;
}

export function ProjectTaskSummaryCard({ summary }: ProjectTaskSummaryProps) {
  const items = [
    { label: 'Total', value: summary.total },
    { label: 'Pending', value: summary.pending },
    { label: 'In progress', value: summary.inProgress },
    { label: 'Completed', value: summary.completed },
    { label: 'Overdue', value: summary.overdue, danger: summary.overdue > 0 },
  ];

  return (
    <MetricBentoGrid>
      {items.map((item) => (
        <MetricBentoItem key={item.label}>
          <View style={styles.cell}>
            <Text style={[typography.caption, styles.label]}>{item.label}</Text>
            <Text
              style={[
                typography.headlineMd,
                styles.value,
                item.danger && styles.danger,
              ]}
            >
              {item.value}
            </Text>
          </View>
        </MetricBentoItem>
      ))}
    </MetricBentoGrid>
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.md,
    minHeight: 72,
    justifyContent: 'center',
  },
  label: {
    color: colors.textSecondary,
    marginBottom: 2,
  },
  value: {
    color: colors.text,
    fontFamily: 'Inter_700Bold',
  },
  danger: {
    color: colors.danger,
  },
});
