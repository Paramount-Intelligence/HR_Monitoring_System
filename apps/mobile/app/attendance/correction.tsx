import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandHeader } from '../../src/components/brand/BrandHeader';
import { Screen } from '../../src/components/ui/Screen';
import { AppButton } from '../../src/components/ui/AppButton';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { getAttendanceHistory, requestAttendanceCorrection } from '../../src/api/attendance.api';
import { getErrorMessage } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import type { AttendanceSession } from '../../src/types/attendance';
import {
  canRequestCorrection,
  formatShiftWindow,
  getCorrectionStatusLabel,
} from '../../src/utils/attendance-formatters';
import { formatDate, formatTime } from '../../src/utils/format';
import { useNetworkStore } from '../../src/network/network-store';
import { colors, radius, spacing, typography } from '../../src/theme';

function combineDateAndTime(dateIso: string, timeText: string): string | undefined {
  const trimmed = timeText.trim();
  if (!trimmed) return undefined;
  const base = new Date(dateIso);
  if (Number.isNaN(base.getTime())) return undefined;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return undefined;
  const combined = new Date(base);
  combined.setHours(hours, minutes, 0, 0);
  return combined.toISOString();
}

export default function AttendanceCorrectionScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const isOffline = useNetworkStore((s) => s.isOffline);

  const [reason, setReason] = useState('');
  const [requestedCheckIn, setRequestedCheckIn] = useState('');
  const [requestedCheckOut, setRequestedCheckOut] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const historyQuery = useQuery({
    queryKey: queryKeys.attendanceHistory,
    queryFn: () => getAttendanceHistory(),
  });

  const session = useMemo<AttendanceSession | null>(() => {
    if (!params.sessionId || !historyQuery.data) return null;
    return historyQuery.data.find((item) => item.id === params.sessionId) ?? null;
  }, [historyQuery.data, params.sessionId]);

  const mutation = useMutation({
    mutationFn: () => {
      if (!session) throw new Error('Session not found');
      return requestAttendanceCorrection(session.id, {
        reason: reason.trim(),
        requested_check_in_at: combineDateAndTime(session.check_in_at, requestedCheckIn),
        requested_check_out_at: session.check_out_at
          ? combineDateAndTime(session.check_out_at, requestedCheckOut)
          : combineDateAndTime(session.check_in_at, requestedCheckOut),
      });
    },
    onSuccess: async () => {
      setSubmitted(true);
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendanceHistory });
      await queryClient.invalidateQueries({ queryKey: queryKeys.attendanceActive });
    },
    onError: (error) => {
      Alert.alert('Submission failed', getErrorMessage(error, 'Unable to submit correction request.'));
    },
  });

  const correctionStatus = session ? getCorrectionStatusLabel(session) : null;
  const canSubmit =
    Boolean(session) &&
    canRequestCorrection(session) &&
    reason.trim().length >= 5 &&
    !mutation.isPending &&
    !isOffline;

  if (historyQuery.isLoading) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Attendance Correction" onBack={() => router.back()} />
        <LoadingSkeletonList count={3} />
      </Screen>
    );
  }

  if (historyQuery.isError) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Attendance Correction" onBack={() => router.back()} />
        <ErrorState
          message="Unable to load session details."
          onRetry={() => void historyQuery.refetch()}
        />
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Attendance Correction" onBack={() => router.back()} />
        <ErrorState
          title="Session not found"
          message="Open a history record from Attendance and choose Request Correction."
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <BrandHeader title="Attendance Correction" subtitle={formatDate(session.check_in_at)} onBack={() => router.back()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {correctionStatus ? (
            <View style={styles.statusRow}>
              <StatusBadge
                label={correctionStatus}
                variant={correctionStatus === 'Approved' ? 'success' : 'warning'}
              />
            </View>
          ) : null}

          <View style={styles.infoCard}>
            <Text style={[typography.caption, styles.infoLabel]}>Original record</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              Check in {formatTime(session.check_in_at)} · Check out {formatTime(session.check_out_at)}
            </Text>
            <Text style={[typography.caption, styles.infoMeta]}>
              Shift {formatShiftWindow(session)}
            </Text>
          </View>

          <Field
            label="Requested check-in (HH:MM, optional)"
            value={requestedCheckIn}
            onChangeText={setRequestedCheckIn}
            placeholder="09:00"
            editable={!submitted && canRequestCorrection(session)}
          />
          <Field
            label="Requested check-out (HH:MM, optional)"
            value={requestedCheckOut}
            onChangeText={setRequestedCheckOut}
            placeholder="18:00"
            editable={!submitted && canRequestCorrection(session)}
          />
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Explain why this correction is needed"
            multiline
            editable={!submitted && canRequestCorrection(session)}
          />

          {reason.trim().length > 0 && reason.trim().length < 5 ? (
            <Text style={[typography.caption, styles.validation]}>Reason must be at least 5 characters.</Text>
          ) : null}

          {isOffline ? (
            <Text style={[typography.caption, styles.validation]}>Connect to the internet to submit.</Text>
          ) : null}

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={[typography.titleMd, styles.successTitle]}>Request submitted</Text>
              <Text style={[typography.bodyMd, styles.successText]}>
                Your manager will review this correction request.
              </Text>
            </View>
          ) : canRequestCorrection(session) ? (
            <AppButton
              title="Submit correction request"
              loading={mutation.isPending}
              disabled={!canSubmit}
              onPress={() => mutation.mutate()}
              style={styles.submit}
            />
          ) : (
            <Text style={[typography.bodyMd, styles.blocked]}>
              {session.correction_requested
                ? 'A correction request is already pending for this session.'
                : 'This session cannot be corrected right now.'}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[typography.labelSm, styles.fieldLabel]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        editable={editable}
        style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputDisabled]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  statusRow: {
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  infoMeta: {
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    opacity: 0.7,
  },
  validation: {
    color: colors.warning,
    marginBottom: spacing.sm,
  },
  submit: {
    marginTop: spacing.md,
  },
  successBox: {
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  successTitle: {
    color: colors.success,
    fontFamily: 'Inter_600SemiBold',
  },
  successText: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  blocked: {
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
