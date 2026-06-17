import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BrandHeader } from '../src/components/brand/BrandHeader';
import { Screen } from '../src/components/ui/Screen';
import { AppButton } from '../src/components/ui/AppButton';
import { EmptyState } from '../src/components/ui/EmptyState';
import { ErrorState } from '../src/components/ui/ErrorState';
import { LoadingSkeletonList } from '../src/components/ui/LoadingSkeleton';
import { StatusBadge } from '../src/components/ui/StatusBadge';
import { FilterChips } from '../src/components/ui/FilterChips';
import { getMyLeaveRequests, getLeaveTimeline, submitLeaveRequest } from '../src/api/leave.api';
import { getErrorMessage } from '../src/api/client';
import { queryKeys } from '../src/constants/query-keys';
import type { LeaveRequest, LeaveType } from '../src/types/approvals';
import { formatDate } from '../src/utils/format';
import { useNetworkStore } from '../src/network/network-store';
import { colors, radius, shadows, spacing, typography } from '../src/theme';

const LEAVE_TYPES: { id: LeaveType; label: string }[] = [
  { id: 'sick', label: 'Sick' },
  { id: 'casual', label: 'Casual' },
  { id: 'annual', label: 'Annual' },
  { id: 'half_day', label: 'Half-day' },
  { id: 'wfh', label: 'WFH' },
];

const HALF_DAY_OPTIONS = [
  { id: 'first_half', label: 'Morning' },
  { id: 'second_half', label: 'Afternoon' },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function leaveStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
    case 'needs_clarification':
    case 'escalated':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    default:
      return 'info';
  }
}

function leaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPES.find((item) => item.id === type)?.label ?? type;
}

