'use client';

import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    label: string;
    isPositive?: boolean;
  };
  lastUpdated?: string | Date;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'slate';
  className?: string;
}

const COLOR_MAP = {
  indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  rose: 'bg-rose-50 text-rose-600 border-rose-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-100',
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
    <Card className={cn("rounded-xl shadow-premium border-slate-100 overflow-hidden", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg border", colorClasses)}>
            <Icon className="h-5 w-5" />
          </div>
          {lastUpdated && (
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">
              Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1 tracking-tight">{value}</h3>
        </div>

        {trend && (
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span className={cn(
              "text-xs font-bold px-1.5 py-0.5 rounded",
              trend.isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
            <span className="text-xs text-slate-500 font-medium">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card className="rounded-xl shadow-premium border-slate-100 animate-pulse">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="h-9 w-9 rounded-lg bg-slate-100" />
          <div className="h-3 w-20 bg-slate-100 rounded" />
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="h-3 w-24 bg-slate-100 rounded" />
          <div className="h-8 w-16 bg-slate-200 rounded" />
        </div>
        <div className="mt-4 h-4 w-32 bg-slate-100 rounded mx-auto" />
      </CardContent>
    </Card>
  );
}
