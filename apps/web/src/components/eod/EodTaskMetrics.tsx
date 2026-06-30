'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { CheckSquare } from 'lucide-react';

interface EodTaskMetricsProps {
  eod: EODReport;
}

export function EodTaskMetrics({ eod }: EodTaskMetricsProps) {
  const metrics = eod.task_metrics;
  const tasksWorkedOn = metrics?.tasks_worked_on ?? eod.tasks_worked_on;
  const completed = metrics?.completed ?? eod.completed_tasks;
  const pending = metrics?.pending ?? eod.pending_tasks;
  const blocked = metrics?.blocked ?? eod.blocked_tasks;
  const keyActions = metrics?.key_actions ?? eod.duties_performed;

  return (
    <EmployeeSectionCard title="Task Metrics" icon={CheckSquare}>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">For selected report date</p>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Tasks Worked On</span>
          <span className="font-medium">{tasksWorkedOn}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Completed</span>
          <span className="font-medium text-emerald-600">{completed}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Pending</span>
          <span className="font-medium text-amber-600">{pending}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Blocked</span>
          <span className="font-medium text-rose-600">{blocked}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-medium">Key Actions</span>
          <span className="font-bold text-[var(--accent-primary)]">{keyActions}</span>
        </div>
      </div>
    </EmployeeSectionCard>
  );
}
