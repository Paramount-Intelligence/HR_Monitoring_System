'use client';

import Link from 'next/link';
import { Users, UserCheck, Clock, Palmtree, Home } from 'lucide-react';
import { AdminMetricCard } from './AdminMetricCard';
import { AdminChartCard } from './AdminChartCard';
import { AdminDataTable } from './AdminDataTable';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { attendanceBadgeClass, formatLoggedHours } from '@/lib/admin-dashboard/roster';
import { AdminTabError } from './AdminTabError';
import { UsersAnalyticsData } from '@/lib/admin-dashboard/types';

const CHART_COLORS = ['#1E66C1', '#38BDF8', '#047857', '#B45309', '#B91C1C', '#607A99'];
const CHART_MIN_HEIGHT = 200;

interface AdminUserManagementTabProps {
  data: UsersAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function chartEmptyState(message: string) {
  return <p className="text-xs text-[var(--text-muted)] italic text-center py-8">{message}</p>;
}

export function AdminUserManagementTab({ data, loading, error, onRetry }: AdminUserManagementTabProps) {
  if (loading) {
    return <div className="py-20 text-center text-sm text-[var(--text-muted)] font-semibold">Loading workforce analytics...</div>;
  }
  if (error) {
    return <AdminTabError tabName="User Management" message={error} onRetry={onRetry} />;
  }
  if (!data) {
    return <AdminTabError tabName="User Management" message="No analytics payload received." onRetry={onRetry} />;
  }

  const s = data.summary || {};
  const roleDist = safeArray(data.role_distribution);
  const deptDist = safeArray(data.department_distribution);
  const attByDept = safeArray(data.attendance_rate_by_department);
  const activityTrend = safeArray(data.employee_activity_trend);
  const roster = safeArray<Record<string, unknown>>(data.employee_roster);
  const performance = safeArray<Record<string, unknown>>(data.employee_performance);
  const attendanceRecordedToday = attByDept.some((item) => safeNumber((item as { count?: number }).count) > 0);

  return (
    <div className="space-y-6">
      {data.business_date ? (
        <p className="text-[10px] text-[var(--text-muted)]">
          Business date: {data.business_date}
          {data.timezone ? ` (${data.timezone})` : ''}
        </p>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <AdminMetricCard title="Total Employees" value={safeNumber(s.total_employees)} icon={Users} />
        <AdminMetricCard title="Active" value={safeNumber(s.active_employees)} icon={UserCheck} />
        <AdminMetricCard title="Present Today" value={safeNumber(s.present_today)} subtitle={`${safeNumber(s.late_today)} late`} icon={Clock} />
        <AdminMetricCard title="On Leave" value={safeNumber(s.on_leave)} icon={Palmtree} />
        <AdminMetricCard title="WFH Today" value={safeNumber(s.wfh_today)} icon={Home} subtitle={`${safeNumber(s.new_users_this_month)} new this month`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AdminMetricCard title="Admins / HR" value={safeNumber(s.admins)} />
        <AdminMetricCard title="Managers" value={safeNumber(s.managers)} />
        <AdminMetricCard title="Employees" value={safeNumber(s.employees)} />
        <AdminMetricCard title="Interns" value={safeNumber(s.interns)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <AdminChartCard title="Role Distribution">
          {roleDist.length === 0 ? (
            chartEmptyState('No role data')
          ) : (
            <div className="w-full" style={{ minHeight: CHART_MIN_HEIGHT }}>
              <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
                <PieChart>
                  <Pie data={roleDist} dataKey="count" nameKey="label" cx="50%" cy="45%" innerRadius={35} outerRadius={55}>
                    {roleDist.map((_: unknown, i: number) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminChartCard>

        <AdminChartCard title="Department Distribution">
          {deptDist.length === 0 ? (
            chartEmptyState('No department data')
          ) : (
            <div className="w-full" style={{ minHeight: CHART_MIN_HEIGHT }}>
              <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
                <BarChart data={deptDist.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1E66C1" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminChartCard>

        <AdminChartCard title="Attendance by Dept" description="% present today">
          {attByDept.length === 0 ? (
            chartEmptyState('No attendance recorded today')
          ) : !attendanceRecordedToday ? (
            chartEmptyState('No attendance recorded today')
          ) : (
            <div className="w-full" style={{ minHeight: CHART_MIN_HEIGHT }}>
              <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
                <BarChart data={attByDept.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#38BDF8" radius={4} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminChartCard>
      </div>

      <AdminChartCard title="Employee Activity Trend" description="7-day attendance">
        {activityTrend.length === 0 ? (
          chartEmptyState('No activity data')
        ) : (
          <div className="w-full" style={{ minHeight: CHART_MIN_HEIGHT }}>
            <ResponsiveContainer width="100%" height={CHART_MIN_HEIGHT}>
              <AreaChart data={activityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="checked_in" name="Present" stroke="#1E66C1" fill="#DCEEFF" stackId="1" />
                <Area type="monotone" dataKey="late" name="Late" stroke="#B45309" fill="#FEF3C7" stackId="1" />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#94A3B8" fill="#F1F5F9" stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </AdminChartCard>

      <div>
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-3 uppercase tracking-wider">Employee Roster</h3>
        <AdminDataTable
          data={roster}
          emptyMessage="No employees found"
          columns={[
            {
              key: 'avatar',
              header: '',
              render: (r) => (
                <UserProfilePicture
                  user={{ full_name: String(r.full_name || ''), profile_picture_url: r.avatar_url as string | null, avatar_url: r.avatar_url as string | null }}
                  name={String(r.full_name || '')}
                  size="sm"
                />
              ),
            },
            { key: 'name', header: 'Name', render: (r) => String(r.full_name || '—') },
            { key: 'email', header: 'Email', render: (r) => String(r.email || '—') },
            { key: 'role', header: 'Role', render: (r) => String(r.role || '').replace(/_/g, ' ') },
            { key: 'dept', header: 'Department', render: (r) => String(r.department || '—') },
            { key: 'designation', header: 'Designation', render: (r) => String(r.designation || '—') },
            {
              key: 'status',
              header: 'Status',
              render: (r) => <Badge variant="outline">{String(r.status || '—')}</Badge>,
            },
            {
              key: 'attendance',
              header: 'Today',
              render: (r) => {
                const status = String(r.today_attendance || '—');
                if (status === '—') return '—';
                return (
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${attendanceBadgeClass(status)}`}>
                    {status}
                  </span>
                );
              },
            },
            {
              key: 'tasks',
              header: 'Tasks',
              render: (r) => `${safeNumber(r.active_tasks)} active / ${safeNumber(r.completed_tasks)} done`,
            },
            { key: 'hours', header: 'Logged Hrs', render: (r) => formatLoggedHours(r.logged_hours) },
            {
              key: 'actions',
              header: 'Actions',
              render: (r) => (
                <Link href={`/admin/users/profile?id=${r.id}`} className="text-[10px] font-black text-[var(--accent-primary)] hover:underline">
                  View
                </Link>
              ),
            },
          ]}
        />
      </div>

      <div>
        <h3 className="text-sm font-black text-[var(--text-primary)] mb-3 uppercase tracking-wider">Individual Performance</h3>
        <AdminDataTable
          data={performance}
          emptyMessage="No performance data available"
          columns={[
            {
              key: 'avatar',
              header: '',
              render: (r) => (
                <UserProfilePicture
                  user={{ full_name: String(r.full_name || ''), profile_picture_url: r.avatar_url as string | null, avatar_url: r.avatar_url as string | null }}
                  name={String(r.full_name || '')}
                  size="sm"
                />
              ),
            },
            { key: 'name', header: 'Employee', render: (r) => String(r.full_name || '—') },
            { key: 'att', header: 'Attendance %', render: (r) => `${safeNumber(r.attendance_rate)}%` },
            { key: 'tasks', header: 'Task Completion', render: (r) => `${safeNumber(r.task_completion_rate)}%` },
            { key: 'hours', header: 'Avg Hours', render: (r) => safeNumber(r.average_logged_hours) },
            { key: 'late', header: 'Late Count', render: (r) => safeNumber(r.late_count) },
            {
              key: 'eod',
              header: 'EOD Rate',
              render: (r) =>
                r.eod_completion_rate != null ? `${safeNumber(r.eod_completion_rate)}%` : '—',
            },
            { key: 'workload', header: 'Workload', render: (r) => safeNumber(r.current_workload) },
            {
              key: 'risk',
              header: 'Risk',
              render: (r) =>
                r.risk_flag ? (
                  <Badge className={r.risk_flag === 'High' ? 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]' : 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]'}>
                    {String(r.risk_flag)}
                  </Badge>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </div>
    </div>
  );
}
