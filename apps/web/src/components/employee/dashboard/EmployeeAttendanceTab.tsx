'use client';

import Link from 'next/link';
import { AttendanceSession } from '@/lib/api/attendance';
import { DashboardSummary } from '@/lib/api/dashboard';
import { AdminMetricCard } from '@/components/admin/dashboard/AdminMetricCard';
import { AdminDataTable } from '@/components/admin/dashboard/AdminDataTable';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn, formatAttendanceDuration, formatSafeDurationFromSeconds } from '@/lib/utils';
import { formatPKDate, formatPKDateTime } from '@/lib/time';
import { Clock, LogIn, ShieldCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

interface EmployeeAttendanceTabProps {
  summary: DashboardSummary;
  sessions: AttendanceSession[];
  shiftName?: string | null;
  shiftTiming?: string | null;
}

function formatBreakMinutes(minutes: unknown): string {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m < 0) return '0m';
  return formatSafeDurationFromSeconds(m * 60);
}

export function EmployeeAttendanceTab({
  summary,
  sessions,
  shiftName,
  shiftTiming,
}: EmployeeAttendanceTabProps) {
  const isActive = summary.attendance_status === 'active';
  const activeSession = sessions.find((s) => s.session_status === 'active');
  const history = sessions.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <AdminMetricCard
          title="Check-in Status"
          value={isActive ? 'Checked In' : 'Not Checked In'}
          subtitle={shiftName || 'Standard Shift'}
          icon={LogIn}
        />
        <AdminMetricCard
          title="Today Check-in"
          value={
            activeSession
              ? formatPKDateTime(activeSession.check_in_at, { hour: '2-digit', minute: '2-digit' })
              : '—'
          }
          icon={Clock}
        />
        <AdminMetricCard
          title="Break Duration"
          value={activeSession ? formatBreakMinutes(activeSession.total_break_minutes) : '0m'}
          icon={Clock}
        />
        <AdminMetricCard
          title="Logged Hours"
          value={formatSafeDurationFromSeconds(Number(summary.total_time_today) * 60)}
          icon={Clock}
        />
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Shift Info
              </span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{shiftName || 'Standard Shift'}</p>
            <p className="text-xs text-[var(--text-secondary)]">{shiftTiming || '5:00 PM - 2:00 AM PKT'}</p>
          </div>
          <Link
            href="/employee/attendance"
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'rounded-lg text-xs shrink-0')}
          >
            {isActive ? 'Manage Attendance' : 'Check In'}
          </Link>
        </div>

        {activeSession && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Work mode</p>
              <p className="font-semibold uppercase">{activeSession.work_mode}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Late arrival</p>
              <p className="font-semibold">{activeSession.is_late_login ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Active break</p>
              <p className="font-semibold">{activeSession.active_break ? 'On break' : 'None'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)] mb-0.5">Session duration</p>
              <p className="font-semibold">{formatAttendanceDuration(activeSession)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-soft)]">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-3 px-1">
          Attendance History Preview
        </h3>
        {history.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-8">No attendance records yet.</p>
        ) : (
          <AdminDataTable
            data={history}
            emptyMessage="No history"
            columns={[
              {
                key: 'date',
                header: 'Date',
                render: (s) => formatPKDate(s.check_in_at),
              },
              {
                key: 'in',
                header: 'Check-in',
                render: (s) =>
                  formatPKDateTime(s.check_in_at, { hour: '2-digit', minute: '2-digit' }),
              },
              {
                key: 'out',
                header: 'Check-out',
                render: (s) =>
                  s.check_out_at
                    ? formatPKDateTime(s.check_out_at, { hour: '2-digit', minute: '2-digit' })
                    : 'Active',
              },
              {
                key: 'duration',
                header: 'Duration',
                render: (s) => formatAttendanceDuration(s),
              },
              {
                key: 'status',
                header: 'Status',
                render: (s) => <StatusBadge status={s.attendance_classification || s.session_status} />,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
