'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { Clock, Timer } from 'lucide-react';
import { formatPKDateTime } from '@/lib/time';

interface EodShiftWorkDetailsProps {
  eod: EODReport;
}

function formatHours(value: number | undefined | null): string {
  if (value == null || Number.isNaN(value)) return '0h';
  return `${value}h`;
}

export function EodShiftWorkDetails({ eod }: EodShiftWorkDetailsProps) {
  const windowStart = eod.shift_window_start ?? eod.window_start;
  const windowEnd = eod.shift_window_end ?? eod.window_end;
  const breakdown = eod.task_breakdown ?? [];

  return (
    <EmployeeSectionCard title="Shift Work Details" icon={Timer}>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">
        EOD is based on your assigned shift window.
      </p>

      {windowStart && windowEnd ? (
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Shift window: {formatPKDateTime(windowStart)} – {formatPKDateTime(windowEnd)}
        </p>
      ) : null}

      <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2 mb-4 text-sm">
        <span className="text-[var(--text-muted)]">Total logged hours</span>
        <span className="font-bold text-[var(--accent-primary)]">
          {formatHours(eod.logged_hours ?? eod.total_hours)}
        </span>
      </div>

      {breakdown.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">No task time recorded for this shift window.</p>
      ) : (
        <div className="space-y-4">
          {breakdown.map((task) => (
            <div
              key={task.task_id}
              className="rounded-lg border border-[var(--border-subtle)] p-3 space-y-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{task.task_title}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {task.project_name ? task.project_name : 'No project'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold text-[var(--accent-primary)]">
                    {formatHours(task.total_logged_hours)}
                  </p>
                  <p className="text-[10px] uppercase text-[var(--text-muted)]">{task.status}</p>
                </div>
              </div>

              {task.time_logs.length > 0 ? (
                <div className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                  {task.time_logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]"
                    >
                      <span className="flex items-center gap-1 min-w-0">
                        <Clock className="h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                        <span className="truncate">
                          {formatPKDateTime(log.start_time)}
                          {log.end_time ? ` – ${formatPKDateTime(log.end_time)}` : ' – running'}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {log.duration_hours}h · {log.source}
                        {log.is_active ? ' · active' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </EmployeeSectionCard>
  );
}
