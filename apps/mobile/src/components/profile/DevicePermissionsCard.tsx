import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../ui/AppButton';
import { StatusBadge } from '../ui/StatusBadge';
import {
  getDevicePermissionRows,
  openAppSettings,
  permissionStatusLabel,
  permissionStatusVariant,
  requestDevicePermission,
  type DevicePermissionRow,
} from '../../permissions/device-permissions';
import { colors, radius, shadows, spacing, typography } from '../../theme';

export function DevicePermissionsCard() {
  const [rows, setRows] = useState<DevicePermissionRow[]>([]);
  const [loadingKind, setLoadingKind] = useState<string | null>(null);

  const refresh = useCallback(() => {
    void getDevicePermissionRows().then(setRows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleRetry = (row: DevicePermissionRow) => {
    setLoadingKind(row.kind);
    void requestDevicePermission(row.kind).finally(() => {
      setLoadingKind(null);
      refresh();
    });
  };

  return (
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[typography.titleMd, styles.title]}>Device permissions</Text>
            <Text style={[typography.bodySm, styles.subtitle]}>
              Readiness for calls, alerts, and profile photo upload.
            </Text>
          </View>
        </View>

        {rows.map((row) => (
          <View key={row.kind} style={styles.row}>
            <Text style={styles.rowLabel}>{row.label}</Text>
            <StatusBadge
              label={permissionStatusLabel(row.status)}
              variant={permissionStatusVariant(row.status)}
            />
            {row.canRequest && row.status !== 'granted' ? (
              <AppButton
                title={loadingKind === row.kind ? 'Checking…' : 'Retry'}
                variant="ghost"
                disabled={loadingKind !== null}
                onPress={() => handleRetry(row)}
                style={styles.retry}
              />
            ) : null}
          </View>
        ))}

        <AppButton
          title="Open Settings"
          variant="secondary"
          onPress={openAppSettings}
          style={styles.settings}
        />
      </View>
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
    backgroundColor: colors.primary,
  },
  inner: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  subtitle: {
    color: colors.textSecondary,
    lineHeight: 18,
  },
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
  },
  rowLabel: {
    ...typography.bodySm,
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: -4,
  },
  settings: {
    marginTop: spacing.xs,
  },
});
