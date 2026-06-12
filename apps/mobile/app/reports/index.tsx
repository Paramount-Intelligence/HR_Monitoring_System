import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../src/components/ui/Screen';
import { ManageScreenHeader } from '../../src/components/manage/ManageScreenHeader';
import { ManageHubCard } from '../../src/components/manage/ManageHubCard';
import { useAuthStore } from '../../src/auth/auth-store';
import { getEmployeeReport } from '../../src/api/reports.api';
import { getPendingCorrections, getPendingLeaveRequests } from '../../src/api/approvals.api';
import { queryKeys } from '../../src/constants/query-keys';
import { getReportDateRange } from '../../src/utils/report-dates';
import {
  canAccessAdminReports,
  canAccessApprovalSummaryReport,
  canAccessEmployeeReports,
  canAccessTeamReports,
  canAccessWorkforceReports,
  normalizeRole,
} from '../../src/utils/role';
import { AppEmptyState } from '../../src/components/ui/AppEmptyState';
import { colors, spacing } from '../../src/constants/theme';

export default function ReportsHubScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = normalizeRole(user?.role);
  const range = getReportDateRange('month');

  const employeeReportQuery = useQuery({
    queryKey: queryKeys.reportsEmployee({
      start_date: range.start_date,
      end_date: range.end_date,
    }),
    queryFn: () =>
      getEmployeeReport({ start_date: range.start_date, end_date: range.end_date }),
    enabled: canAccessEmployeeReports(role),
  });

  const pendingLeavesQuery = useQuery({
    queryKey: queryKeys.pendingLeaves,
    queryFn: getPendingLeaveRequests,
    enabled: canAccessApprovalSummaryReport(role),
  });

  const pendingCorrectionsQuery = useQuery({
    queryKey: queryKeys.pendingCorrections,
    queryFn: getPendingCorrections,
    enabled: canAccessApprovalSummaryReport(role),
  });

  const pendingCount =
    (pendingLeavesQuery.data?.length ?? 0) + (pendingCorrectionsQuery.data?.length ?? 0);

  const cards = useMemo(() => {
    const items: {
      key: string;
      title: string;
      subtitle: string;
      icon: 'person-outline' | 'people-outline' | 'business-outline' | 'calendar-outline' | 'document-text-outline' | 'alert-circle-outline' | 'checkmark-done-outline';
      badge?: number;
      metric?: string;
      route: string;
    }[] = [];

    if (canAccessEmployeeReports(role)) {
      items.push({
        key: 'employee',
        title: 'My Attendance Report',
        subtitle: 'Hours, late logins, and absences',
        icon: 'person-outline',
        metric: employeeReportQuery.data
          ? `${employeeReportQuery.data.total_hours.toFixed(1)}h this month`
          : undefined,
        route: '/reports/employee',
      });
      items.push({
        key: 'leave',
        title: 'My Leave Summary',
        subtitle: 'Leave, WFH, and request status',
        icon: 'document-text-outline',
        route: '/reports/leave',
      });
    }

    if (canAccessTeamReports(role)) {
      items.push({
        key: 'team',
        title: 'Team Reports',
        subtitle: 'Attendance and performance by member',
        icon: 'people-outline',
        route: '/reports/team',
      });
      items.push({
        key: 'team-attendance',
        title: 'Team Attendance',
        subtitle: 'Present, absent, WFH, and late flags',
        icon: 'calendar-outline',
        route: '/reports/attendance',
      });
    }

    if (canAccessWorkforceReports(role)) {
      items.push({
        key: 'workforce',
        title: canAccessAdminReports(role) ? 'Workforce Summary' : 'Workforce Attendance',
        subtitle: 'Org-wide attendance and exceptions',
        icon: 'business-outline',
        route: '/reports/workforce',
      });
    }

    if (canAccessApprovalSummaryReport(role)) {
      items.push({
        key: 'approvals',
        title: 'Approval Summary',
        subtitle: 'Pending leave, WFH, and corrections',
        icon: 'checkmark-done-outline',
        badge: pendingCount,
        route: '/manage/approvals',
      });
    }

    return items;
  }, [employeeReportQuery.data, pendingCount, role]);

  return (
    <Screen scroll={false}>
      <ManageScreenHeader title="Reports" subtitle="Role-based insights and summaries" showBack />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Available reports</Text>
        {cards.map((card) => (
          <ManageHubCard
            key={card.key}
            title={card.title}
            subtitle={card.metric ?? card.subtitle}
            icon={card.icon}
            badge={card.badge}
            onPress={() => router.push(card.route as never)}
          />
        ))}
        {cards.length === 0 ? (
          <AppEmptyState
            title="No reports available for this period."
            description="You do not have access to any reports for your current role."
            icon="bar-chart-outline"
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
    color: colors.text,
  },
});
