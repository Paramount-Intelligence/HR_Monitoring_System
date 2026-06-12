import { StyleSheet, Text, View } from 'react-native';
import { ReportSummaryCard } from '../reports/ReportSummaryCard';
import { ReportMetricGrid } from '../reports/ReportMetricGrid';
import { colors, spacing } from '../../constants/theme';

interface TeamSummaryCardProps {
  totalMembers: number;
  checkedIn: number;
  onLeave: number;
  wfhToday: number;
  lateToday: number;
}

export function TeamSummaryCard({
  totalMembers,
  checkedIn,
  onLeave,
  wfhToday,
  lateToday,
}: TeamSummaryCardProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Team Summary</Text>
      <ReportMetricGrid>
        <ReportSummaryCard title="Members" value={totalMembers} accentColor={colors.primary} />
        <ReportSummaryCard title="Present" value={checkedIn} accentColor={colors.success} />
        <ReportSummaryCard title="On Leave" value={onLeave} accentColor={colors.danger} />
        <ReportSummaryCard title="WFH" value={wfhToday} accentColor={colors.info} />
        <ReportSummaryCard title="Late Today" value={lateToday} accentColor={colors.warning} />
      </ReportMetricGrid>
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
