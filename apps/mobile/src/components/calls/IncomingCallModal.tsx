import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CallType } from '../../types/calls';
import { getIncomingCallLabel } from '../../calls/call-utils';
import { colors } from '../../constants/theme';
import { CallModalCard, CallModalOverlay } from './CallModalOverlay';
import { CallParticipantAvatar } from './CallParticipantAvatar';

interface IncomingCallModalProps {
  visible: boolean;
  callerName: string;
  callType: CallType;
  loading?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingCallModal({
  visible,
  callerName,
  callType,
  loading = false,
  onAccept,
  onDecline,
}: IncomingCallModalProps) {
  return (
    <CallModalOverlay visible={visible}>
      <CallModalCard>
        <View style={styles.avatarWrap}>
          <CallParticipantAvatar
            name={callerName}
            size="md"
            ringColor="rgba(52, 211, 153, 0.45)"
            pulse
          />
        </View>

        <Text style={styles.typeLabel}>{getIncomingCallLabel(callType)}</Text>
        <Text style={styles.name}>{callerName}</Text>
        <Text style={styles.subtitle}>is calling you…</Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Decline"
            disabled={loading}
            onPress={onDecline}
            style={({ pressed }) => [styles.action, styles.decline, pressed && styles.pressed]}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="call" size={22} color={colors.white} style={styles.declineIcon} />
                <Text style={styles.actionLabel}>Decline</Text>
              </>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Accept"
            disabled={loading}
            onPress={onAccept}
            style={({ pressed }) => [styles.action, styles.accept, pressed && styles.pressed]}
          >
            <Ionicons name="call" size={22} color={colors.white} />
            <Text style={styles.actionLabel}>Accept</Text>
          </Pressable>
        </View>
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
    color: colors.call.statusConnected,
    marginBottom: 8,
  },
  name: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '800',
    color: colors.call.textOnDark,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: 'rgba(148, 163, 184, 0.95)',
    marginBottom: 28,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  action: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  decline: {
    backgroundColor: colors.call.accentRed,
  },
  accept: {
    backgroundColor: colors.call.accentGreen,
  },
  pressed: {
    opacity: 0.9,
  },
  actionLabel: {
    color: colors.call.textOnDark,
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  declineIcon: {
    transform: [{ rotate: '135deg' }],
  },
});
