'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface EmployeePageHeaderProps {
  /** Defaults to "Employee Workspace" */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

export function EmployeePageHeader({
  eyebrow = 'Employee Workspace',
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: EmployeePageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 md:flex-row md:items-center md:justify-between', className)}>
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]">
          {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{eyebrow}</span>
        </div>
        <h1 className="app-page-title">{title}</h1>
        {subtitle && (
          <p className="app-page-subtitle uppercase tracking-wide opacity-70">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
