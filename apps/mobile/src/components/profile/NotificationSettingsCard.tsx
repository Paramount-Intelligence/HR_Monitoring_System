import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../ui/AppButton';
import { AppCard } from '../ui/AppCard';
import { isExpoGo, type PushPermissionStatus } from '../../notifications/notification-permissions';
import { colors, spacing } from '../../constants/theme';

interface NotificationSettingsCardProps {
  permissionStatus: PushPermissionStatus;
  isRegistered: boolean;
  loading?: boolean;
  onEnable: () => void;
  onDisable?: () => void;
}

function statusLabel(status: PushPermissionStatus, isRegistered: boolean): string {
  if (isExpoGo) return 'Not available in Expo Go';
  if (status === 'granted' && isRegistered) return 'Enabled';
  if (status === 'granted') return 'Permission granted — finishing setup…';
  if (status === 'denied') return 'Disabled';
  if (status === 'unavailable') return 'Unavailable on this device';
  return 'Not enabled';
}

export function NotificationSettingsCard({
  permissionStatus,
  isRegistered,
  loading = false,
  onEnable,
  onDisable,
}: NotificationSettingsCardProps) {
  const label = statusLabel(permissionStatus, isRegistered);
  const canEnable = !isExpoGo && permissionStatus !== 'granted';
  const canDisable = !isExpoGo && isRegistered && onDisable;

  return (
    <AppCard style={styles.card}>
      <Text style={styles.title}>Push Notifications</Text>
      <Text style={styles.status}>{label}</Text>
      <Text style={styles.body}>
        Receive alerts for new messages and important updates when the app is in the
        background.
      </Text>
      {canEnable ? (
        <AppButton
          title={loading ? 'Setting up…' : 'Enable Notifications'}
          onPress={onEnable}
          disabled={loading}
          variant="secondary"
        />
      ) : null}
      {canDisable ? (
        <AppButton
          title="Disable on This Device"
          onPress={onDisable}
          disabled={loading}
          variant="ghost"
        />
      ) : null}
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  status: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.mutedText,
    marginBottom: spacing.xs,
  },
});
