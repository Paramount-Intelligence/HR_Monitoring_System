import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { APP_ENV } from '../../constants/env';
import {
  FEATURE_SET_VERSION,
  getEnabledFeatureLabels,
  getRoleFeatureAccess,
} from '../../constants/features';
import { formatRole } from '../../utils/format';
import { colors, radii, spacing } from '../../constants/theme';

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
      <Text style={styles.title}>Build diagnostics</Text>
      <Text style={styles.hint}>Preview / development only — no secrets shown.</Text>

      <DiagnosticRow label="App version" value={`${appVersion} (${nativeVersion})`} />
      <DiagnosticRow label="Feature set" value={FEATURE_SET_VERSION} />
      <DiagnosticRow label="Build profile" value={buildProfile} />
      <DiagnosticRow label="App env" value={APP_ENV} />
      {buildTime ? <DiagnosticRow label="Build time" value={buildTime} /> : null}
      {easBuildId ? <DiagnosticRow label="EAS build" value={easBuildId.slice(0, 8)} /> : null}

      <DiagnosticRow label="Signed-in role" value={formatRole(access.normalizedRole)} />
      <DiagnosticRow label="Raw role" value={access.role} />
      <DiagnosticRow label="Manage tab" value={access.manageTab ? 'Visible' : 'Hidden'} />
      <DiagnosticRow label="Reports hub" value={access.reportsHub ? 'Enabled' : 'Hidden'} />

      <Text style={styles.subtitle}>Enabled for this account</Text>
      <Text style={styles.features}>
        {enabledFeatures.length > 0 ? enabledFeatures.join(' · ') : 'Core employee features'}
      </Text>
    </View>
  );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
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
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedText,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  features: {
    fontSize: 13,
    color: colors.mutedText,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.md,
  },
  label: {
    color: colors.mutedText,
    fontSize: 13,
    flex: 1,
  },
  value: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1.2,
    textAlign: 'right',
  },
});
