import { StyleSheet, Text, View } from 'react-native';
import type { CallStatus } from '../../types/calls';
import { getCallStatusLabel } from '../../calls/call-utils';
import { colors } from '../../constants/theme';

interface CallStatusBadgeProps {
  status: CallStatus;
  durationSec: number;
  phase?: string;
}

const toneColors: Record<string, { bg: string; text: string }> = {
  connected: { bg: 'rgba(16, 185, 129, 0.18)', text: colors.call.statusConnected },
  warning: { bg: 'rgba(245, 158, 11, 0.18)', text: colors.call.statusWarning },
  danger: { bg: 'rgba(239, 68, 68, 0.18)', text: colors.call.statusDanger },
  neutral: { bg: 'rgba(148, 163, 184, 0.18)', text: 'rgba(203, 213, 225, 1)' },
};

function getTone(status: CallStatus): keyof typeof toneColors {
  if (status === 'connected') return 'connected';
  if (status === 'failed' || status === 'declined') return 'danger';
  if (status === 'calling' || status === 'connecting' || status === 'ringing' || status === 'reconnecting') {
    return 'warning';
  }
  return 'neutral';
}

export function CallStatusBadge({ status, durationSec, phase }: CallStatusBadgeProps) {
  const tone = getTone(status);
  const palette = toneColors[tone];
  const label = getCallStatusLabel(status, durationSec, phase);

  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
