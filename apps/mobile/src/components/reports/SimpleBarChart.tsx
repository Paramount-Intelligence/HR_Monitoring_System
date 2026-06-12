import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing } from '../../constants/theme';

export interface SimpleBarChartItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  title: string;
  items: SimpleBarChartItem[];
}

export function SimpleBarChart({ title, items }: SimpleBarChartProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.length === 0 ? (
        <Text style={styles.empty}>No data for this period.</Text>
      ) : (
        items.map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>
              {item.label}
            </Text>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max((item.value / max) * 100, 4)}%`,
                    backgroundColor: item.color ?? colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))
      )}
    </View>
  );
}

export function AttendanceTrendChart({
  title,
  items,
}: {
  title: string;
  items: { date: string; present: number; wfh?: number; late?: number }[];
}) {
  const chartItems: SimpleBarChartItem[] = items.slice(-7).map((item) => ({
    label: item.date.slice(5),
    value: item.present,
    color: colors.success,
  }));
  return <SimpleBarChart title={title} items={chartItems} />;
}

export function LeaveBreakdownChart({
  sick,
  casual,
  annual,
  wfh,
}: {
  sick: number;
  casual: number;
  annual: number;
  wfh: number;
}) {
  return (
    <SimpleBarChart
      title="Leave & WFH Breakdown"
      items={[
        { label: 'Sick', value: sick, color: colors.danger },
        { label: 'Casual', value: casual, color: colors.warning },
        { label: 'Annual', value: annual, color: colors.info },
        { label: 'WFH', value: wfh, color: colors.primary },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  empty: {
    fontSize: 14,
    color: colors.mutedText,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  label: {
    width: 52,
    fontSize: 12,
    color: colors.mutedText,
    fontWeight: '600',
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
  value: {
    width: 28,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
});
