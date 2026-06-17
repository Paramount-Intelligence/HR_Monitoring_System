import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { UserListCard } from '../../src/components/manage/UserListCard';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { OfflineBanner } from '../../src/components/ui/OfflineBanner';
import { LoadingSkeletonList } from '../../src/components/ui/LoadingSkeleton';
import { SearchInput } from '../../src/components/ui/SearchInput';
import { getUsers } from '../../src/api/users.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { canAccessAllUsers } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/theme';

export default function ManageUsersScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');

  const usersQuery = useQuery({
    queryKey: queryKeys.users({ scope: 'directory' }),
    queryFn: () => getUsers({ status: 'active' }),
    enabled: canAccessAllUsers(user?.role),
  });

  const filteredUsers = useMemo(() => {
    const list = usersQuery.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (item) =>
        item.full_name.toLowerCase().includes(term) ||
        item.email.toLowerCase().includes(term) ||
        (item.department_name ?? item.department ?? '').toLowerCase().includes(term)
    );
  }, [search, usersQuery.data]);

  if (!canAccessAllUsers(user?.role)) {
    return (
      <Screen headerSafeArea scroll={false}>
        <OfflineBanner />
        <ManageScreenHeader title="Users" subtitle="Company directory" />
        <EmptyAccessState message="Only Admin and HR can access the full user directory." />
      </Screen>
    );
  }

  return (
    <RoleAccessGuard>
      <Screen headerSafeArea scroll={false}>
        <OfflineBanner />
        <ManageScreenHeader title="Users" subtitle="Search and open employee profiles" />
        <View style={styles.content}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or department"
            containerStyle={styles.search}
          />
          {usersQuery.isLoading ? <LoadingSkeletonList count={5} /> : null}
          {usersQuery.isError ? (
            <ErrorState
              message={
                isForbiddenError(usersQuery.error)
                  ? 'You do not have access to the user directory.'
                  : getErrorMessage(usersQuery.error, 'Unable to load users.')
              }
              onRetry={() => void usersQuery.refetch()}
            />
          ) : null}
          {!usersQuery.isLoading && !usersQuery.isError ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={usersQuery.isRefetching}
                  onRefresh={() => void usersQuery.refetch()}
                />
              }
            >
              {filteredUsers.length === 0 ? (
                <EmptyState
                  title="No users found"
                  description="Try a different search or refresh the list."
                />
              ) : (
                filteredUsers.map((item) => (
                  <UserListCard
                    key={item.id}
                    user={item}
                    statusLabel={item.status}
                    statusVariant={item.status === 'active' ? 'success' : 'neutral'}
                    onPress={() =>
                      router.push({
                        pathname: '/manage/user/[userId]',
                        params: { userId: item.id },
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
  search: {
    marginBottom: spacing.md,
  },
});
