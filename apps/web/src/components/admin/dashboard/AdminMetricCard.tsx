'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: string;
  className?: string;
}

export function AdminMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
}: AdminMetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-soft)] flex flex-col min-h-[96px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </span>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-[var(--bg-subtle)] flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
          </div>
        )}
      </div>
      <p className="text-xl font-black text-[var(--text-primary)] tracking-tight">{value}</p>
      {subtitle && (
        <p className="text-[10px] font-bold text-[var(--text-secondary)] mt-1 uppercase tracking-wide">
          {subtitle}
        </p>
      )}
      {trend && (
        <p className="text-[10px] font-semibold text-[var(--accent-primary)] mt-auto pt-2">{trend}</p>
      )}
    </div>
  );
}
