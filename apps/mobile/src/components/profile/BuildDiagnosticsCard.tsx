import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { APP_ENV } from '../../constants/env';
import {
  FEATURE_SET_VERSION,
  getEnabledFeatureLabels,
  getRoleFeatureAccess,
} from '../../constants/features';
import { formatRole } from '../../utils/format';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface BuildDiagnosticsCardProps {
  userRole?: string | null;
}

function readExtra(key: string): string | undefined {
  const value = Constants.expoConfig?.extra?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function BuildDiagnosticsCard({ userRole }: BuildDiagnosticsCardProps) {
  const access = getRoleFeatureAccess(userRole);
  const enabledFeatures = getEnabledFeatureLabels(userRole);
  const appVersion = Constants.expoConfig?.version ?? '—';
  const nativeVersion = Constants.nativeAppVersion ?? '—';
  const buildProfile = readExtra('buildProfile') ?? 'unknown';
  const buildTime = readExtra('buildTime');
  const easBuildId = readExtra('easBuildId');

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: colors.muted }]} />
      <View style={styles.inner}>
        <Text style={[typography.titleMd, styles.title]}>Build diagnostics</Text>
        <Text style={[typography.caption, styles.hint]}>
          Preview / development only — no secrets shown.
        </Text>

        <DiagnosticRow label="App version" value={`${appVersion} (${nativeVersion})`} />
        <DiagnosticRow label="Feature set" value={FEATURE_SET_VERSION} />
        <DiagnosticRow label="Build profile" value={buildProfile} />
        <DiagnosticRow label="App env" value={APP_ENV} />
        {buildTime ? <DiagnosticRow label="Build time" value={buildTime} /> : null}
        {easBuildId ? <DiagnosticRow label="EAS build" value={easBuildId.slice(0, 8)} /> : null}

        <DiagnosticRow label="Signed-in role" value={formatRole(access.normalizedRole)} />
        <DiagnosticRow label="Manage hub" value={access.manageTab ? 'Accessible' : 'Hidden'} />
        <DiagnosticRow label="Reports hub" value={access.reportsHub ? 'Enabled' : 'Hidden'} />

        <Text style={[typography.labelSm, styles.subtitle]}>Enabled for this account</Text>
        <Text style={[typography.bodySm, styles.features]}>
          {enabledFeatures.length > 0 ? enabledFeatures.join(' · ') : 'Core employee features'}
        </Text>
      </View>
    </View>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[typography.bodySm, styles.label]}>{label}</Text>
      <Text style={[typography.bodySm, styles.value]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    overflow: 'hidden',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  accent: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  hint: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  features: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    flex: 1.2,
    textAlign: 'right',
  },
});
