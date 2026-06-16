import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from '../ui/AppButton';
import { StatusBadge } from '../ui/StatusBadge';
import { isExpoGo, type PushPermissionStatus } from '../../notifications/notification-permissions';
import { colors, radius, shadows, spacing, typography } from '../../theme';

interface NotificationSettingsCardProps {
  permissionStatus: PushPermissionStatus;
  isRegistered: boolean;
  loading?: boolean;
  onEnable: () => void;
  onDisable?: () => void;
}

function statusVariant(
  status: PushPermissionStatus,
  isRegistered: boolean
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (isExpoGo || status === 'unavailable') return 'neutral';
  if (status === 'granted' && isRegistered) return 'success';
  if (status === 'granted') return 'warning';
  if (status === 'denied') return 'danger';
  return 'neutral';
}

function statusLabel(status: PushPermissionStatus, isRegistered: boolean): string {
  if (isExpoGo) return 'Not available in Expo Go';
  if (status === 'granted' && isRegistered) return 'Enabled';
  if (status === 'granted') return 'Permission granted — finishing setup';
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
    <View style={styles.card}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={[typography.titleMd, styles.title]}>Push notifications</Text>
            <StatusBadge
              label={label}
              variant={statusVariant(permissionStatus, isRegistered)}
            />
          </View>
        </View>
        <Text style={[typography.bodySm, styles.body]}>
          Receive alerts for new messages and important workforce updates when the app is in the
          background.
        </Text>
        {canEnable ? (
          <AppButton
            title={loading ? 'Setting up…' : 'Enable notifications'}
            onPress={onEnable}
            disabled={loading}
            variant="secondary"
            style={styles.action}
          />
        ) : null}
        {canDisable ? (
          <AppButton
            title="Disable on this device"
            onPress={onDisable}
            disabled={loading}
            variant="ghost"
          />
        ) : null}
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
    backgroundColor: colors.success,
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
    gap: spacing.xs,
  },
  title: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  body: {
    color: colors.textSecondary,
    lineHeight: 20,
  },
  action: {
    marginTop: spacing.xs,
  },
});
