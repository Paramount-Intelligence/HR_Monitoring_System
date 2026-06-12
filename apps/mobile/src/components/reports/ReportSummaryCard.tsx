import { StyleSheet, Text, View } from 'react-native';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { colors, radii, spacing } from '../../constants/theme';

interface ReportSummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accentColor?: string;
  index?: number;
}

export function ReportSummaryCard({
  title,
  value,
  subtitle,
  accentColor = colors.primary,
  index = 0,
}: ReportSummaryCardProps) {
  return (
    <FadeSlideIn index={index} style={styles.card} translateY={8}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </FadeSlideIn>
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
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
  },
  value: {
    marginTop: spacing.xs,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.mutedText,
  },
});
