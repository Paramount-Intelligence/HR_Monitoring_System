'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    label: string;
    isPositive?: boolean;
    href?: string;
  };
  lastUpdated?: string | Date;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
}

const COLOR_MAP = {
  indigo: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)] border-[var(--status-info-border)]',
  emerald: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]',
  amber: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]',
  rose: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]',
  slate: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]',
};

export function KPICard({
  title,
  value,
  icon: Icon,
  trend,
  lastUpdated,
  color = 'indigo',
  className,
}: KPICardProps) {
  const colorClasses = COLOR_MAP[color];

  return (
    <Card className={cn("rounded-xl shadow-premium border-[var(--border-subtle)] overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg border", colorClasses)}>
            <Icon className="h-5 w-5" />
          </div>
          {lastUpdated && (
            <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-tight">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wide">{title}</p>
          <h3 className="text-3xl font-bold text-[var(--text-primary)] mt-1 tracking-tight">{value}</h3>
        </div>

        {trend && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {trend.href ? (
              <Link href={trend.href} className="inline-flex items-center gap-1.5 hover:opacity-85 transition-opacity group">
                <span className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer group-hover:underline",
                  trend.isPositive ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">{trend.label}</span>
              </Link>
            ) : (
              <>
                <span className={cn(
                  "text-xs font-bold px-1.5 py-0.5 rounded",
                  trend.isPositive ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]" : "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}
                </span>
                <span className="text-xs text-[var(--text-secondary)] font-medium">{trend.label}</span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card className="rounded-xl shadow-premium border-[var(--border-subtle)] animate-pulse">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="h-9 w-9 rounded-lg bg-[var(--bg-subtle)]" />
          <div className="h-3 w-20 bg-[var(--bg-subtle)] rounded" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="h-3 w-24 bg-[var(--bg-subtle)] rounded" />
          <div className="h-8 w-16 bg-[var(--border-default)] rounded" />
        </div>
        <div className="mt-4 h-4 w-32 bg-[var(--bg-subtle)] rounded mx-auto" />
      </CardContent>
    </Card>
  );
}
