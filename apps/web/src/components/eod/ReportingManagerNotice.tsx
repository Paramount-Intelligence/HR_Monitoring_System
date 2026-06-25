'use client';

import { User } from 'lucide-react';

interface ReportingManagerNoticeProps {
  managerName: string | null | undefined;
}

export function ReportingManagerNotice({ managerName }: ReportingManagerNoticeProps) {
  const hasManager = Boolean(managerName?.trim());

  return (
    <div
      className={`rounded-2xl border p-4 ${
        hasManager
          ? 'border-[var(--border-default)] bg-[var(--bg-surface)]'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-start gap-3">
        <User className={`h-4 w-4 mt-0.5 ${hasManager ? 'text-[var(--accent-primary)]' : 'text-amber-700'}`} />
        <div className="space-y-1">
          {hasManager ? (
            <>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Reporting Manager: {managerName}
              </p>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Your submitted EOD will be sent to this person for review.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-amber-900">No reporting manager assigned.</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Please contact Admin/HR to assign your reporting manager. You can still save and
                submit your EOD, but it may not appear in anyone&apos;s review queue until a
                reporting manager is assigned.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
