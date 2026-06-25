'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeSectionCard } from '@/components/employee/EmployeeSectionCard';
import { FileText } from 'lucide-react';
import {
  WORK_SUMMARY_MAX,
  validateWorkSummary,
  isEodFormEditable,
} from '@/lib/eod/eod-form';
import { cn } from '@/lib/utils';

interface EodSummaryFormProps {
  eod: EODReport | null;
  workSummary: string;
  blockers: string;
  nextDayPlan: string;
  onWorkSummaryChange: (value: string) => void;
  onBlockersChange: (value: string) => void;
  onNextDayPlanChange: (value: string) => void;
  validationError?: string | null;
  disabled?: boolean;
}

const textareaClassName = cn(
  'w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]',
  'px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  'focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-y min-h-[120px]'
);

export function EodSummaryForm({
  eod,
  workSummary,
  blockers,
  nextDayPlan,
  onWorkSummaryChange,
  onBlockersChange,
  onNextDayPlanChange,
  validationError,
  disabled = false,
}: EodSummaryFormProps) {
  const editable = isEodFormEditable(eod) && !disabled;
  const summaryError = validationError ?? validateWorkSummary(workSummary);

  return (
    <EmployeeSectionCard title="Today's Work Summary" icon={FileText}>
      <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
        Write what you completed today, including task progress, key actions, blockers, and
        follow-up items.
      </p>

      <div className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[var(--text-secondary)]">
            Work Summary <span className="text-rose-500">*</span>
          </span>
          <textarea
            value={workSummary}
            onChange={(e) => onWorkSummaryChange(e.target.value)}
            disabled={!editable}
            placeholder="Example: Completed LMS fee calculation filters, fixed credential workflow issues, reviewed task timers, and tested message notifications."
            className={textareaClassName}
            maxLength={WORK_SUMMARY_MAX}
          />
          <div className="flex items-center justify-between text-[10px]">
            <span className={cn('text-[var(--text-muted)]', summaryError && editable && 'text-rose-500')}>
              {editable && summaryError ? summaryError : 'Required for Submit EOD'}
            </span>
            <span className="text-[var(--text-muted)]">
              {workSummary.trim().length} / {WORK_SUMMARY_MAX}
            </span>
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[var(--text-secondary)]">Blockers</span>
          <textarea
            value={blockers}
            onChange={(e) => onBlockersChange(e.target.value)}
            disabled={!editable}
            placeholder="Mention blockers or dependencies, if any."
            className={textareaClassName}
            maxLength={WORK_SUMMARY_MAX}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-[var(--text-secondary)]">Plan for Tomorrow</span>
          <textarea
            value={nextDayPlan}
            onChange={(e) => onNextDayPlanChange(e.target.value)}
            disabled={!editable}
            placeholder="Mention what you plan to work on next."
            className={textareaClassName}
            maxLength={WORK_SUMMARY_MAX}
          />
        </label>
      </div>
    </EmployeeSectionCard>
  );
}
