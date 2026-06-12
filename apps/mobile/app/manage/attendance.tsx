import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { RoleAccessGuard } from '../../src/components/manage/RoleAccessGuard';
import { AttendanceOverviewCard } from '../../src/components/manage/AttendanceOverviewCard';
import { FilterBar } from '../../src/components/manage/FilterBar';
import { StatCard } from '../../src/components/manage/StatCard';
import { ErrorState } from '../../src/components/ui/ErrorState';
import { AppEmptyState } from '../../src/components/ui/AppEmptyState';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { getTeamAttendanceSessions } from '../../src/api/manage.api';
import { getErrorMessage, isForbiddenError } from '../../src/api/client';
import { queryKeys } from '../../src/constants/query-keys';
import { todayIsoDate } from '../../src/utils/manage';
import { spacing } from '../../src/constants/theme';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'present', label: 'Present' },
  { key: 'leave', label: 'On Leave' },
  { key: 'late', label: 'Late' },
];

export default function ManageAttendanceScreen() {
  const [statusFilter, setStatusFilter] = useState('all');
  const today = todayIsoDate();

  const attendanceQuery = useQuery({
    queryKey: queryKeys.attendanceTeam({ date_from: today, date_to: today }),
    queryFn: () => getTeamAttendanceSessions({ date_from: today, date_to: today }),
  });

  const filteredSessions = useMemo(() => {
    const sessions = attendanceQuery.data ?? [];
    if (statusFilter === 'present') {
      return sessions.filter((session) => session.session_status === 'active' || session.check_out_at);
    }
    if (statusFilter === 'leave') {
      return sessions.filter(
        (session) =>
          session.attendance_classification === 'leave' ||
          session.attendance_classification === 'full_leave'
      );
    }
    if (statusFilter === 'late') {
      return sessions.filter((session) => session.is_late_login);
    }
    return sessions;
  }, [attendanceQuery.data, statusFilter]);

  const stats = useMemo(() => {
    const sessions = attendanceQuery.data ?? [];
    return {
      present: sessions.filter((session) => session.session_status === 'active' || session.check_out_at).length,
      leave: sessions.filter(
        (session) =>
          session.attendance_classification === 'leave' ||
          session.attendance_classification === 'full_leave'
      ).length,
      late: sessions.filter((session) => session.is_late_login).length,
      wfh: sessions.filter((session) => session.work_mode === 'wfh').length,
    };
  }, [attendanceQuery.data]);

  return (
    <RoleAccessGuard>
      <Screen scroll={false}>
        <ManageScreenHeader title="Attendance Overview" subtitle={`Today · ${today}`} />
        {attendanceQuery.isLoading ? <LoadingState message="Loading attendance…" /> : null}
        {attendanceQuery.isError ? (
          <ErrorState
            message={
              isForbiddenError(attendanceQuery.error)
                ? 'You do not have access to team attendance.'
                : getErrorMessage(attendanceQuery.error, 'Unable to load attendance overview.')
            }
            onRetry={() => void attendanceQuery.refetch()}
          />
        ) : null}
        {!attendanceQuery.isLoading && !attendanceQuery.isError ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={attendanceQuery.isRefetching}
                onRefresh={() => void attendanceQuery.refetch()}
              />
            }
          >
            <View style={styles.statsGrid}>
              <StatCard label="Present" value={stats.present} />
              <StatCard label="On leave" value={stats.leave} />
              <StatCard label="Late" value={stats.late} />
              <StatCard label="WFH" value={stats.wfh} />
            </View>
            <FilterBar options={STATUS_FILTERS} selected={statusFilter} onSelect={setStatusFilter} />
            {filteredSessions.length === 0 ? (
              <AppEmptyState title="No attendance records" description="No records match the selected filter." />
            ) : (
              filteredSessions.map((session) => (
                <AttendanceOverviewCard key={session.id} session={session} />
              ))
            )}
          </ScrollView>
        ) : null}
      </Screen>
    </RoleAccessGuard>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
});
