'use client';

import type { ReactNode } from 'react';
import {
  Users,
  CheckCircle2,
  Calendar,
  HelpCircle,
  Activity,
  CheckSquare,
  Clock,
  Palmtree,
  Building,
} from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { Skeleton } from '@/components/ui/skeletons';
import { DashboardRole, getDashboardRoleConfig } from '@/lib/dashboard/dashboard-card-config';
import { DashboardSummary } from '@/lib/api/dashboard';
import { EODReport } from '@/lib/api/eod';
import { ManagerOverviewData } from '@/lib/manager-dashboard/types';
import { safeNumber } from '@/lib/admin-dashboard/utils';
import { formatSafeDurationFromSeconds } from '@/lib/utils';

function formatMinutes(minutes: number): string {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '—';
  return formatSafeDurationFromSeconds(m * 60);
}

function optionalKpi(kpis: Record<string, number>, ...keys: string[]) {
  for (const key of keys) {
    if (kpis[key] != null) return safeNumber(kpis[key]);
  }
  return '—';
}

export interface DashboardKpiGridProps {
  role: DashboardRole;
  loading?: boolean;
  adminContext?: {
    kpis: Record<string, unknown>;
    taskStats: Record<string, unknown>;
    openTickets: number;
    upcomingMeetings: number;
  };
  managerContext?: ManagerOverviewData | null;
  employeeContext?: {
    summary: DashboardSummary;
    eod: EODReport | null;
    completedToday?: number;
    leaveBalance?: string | number;
  };
  hrContext?: {
    totalEmployees: number;
    presentToday: number;
    onLeaveToday: number;
    wfhToday: number;
    openTickets: number;
    upcomingHolidays: number;
  };
}

