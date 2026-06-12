'use client';

import Link from 'next/link';
import { ShieldCheck, Clock, AlertTriangle } from 'lucide-react';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminChartCard } from '@/components/admin/dashboard/AdminChartCard';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';
import { UserProfilePicture } from '@/components/user/UserProfilePicture';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { safeArray, safeNumber } from '@/lib/admin-dashboard/utils';
import { ManagerEodAnalyticsData } from '@/lib/manager-dashboard/types';
import { formatPKDate } from '@/lib/time';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: ManagerEodAnalyticsData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

function fmtProductivity(v: unknown) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  return Number.isFinite(n) ? `${Math.round(n)}/100` : '—';
}

export function ManagerEodReportsTab({ data, loading, error, onRetry }: Props) {
  if (loading) return <div className="py-16 text-center text-sm text-[var(--text-muted)]">Loading EOD analytics...</div>;
  if (error) return <AdminTabError tabName="EOD & Reports" message={error} onRetry={onRetry} />;
  if (!data) return <AdminTabError tabName="EOD & Reports" message="No data received." onRetry={onRetry} />;

  const s = data.summary || {};
  const reports = safeArray<Record<string, unknown>>(data.reports);
  const productivity = safeArray(data.productivity_trend);

  return (
    <div className="space-y-4">
      <Link href="/manager/eod-reviews" className="text-xs font-bold text-[var(--accent-primary)] hover:underline">Open EOD review center →</Link>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <AdminMetricCard title="Submitted Today" value={safeNumber(s.submitted_today)} icon={ShieldCheck} />
        <AdminMetricCard title="Pending Reviews" value={safeNumber(s.pending_reviews)} />
        <AdminMetricCard title="Avg Productivity" value={fmtProductivity(s.average_productivity)} />
        <AdminMetricCard title="Blockers" value={safeNumber(s.blockers_reported)} icon={AlertTriangle} />
        <AdminMetricCard title="Team Hours" value={`${safeNumber(s.team_logged_hours).toFixed(1)}h`} icon={Clock} />
        <AdminMetricCard title="Missing EODs" value={safeNumber(s.missing_eods)} />
      </div>

      <AdminChartCard title="Productivity Trend">
        {productivity.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-8">No productivity data</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={productivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="count" fill="#1E66C1" radius={4} name="Score" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </AdminChartCard>

      <AdminDataTable
        data={reports}
        emptyMessage="No EOD reports from your team"
        columns={[
          {
            key: 'employee',
            header: 'Employee',
            render: (r) => (
              <div className="flex items-center gap-2">
                <UserProfilePicture name={String(r.employee_name || '—')} profilePictureUrl={(r.employee_avatar_url as string) || null} size="sm" />
                <span className="font-bold">{String(r.employee_name || '—')}</span>
              </div>
            ),
          },
          { key: 'date', header: 'Date', render: (r) => formatPKDate(String(r.date || '')) },
          { key: 'attendance', header: 'Attendance', render: (r) => String(r.attendance_status || '—') },
          { key: 'hours', header: 'Logged', render: (r) => `${safeNumber(r.logged_hours).toFixed(1)}h` },
          { key: 'prod', header: 'Productivity', render: (r) => fmtProductivity(r.productivity_score) },
          { key: 'tasks', header: 'Completed', render: (r) => safeNumber(r.tasks_completed) },
          { key: 'blockers', header: 'Blockers', render: (r) => safeNumber(r.blockers) },
          { key: 'status', header: 'Status', render: (r) => <Badge variant="outline">{String(r.status || '—')}</Badge> },
          {
            key: 'actions',
            header: 'Actions',
            render: (r) => (
              <Button size="sm" variant="outline" className="h-7 text-[10px]" asChild>
                <Link href={`/manager/eod-reviews?id=${String(r.id || '')}`}>Review</Link>
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
