'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { CheckSquare } from 'lucide-react';

interface EodTaskMetricsProps {
  eod: EODReport;
}

export function EodTaskMetrics({ eod }: EodTaskMetricsProps) {
  return (
    <EmployeeSectionCard title="Task Metrics" icon={CheckSquare}>
      <p className="text-[10px] text-[var(--text-muted)] mb-3">For selected report date</p>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Tasks Worked On</span>
          <span className="font-medium">{eod.tasks_worked_on ?? 0}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Completed</span>
          <span className="font-medium text-emerald-600">{eod.completed_tasks ?? 0}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Pending</span>
          <span className="font-medium text-amber-600">{eod.pending_tasks ?? 0}</span>
        </div>
        <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
          <span className="text-[var(--text-muted)]">Blocked</span>
          <span className="font-medium text-rose-600">{eod.blocked_tasks ?? 0}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="font-medium">Key Actions</span>
          <span className="font-bold text-[var(--accent-primary)]">{eod.duties_performed ?? 0}</span>
        </div>
      </div>
    </EmployeeSectionCard>
  );
}
