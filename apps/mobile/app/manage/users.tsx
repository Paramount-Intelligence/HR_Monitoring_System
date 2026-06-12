import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { UserListCard } from '../../src/components/manage/UserListCard';
import { EmptyAccessState } from '../../src/components/manage/EmptyAccessState';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { AppEmptyState } from '../../src/components/ui/AppEmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getUsers } from '../../src/api/users.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { canAccessAllUsers } from '../../src/utils/role';
import { useAuthStore } from '../../src/auth/auth-store';
import { colors, spacing } from '../../src/constants/theme';

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
      <Screen scroll={false}>
        <ManageScreenHeader title="Users" subtitle="Company directory" />
        <EmptyAccessState message="Only Admin and HR can access the full user directory." />
      </Screen>
    );
  }

  return (
    <RoleAccessGuard>
      <Screen scroll={false}>
        <ManageScreenHeader title="Users" subtitle="Search and open employee profiles" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, or department"
          placeholderTextColor={colors.mutedText}
          style={styles.search}
        />
        {usersQuery.isLoading ? <LoadingState message="Loading users…" /> : null}
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
            refreshControl={
              <RefreshControl refreshing={usersQuery.isRefetching} onRefresh={() => void usersQuery.refetch()} />
            }
          >
            {filteredUsers.length === 0 ? (
              <AppEmptyState title="No users found" description="Try a different search or refresh the list." />
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
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
    marginBottom: spacing.md,
  },
});
