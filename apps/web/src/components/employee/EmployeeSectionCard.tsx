'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmployeeSectionCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}

export function EmployeeSectionCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
  contentClassName,
  noPadding,
}: EmployeeSectionCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-soft)] overflow-hidden',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-[var(--border-subtle)]">
        <div className="min-w-0">
          <h2 className="app-section-title flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />}
            {title}
          </h2>
          {description && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn(!noPadding && 'p-4', contentClassName)}>{children}</div>
    </div>
  );
}
