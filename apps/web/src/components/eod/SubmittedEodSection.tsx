'use client';

import { EODReport } from '@/lib/api/eod';
import { formatPKDateTime } from '@/lib/time';
import { ReadOnlyEodTextBlock } from './ReadOnlyEodTextBlock';

interface SubmittedEodSectionProps {
  report: Pick<
    EODReport,
    'work_summary' | 'blockers' | 'next_day_plan' | 'submitted_at'
  >;
}

export function SubmittedEodSection({ report }: SubmittedEodSectionProps) {
  return (
    <section className="rounded-2xl border border-[var(--border-default)] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Submitted EOD
        </h3>
        {report.submitted_at ? (
          <span className="text-xs text-[var(--text-muted)]">
            Submitted: {formatPKDateTime(report.submitted_at)}
          </span>
        ) : null}
      </div>

      <div className="space-y-4">
        <ReadOnlyEodTextBlock
          title="Work Summary"
          value={report.work_summary}
          emptyText="No work summary submitted."
        />
        <ReadOnlyEodTextBlock
          title="Blockers"
          value={report.blockers}
          emptyText="No blockers reported."
        />
        <ReadOnlyEodTextBlock
          title="Plan for Tomorrow"
          value={report.next_day_plan}
          emptyText="No plan added."
        />
      </div>
    </section>
  );
}
