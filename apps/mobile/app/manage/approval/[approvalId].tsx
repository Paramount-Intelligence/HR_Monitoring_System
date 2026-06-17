import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../../src/components/manage/RoleAccessGuard';
import { ApprovalDetailCard } from '../../../src/components/approvals/ApprovalDetailCard';
import { ApprovalDecisionSheet } from '../../../src/components/approvals/ApprovalStatusBadge';
import { ApprovalTimeline } from '../../../src/components/approvals/ApprovalTimeline';
import { AppButton } from '../../../src/components/ui/AppButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { LoadingState } from '../../../src/components/ui/LoadingState';
import {
  getLeaveTimeline,
  getPendingCorrections,
  getPendingLeaveRequests,
  resolveCorrection,
  resolveLeaveRequest,
} from '../../../src/api/approvals.api';
import { getErrorMessage, isForbiddenError } from '../../../src/api/client';
import { queryKeys, reportQueryKeys } from '../../../src/constants/query-keys';
import { spacing } from '../../../src/constants/theme';

export default function ManageApprovalDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { approvalId, kind } = useLocalSearchParams<{ approvalId: string; kind?: string }>();
  const [modalMode, setModalMode] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  const leavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
  });

  const correctionsQuery = useQuery({
    queryKey: queryKeys.pendingCorrections,
    queryFn: getPendingCorrections,
  });

  const approvalKind = kind === 'correction' ? 'correction' : 'leave';

  const leaveItem = useMemo(
    () => leavesQuery.data?.find((item) => item.id === approvalId),
    [approvalId, leavesQuery.data]
  );

  const correctionItem = useMemo(
    () => correctionsQuery.data?.find((item) => item.id === approvalId),
    [approvalId, correctionsQuery.data]
  );

  const timelineQuery = useQuery({
    queryKey: queryKeys.leaveTimeline(approvalId ?? ''),
    queryFn: () => getLeaveTimeline(approvalId!),
    enabled: approvalKind === 'leave' && Boolean(approvalId),
  });

  const invalidateAfterDecision = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingLeaves }),
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingCorrections }),
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationsUnread }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardAdmin }),
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardManager }),
      queryClient.invalidateQueries({ queryKey: queryKeys.manageSummary() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reportsApprovalsAnalytics }),
      ...reportQueryKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
      queryClient.invalidateQueries({ queryKey: ['reports'] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.attendanceTeam() }),
    ]);
  };

  const resolveLeaveMutation = useMutation({
    mutationFn: (action: 'approved' | 'rejected') =>
      resolveLeaveRequest(approvalId!, {
        action,
        manager_comment: comment.trim() || undefined,
      }),
    onSuccess: async () => {
      await invalidateAfterDecision();
      setModalMode(null);
      setComment('');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Action failed', getErrorMessage(error, 'Unable to update leave request.'));
    },
  });

  const resolveCorrectionMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      resolveCorrection(approvalId!, {
        action,
        manager_comment: comment.trim() || undefined,
      }),
    onSuccess: async () => {
      await invalidateAfterDecision();
      setModalMode(null);
      setComment('');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Action failed', getErrorMessage(error, 'Unable to update correction request.'));
    },
  });

  const isLoading = leavesQuery.isLoading || correctionsQuery.isLoading;
  const isError = leavesQuery.isError || correctionsQuery.isError;
  const error = leavesQuery.error ?? correctionsQuery.error;
  const isSubmitting = resolveLeaveMutation.isPending || resolveCorrectionMutation.isPending;

  const handleConfirm = () => {
    if (!modalMode) return;
    if (approvalKind === 'leave') {
      resolveLeaveMutation.mutate(modalMode === 'approve' ? 'approved' : 'rejected');
      return;
    }
    resolveCorrectionMutation.mutate(modalMode === 'approve' ? 'approve' : 'reject');
  };

  return (
    <RoleAccessGuard>
      <Screen headerSafeArea scroll>
        <ManageScreenHeader title="Approval Detail" subtitle="Review request and take action" />
        {isLoading ? <LoadingState message="Loading request…" /> : null}
        {isError ? (
          <ErrorState
            message={
              isForbiddenError(error)
                ? 'You do not have permission to action this request.'
                : getErrorMessage(error, 'Unable to load approval detail.')
            }
            onRetry={() => {
              void leavesQuery.refetch();
              void correctionsQuery.refetch();
            }}
          />
        ) : null}

        <ApprovalDetailCard
          kind={approvalKind}
          leave={leaveItem}
          correction={correctionItem}
        />

        {!isLoading && !isError && !leaveItem && !correctionItem ? (
          <ErrorState message="This approval request is no longer available." />
        ) : null}

        {timelineQuery.data ? <ApprovalTimeline entries={timelineQuery.data} /> : null}

        {(leaveItem || correctionItem) && (
          <View style={styles.actions}>
            <AppButton title="Approve" onPress={() => setModalMode('approve')} />
            <AppButton title="Reject" variant="danger" onPress={() => setModalMode('reject')} />
          </View>
        )}

        <ApprovalDecisionSheet
          visible={modalMode != null}
          mode={modalMode ?? 'approve'}
          title={modalMode === 'reject' ? 'Reject Request' : 'Approve Request'}
          description="Add an optional comment for the requester."
          comment={comment}
          onChangeComment={setComment}
          onConfirm={handleConfirm}
          onCancel={() => {
            setModalMode(null);
            setComment('');
          }}
          loading={isSubmitting}
        />
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
});
