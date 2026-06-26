'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { Clock } from 'lucide-react';
import { formatPKDateTime } from '@/lib/time';

interface EodAttendanceSummaryProps {
  eod: EODReport;
}

export function EodAttendanceSummary({ eod }: EodAttendanceSummaryProps) {
  return (
    <EmployeeSectionCard title="Attendance Summary" icon={Clock}>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Report Date</span>
          <span className="font-medium">{eod.date || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Work Mode</span>
          <span className="font-medium uppercase">{eod.work_mode || '—'}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Check-in</span>
          <span className="font-medium">
            {eod.login_time ? formatPKDateTime(eod.login_time) : '—'}
          </span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Check-out</span>
          <span className="font-medium">
            {eod.login_time
              ? eod.logout_time
                ? formatPKDateTime(eod.logout_time)
                : 'Active Session'
              : '—'}
          </span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-medium">Total Hours</span>
          <span className="font-bold text-[var(--accent-primary)]">
            {eod.logged_hours ?? eod.total_hours ?? 0}h
          </span>
        </div>
        {eod.attendance_status ? (
          <p className="text-[10px] text-[var(--text-muted)] pt-1">Status: {eod.attendance_status}</p>
        ) : null}
      </div>
    </EmployeeSectionCard>
  );
}