export default function LeaveRequestScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isOffline = useNetworkStore((s) => s.isOffline);

  const [leaveType, setLeaveType] = useState<LeaveType>('annual');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [reason, setReason] = useState('');
  const [halfDayPeriod, setHalfDayPeriod] = useState<'first_half' | 'second_half'>('first_half');
  const [submitted, setSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const requestsQuery = useQuery({
    queryKey: queryKeys.myLeaves,
    queryFn: getMyLeaveRequests,
  });

  const timelineQuery = useQuery({
    queryKey: queryKeys.leaveTimeline(expandedId ?? ''),
    queryFn: () => getLeaveTimeline(expandedId!),
    enabled: Boolean(expandedId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      submitLeaveRequest({
        start_date: startDate,
        end_date: leaveType === 'half_day' ? startDate : endDate,
        leave_type: leaveType,
        reason: reason.trim(),
        is_half_day: leaveType === 'half_day',
        half_day_period: leaveType === 'half_day' ? halfDayPeriod : null,
      }),
    onSuccess: async () => {
      setSubmitted(true);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: queryKeys.myLeaves });
    },
    onError: (error) => {
      Alert.alert('Submission failed', getErrorMessage(error, 'Unable to submit leave request.'));
    },
  });

  const canSubmit =
    reason.trim().length >= 3 &&
    /^\d{4}-\d{2}-\d{2}$/.test(startDate) &&
    (leaveType === 'half_day' || /^\d{4}-\d{2}-\d{2}$/.test(endDate)) &&
    !mutation.isPending &&
    !isOffline;

  const recentRequests = useMemo(() => requestsQuery.data ?? [], [requestsQuery.data]);

  if (requestsQuery.isLoading) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Leave / WFH Request" onBack={() => router.back()} />
        <LoadingSkeletonList count={4} />
      </Screen>
    );
  }

  if (requestsQuery.isError) {
    return (
      <Screen headerSafeArea withTabBarInset={false}>
        <BrandHeader title="Leave / WFH Request" onBack={() => router.back()} />
        <ErrorState
          message="Unable to load leave requests."
          onRetry={() => void requestsQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen headerSafeArea scroll={false} withTabBarInset={false}>
      <BrandHeader title="Leave / WFH Request" subtitle="Submit time-off or WFH" onBack={() => router.back()} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.labelSm, styles.sectionLabel]}>REQUEST TYPE</Text>
          <View style={styles.typeGrid}>
            {LEAVE_TYPES.map((type) => {
              const active = leaveType === type.id;
              return (
                <Pressable
                  key={type.id}
                  onPress={() => setLeaveType(type.id)}
                  style={[styles.typeChip, active && styles.typeChipActive]}
                >
                  <Text style={[typography.labelMd, active ? styles.typeLabelActive : styles.typeLabel]}>
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {leaveType === 'half_day' ? (
            <>
              <Text style={[typography.labelSm, styles.sectionLabel]}>HALF-DAY PERIOD</Text>
              <FilterChips
                options={HALF_DAY_OPTIONS}
                selectedId={halfDayPeriod}
                onSelect={(id) => setHalfDayPeriod(id as 'first_half' | 'second_half')}
              />
            </>
          ) : null}

          <Field label="Start date (YYYY-MM-DD)" value={startDate} onChangeText={setStartDate} />
          {leaveType !== 'half_day' ? (
            <Field label="End date (YYYY-MM-DD)" value={endDate} onChangeText={setEndDate} />
          ) : null}
          <Field
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="Provide context for your manager"
            multiline
          />

          {isOffline ? (
            <Text style={[typography.caption, styles.validation]}>Connect to the internet to submit.</Text>
          ) : null}

          {submitted ? (
            <View style={styles.successBox}>
              <Text style={[typography.titleMd, styles.successTitle]}>Request submitted</Text>
              <Text style={[typography.bodyMd, styles.successText]}>
                Your leave/WFH request was sent for review.
              </Text>
            </View>
          ) : (
            <AppButton
              title="Submit request"
              loading={mutation.isPending}
              disabled={!canSubmit}
              onPress={() => mutation.mutate()}
              style={styles.submit}
            />
          )}

          <Text style={[typography.headlineMd, styles.historyTitle]}>My recent requests</Text>
          {recentRequests.length === 0 ? (
            <EmptyState
              title="No leave requests yet"
              description="Submitted requests and approval status will appear here."
              icon="document-text-outline"
            />
          ) : (
            recentRequests.map((request) => (
              <LeaveHistoryCard
                key={request.id}
                request={request}
                expanded={expandedId === request.id}
                onToggle={() => setExpandedId((current) => (current === request.id ? null : request.id))}
                timeline={expandedId === request.id ? timelineQuery.data ?? [] : []}
                timelineLoading={expandedId === request.id && timelineQuery.isLoading}
              />
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function LeaveHistoryCard({
  request,
  expanded,
  onToggle,
  timeline,
  timelineLoading,
}: {
  request: LeaveRequest;
  expanded: boolean;
  onToggle: () => void;
  timeline: { action: string; actor_name?: string; created_at: string; comment: string | null }[];
  timelineLoading: boolean;
}) {
  return (
    <Pressable onPress={onToggle} style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View style={styles.historyLeft}>
          <Text style={[typography.bodyMd, styles.historyType]}>{leaveTypeLabel(request.leave_type)}</Text>
          <Text style={[typography.caption, styles.historyDates]}>
            {formatDate(request.start_date)} – {formatDate(request.end_date)}
          </Text>
        </View>
        <StatusBadge label={request.status} variant={leaveStatusVariant(request.status)} />
      </View>
      {expanded ? (
        <View style={styles.timelineBox}>
          {timelineLoading ? (
            <Text style={[typography.caption, styles.timelineLoading]}>Loading timeline…</Text>
          ) : timeline.length === 0 ? (
            <Text style={[typography.caption, styles.timelineLoading]}>No timeline entries yet.</Text>
          ) : (
            timeline.map((entry) => (
              <Text key={entry.created_at + entry.action} style={[typography.caption, styles.timelineItem]}>
                {entry.action.replace(/_/g, ' ')} · {formatDate(entry.created_at)}
                {entry.comment ? ` — ${entry.comment}` : ''}
              </Text>
            ))
          )}
        </View>
      ) : null}
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={[typography.labelSm, styles.sectionLabel]}>{label.toUpperCase()}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline]}
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
  sectionLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.card,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeLabel: {
    color: colors.text,
  },
  typeLabelActive: {
    color: colors.white,
  },
  field: {
    marginBottom: spacing.sm,
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
  validation: {
    color: colors.warning,
    marginTop: spacing.sm,
  },
  submit: {
    marginTop: spacing.lg,
  },
  successBox: {
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  successTitle: {
    color: colors.success,
    fontFamily: 'Inter_600SemiBold',
  },
  successText: {
    color: colors.text,
    marginTop: spacing.xs,
  },
  historyTitle: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  historyLeft: {
    flex: 1,
  },
  historyType: {
    color: colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  historyDates: {
    color: colors.textSecondary,
    marginTop: 2,
  },
  timelineBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.outlineVariant,
    gap: spacing.xs,
  },
  timelineLoading: {
    color: colors.textSecondary,
  },
  timelineItem: {
    color: colors.textSecondary,
  },
});
