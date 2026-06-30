'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { Clock } from 'lucide-react';
import { formatPKDateTime } from '@/lib/time';

interface EodAttendanceSummaryProps {
  eod: EODReport;
}

export function EodAttendanceSummary({ eod }: EodAttendanceSummaryProps) {
  const summary = eod.attendance_summary;
  const checkIn = summary?.check_in_at ?? eod.login_time;
  const checkOut = summary?.check_out_at ?? eod.logout_time;
  const workMode = summary?.work_mode ?? eod.work_mode;
  const totalHours = summary?.total_hours ?? eod.total_hours;
  const status = summary?.status ?? eod.attendance_status;
  const reportDate = eod.report_date ?? eod.date;

  return (
    <EmployeeSectionCard title="Attendance Summary" icon={Clock}>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Report Date</span>
          <span className="font-medium">{reportDate || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Work Mode</span>
          <span className="font-medium uppercase">{workMode || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Check-in</span>
          <span className="font-medium">{checkIn ? formatPKDateTime(checkIn) : '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Check-out</span>
          <span className="font-medium">
            {checkIn ? (checkOut ? formatPKDateTime(checkOut) : 'Active Session') : '—'}
          </span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-medium">Attendance Hours</span>
          <span className="font-bold text-[var(--accent-primary)]">{totalHours ?? 0}h</span>
        </div>
        {status ? (
          <p className="text-[10px] text-[var(--text-muted)] pt-1">Status: {status}</p>
        ) : null}
      </div>
    </EmployeeSectionCard>
  );
}
