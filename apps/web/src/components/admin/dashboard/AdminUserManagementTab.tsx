'use client';

import Link from 'next/link';
import { Users, UserCheck, Clock, Palmtree, Home } from 'lucide-react';
import { AdminMetricCard } from './AdminMetricCard';
import { AdminChartCard } from './AdminChartCard';
import { AdminDataTable } from './AdminDataTable';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { getProfilePictureUrl } from '@/lib/profile-picture';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { AdminTabError } from './AdminTabError';
import { UsersAnalyticsData } from '@/lib/admin-dashboard/types';

const CHART_COLORS = ['#1E66C1', '#38BDF8', '#047857', '#B45309', '#B91C1C', '#607A99'];

interface AdminUserManagementTabProps {
  data: UsersAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
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

  return (
    <div className="space-y-6">
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
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
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
          )}
        </AdminChartCard>

        <AdminChartCard title="Department Distribution">
          {deptDist.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptDist.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 9 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#1E66C1" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>

        <AdminChartCard title="Attendance by Dept" description="% present today">
          {attByDept.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={attByDept.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="count" fill="#38BDF8" radius={4} name="Attendance %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </AdminChartCard>
      </div>

      <AdminChartCard title="Employee Activity Trend" description="7-day attendance">
        {activityTrend.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No data</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="checked_in" stroke="#1E66C1" fill="#DCEEFF" />
            </AreaChart>
          </ResponsiveContainer>
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
            { key: 'attendance', header: 'Today', render: (r) => String(r.today_attendance || '—') },
            {
              key: 'tasks',
              header: 'Tasks',
              render: (r) => `${safeNumber(r.active_tasks)} active / ${safeNumber(r.completed_tasks)} done`,
            },
            { key: 'hours', header: 'Logged Hrs', render: (r) => safeNumber(r.logged_hours) },
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
