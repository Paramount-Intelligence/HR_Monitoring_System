import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FadeSlideIn } from '../../animations/FadeSlideIn';
import { MetricBentoGrid, MetricBentoItem } from '../ui/MetricBentoGrid';
import { colors, spacing, typography } from '../../theme';

export function formatMetric(value: unknown, fallback = '—'): string {
  if (value == null) return fallback;
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'string' && value.trim()) return value.trim();
  return fallback;
}

export function DashboardSection({
  title,
  subtitle,
  children,
  index,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  index?: number;
}) {
  const section = (
    <View style={styles.section}>
      <Text style={[typography.titleMd, styles.sectionTitle]}>{title}</Text>
      {subtitle ? (
        <Text style={[typography.caption, styles.sectionSubtitle]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );

  if (index != null) {
    return (
      <FadeSlideIn index={index} translateY={10}>
        {section}
      </FadeSlideIn>
    );
  }

  return section;
}

export function DashboardMetricGrid({ children }: { children: ReactNode }) {
  return <MetricBentoGrid>{children}</MetricBentoGrid>;
}

export function DashboardMetricItem({
  children,
  fullWidth,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return <MetricBentoItem fullWidth={fullWidth}>{children}</MetricBentoItem>;
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
});
