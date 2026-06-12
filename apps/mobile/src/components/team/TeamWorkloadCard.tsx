import { StyleSheet, Text, View } from 'react-native';
import { SimpleBarChart } from '../reports/SimpleBarChart';
import { colors, spacing } from '../../constants/theme';
import type { AnalyticsWorkload } from '../../types/reports';

interface TeamWorkloadCardProps {
  items: AnalyticsWorkload[];
}

export function TeamWorkloadCard({ items }: TeamWorkloadCardProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Team Workload</Text>
      <SimpleBarChart
        title="Active tasks by member"
        items={items.slice(0, 8).map((item) => ({
          label: item.full_name.split(' ')[0] ?? item.full_name,
          value: item.active_tasks,
          color: item.overloaded ? colors.danger : colors.primary,
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
