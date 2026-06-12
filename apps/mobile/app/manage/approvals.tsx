import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { ApprovalCard } from '../../src/components/manage/ApprovalCard';
import { FilterBar } from '../../src/components/manage/FilterBar';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { AppEmptyState } from '../../src/components/ui/AppEmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getPendingCorrections, getPendingLeaveRequests } from '../../src/api/approvals.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { useUnifiedApprovals } from '../../src/utils/manage';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'leave', label: 'Leave / WFH' },
  { key: 'correction', label: 'Corrections' },
];

export default function ManageApprovalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [filter, setFilter] = useState<'all' | 'leave' | 'correction'>('all');

  useEffect(() => {
    if (params.filter === 'leave' || params.filter === 'correction' || params.filter === 'all') {
      setFilter(params.filter);
    }
  }, [params.filter]);

  const leavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
  });

  const correctionsQuery = useQuery({
    queryKey: queryKeys.pendingCorrections,
    queryFn: getPendingCorrections,
  });

  const items = useUnifiedApprovals(leavesQuery.data, correctionsQuery.data, filter);
  const isLoading = leavesQuery.isLoading || correctionsQuery.isLoading;
  const isError = leavesQuery.isError || correctionsQuery.isError;
  const error = leavesQuery.error ?? correctionsQuery.error;
  const refreshing = leavesQuery.isRefetching || correctionsQuery.isRefetching;

  return (
    <RoleAccessGuard>
      <Screen scroll={false}>
        <ManageScreenHeader title="Pending Approvals" subtitle="Review and action requests" />
        <FilterBar
          options={FILTER_OPTIONS}
          selected={filter}
          onSelect={(key) => setFilter(key as 'all' | 'leave' | 'correction')}
        />
        {isLoading ? <LoadingState message="Loading approvals…" /> : null}
        {isError ? (
          <ErrorState
            message={
              isForbiddenError(error)
                ? 'You do not have access to this approval queue.'
                : getErrorMessage(error, 'Unable to load approvals.')
            }
            onRetry={() => {
              void leavesQuery.refetch();
              void correctionsQuery.refetch();
            }}
          />
        ) : null}
        {!isLoading && !isError ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void leavesQuery.refetch();
                  void correctionsQuery.refetch();
                }}
              />
            }
          >
            {items.length === 0 ? (
              <AppEmptyState title="No pending approvals" description="You're all caught up." />
            ) : (
              items.map((item) => (
                <ApprovalCard
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  onPress={() =>
                    router.push({
                      pathname: '/manage/approval/[approvalId]',
                      params: { approvalId: item.id, kind: item.kind },
                    })
                  }
                />
              ))
            )}
          </ScrollView>
        ) : null}
      </Screen>
    </RoleAccessGuard>
  );
}
