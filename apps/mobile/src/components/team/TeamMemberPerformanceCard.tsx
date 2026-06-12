import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppBadge } from '../ui/AppBadge';
import { colors, radii, spacing } from '../../constants/theme';
import type { ReportSummary } from '../../types/reports';

interface TeamMemberPerformanceCardProps {
  member: ReportSummary;
  onPress?: () => void;
}

export function TeamMemberPerformanceCard({ member, onPress }: TeamMemberPerformanceCardProps) {
  const exceptions = member.late_logins + member.early_logouts;
  const content = (
    <>
      <View style={styles.header}>
        <Text style={styles.name}>{member.user_name}</Text>
        {exceptions > 0 ? <AppBadge label={`${exceptions} exceptions`} variant="warning" /> : null}
      </View>
      <View style={styles.metrics}>
        <Metric label="Hours" value={`${member.total_hours.toFixed(1)}h`} />
        <Metric label="Late" value={String(member.late_logins)} />
        <Metric label="Early" value={String(member.early_logouts)} />
        <Metric label="WFH" value={String(member.wfh_days)} />
        <Metric label="Absent" value={String(member.absences)} />
      </View>
    </>
  );

  if (!onPress) return <View style={styles.card}>{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    minWidth: 56,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.mutedText,
    marginTop: 2,
  },
});
