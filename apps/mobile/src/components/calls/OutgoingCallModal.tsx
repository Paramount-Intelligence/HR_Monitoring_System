import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CallStatus, CallType } from '../../types/calls';
import { getCallStatusLabel, getOutgoingCallTypeLabel } from '../../calls/call-utils';
import { colors } from '../../theme';
import { CallModalCard, CallModalOverlay } from './CallModalOverlay';
import { CallParticipantAvatar } from './CallParticipantAvatar';

interface OutgoingCallModalProps {
  visible: boolean;
  participantName: string;
  callType: CallType;
  connectionStatus: CallStatus;
  statusMessage?: string | null;
  loading?: boolean;
  onCancel: () => void;
}

export function OutgoingCallModal({
  visible,
  participantName,
  callType,
  connectionStatus,
  statusMessage,
  loading = false,
  onCancel,
}: OutgoingCallModalProps) {
  const statusLabel =
    statusMessage ?? getCallStatusLabel(connectionStatus, 0, connectionStatus === 'ended' ? 'ended' : undefined);

  return (
    <CallModalOverlay visible={visible}>
      <CallModalCard>
        <View style={styles.avatarWrap}>
          <CallParticipantAvatar
            name={participantName}
            size="md"
            ringColor="rgba(0, 55, 176, 0.55)"
            pulse={connectionStatus === 'calling' || connectionStatus === 'ringing'}
          />
        </View>

        <Text style={styles.typeLabel}>
          {statusMessage ? statusLabel : connectionStatus === 'calling' ? 'Calling…' : statusLabel}
        </Text>
        <Text style={styles.name}>{participantName}</Text>
        {!statusMessage ? (
          <Text style={styles.subtitle}>{getOutgoingCallTypeLabel(callType)}</Text>
        ) : null}

        {!statusMessage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel Call"
            disabled={loading}
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="call" size={22} color={colors.white} style={styles.cancelIcon} />
                <Text style={styles.cancelLabel}>Cancel Call</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </CallModalCard>
    </CallModalOverlay>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  typeLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 8,
  },
  name: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 28,
  },
  cancel: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pressed: {
    opacity: 0.9,
  },
  cancelLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cancelIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