export function DashboardKpiGrid({
  role,
  loading,
  adminContext,
  managerContext,
  employeeContext,
  hrContext,
}: DashboardKpiGridProps) {
  const overviewKeys = getDashboardRoleConfig(role).overviewCards;

  if (loading) {
    return (
      <div
        className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
        data-testid="dashboard-kpi-grid"
      >
        {overviewKeys.map((key) => (
          <Skeleton key={key} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const cards: ReactNode[] = [];

  if (role === 'admin' && adminContext) {
    const { kpis, taskStats, openTickets, upcomingMeetings } = adminContext;
    const map: Record<string, ReactNode> = {
      total_employees: (
        <AdminMetricCard
          key="total_employees"
          title="Total Employees"
          value={safeNumber(kpis.total_employees)}
          icon={Users}
          subtitle={`${safeNumber(kpis.checked_in_today)} checked in`}
        />
      ),
      present_today: (
        <AdminMetricCard
          key="present_today"
          title="Present Today"
          value={safeNumber(kpis.checked_in_today)}
          icon={CheckCircle2}
          subtitle={`${safeNumber(kpis.attendance_rate)}% rate`}
        />
      ),
      active_tasks: (
        <AdminMetricCard
          key="active_tasks"
          title="Active Tasks"
          value={safeNumber(taskStats.in_progress)}
          icon={Activity}
          subtitle={`${safeNumber(taskStats.total)} total`}
        />
      ),
      open_tickets: (
        <AdminMetricCard key="open_tickets" title="Open Tickets" value={openTickets} icon={HelpCircle} subtitle="Support feed" />
      ),
      upcoming_meetings: (
        <AdminMetricCard key="upcoming_meetings" title="Upcoming Meetings" value={upcomingMeetings} icon={Calendar} subtitle="Scheduled" />
      ),
    };
    overviewKeys.forEach((key) => {
      if (map[key]) cards.push(map[key]);
    });
  }

  if (role === 'manager' && managerContext) {
    const kpis = managerContext.kpis || {};
    const meetings = managerContext.upcoming_meetings || [];
    const map: Record<string, ReactNode> = {
      team_members: <AdminMetricCard key="team_members" title="Team Members" value={safeNumber(kpis.team_members)} icon={Users} />,
      present_today: <AdminMetricCard key="present_today" title="Present Today" value={safeNumber(kpis.present_today)} icon={CheckCircle2} />,
      tasks_in_progress: (
        <AdminMetricCard
          key="tasks_in_progress"
          title="Tasks In Progress"
          value={optionalKpi(kpis, 'tasks_in_progress', 'active_tasks')}
          icon={CheckSquare}
        />
      ),
      completed_today: (
        <AdminMetricCard
          key="completed_today"
          title="Completed Today"
          value={optionalKpi(kpis, 'completed_today', 'completed_tasks_today')}
          icon={CheckCircle2}
        />
      ),
      logged_hours_today: (
        <AdminMetricCard
          key="logged_hours_today"
          title="Logged Hours Today"
          value={optionalKpi(kpis, 'logged_hours_today', 'team_logged_hours_today', 'team_workload')}
          icon={Clock}
        />
      ),
      upcoming_meetings: (
        <AdminMetricCard key="upcoming_meetings" title="Upcoming Meetings" value={meetings.length} icon={Calendar} />
      ),
    };
    overviewKeys.forEach((key) => {
      if (map[key]) cards.push(map[key]);
    });
  }

  if ((role === 'employee' || role === 'intern') && employeeContext) {
    const { summary, eod, completedToday, leaveBalance } = employeeContext;
    const isActive = summary.attendance_status === 'active';
    const map: Record<string, ReactNode> = {
      logged_hours_today: (
        <AdminMetricCard
          key="logged_hours_today"
          title="Logged Hours Today"
          value={formatMinutes(summary.total_time_today)}
          icon={Clock}
          subtitle={`Productive: ${formatMinutes(summary.productive_time_today)}`}
        />
      ),
      my_active_tasks: (
        <AdminMetricCard
          key="my_active_tasks"
          title="My Active Tasks"
          value={summary.tasks_in_progress}
          icon={CheckSquare}
          subtitle="In progress"
        />
      ),
      completed_today: (
        <AdminMetricCard
          key="completed_today"
          title="Completed Today"
          value={completedToday ?? eod?.completed_tasks ?? 0}
          icon={CheckCircle2}
        />
      ),
      attendance_status: (
        <AdminMetricCard
          key="attendance_status"
          title="Attendance Status"
          value={isActive ? 'Online' : 'Offline'}
          icon={Activity}
          subtitle={isActive ? 'Shift active' : 'Awaiting check-in'}
        />
      ),
      leave_balance: (
        <AdminMetricCard key="leave_balance" title="Leave Balance" value={leaveBalance ?? '—'} icon={Palmtree} />
      ),
      upcoming_holiday: (
        <AdminMetricCard key="upcoming_holiday" title="Upcoming Holiday" value="View" icon={Calendar} subtitle="Organization calendar" />
      ),
    };
    overviewKeys.forEach((key) => {
      if (map[key]) cards.push(map[key]);
    });
  }

  if (role === 'hr' && hrContext) {
    const map: Record<string, ReactNode> = {
      total_employees: <AdminMetricCard key="total_employees" title="Total Employees" value={hrContext.totalEmployees} icon={Users} />,
      present_today: <AdminMetricCard key="present_today" title="Present Today" value={hrContext.presentToday} icon={CheckCircle2} />,
      on_leave_today: <AdminMetricCard key="on_leave_today" title="On Leave Today" value={hrContext.onLeaveToday} icon={Palmtree} />,
      wfh_today: <AdminMetricCard key="wfh_today" title="WFH Today" value={hrContext.wfhToday} icon={Building} />,
      open_support_tickets: (
        <AdminMetricCard key="open_support_tickets" title="Open Tickets" value={hrContext.openTickets} icon={HelpCircle} />
      ),
      upcoming_holiday: (
        <AdminMetricCard key="upcoming_holiday" title="Upcoming Holidays" value={hrContext.upcomingHolidays} icon={Calendar} />
      ),
    };
    overviewKeys.forEach((key) => {
      if (map[key]) cards.push(map[key]);
    });
  }

  if (!cards.length) return null;

  return (
    <div
      className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      data-testid="dashboard-kpi-grid"
    >
      {cards}
    </div>
  );
}
