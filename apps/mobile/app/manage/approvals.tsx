import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { ApprovalCard } from '../../src/components/manage/ApprovalCard';
import { FilterBar } from '../../src/components/manage/FilterBar';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { getPendingCorrections, getPendingLeaveRequests } from '../../src/api/approvals.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { useUnifiedApprovals } from '../../src/utils/manage';
import { colors, spacing } from '../../src/theme';

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
      <Screen headerSafeArea scroll={false}>
        <OfflineBanner />
        <ManageScreenHeader title="Pending Approvals" subtitle="Review and action requests" />
        <View style={styles.content}>
          <FilterBar
            options={FILTER_OPTIONS}
            selected={filter}
            onSelect={(key) => setFilter(key as 'all' | 'leave' | 'correction')}
          />
          {isLoading ? <LoadingSkeletonList count={4} /> : null}
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
              showsVerticalScrollIndicator={false}
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
                <EmptyState title="No pending approvals" description="You're all caught up." />
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
        </View>
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    backgroundColor: colors.background,
  },
});
