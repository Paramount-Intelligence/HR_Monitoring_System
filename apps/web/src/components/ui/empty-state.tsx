'use client';

import { LucideIcon, SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]",
      className
    )}>
      <div className="p-4 rounded-2xl bg-[var(--bg-elevated)] shadow-premium border border-[var(--border-default)] mb-6 transition-transform hover:scale-105 duration-300">
        <Icon className="h-10 w-10 text-[var(--accent-primary)]/70" />
      </div>
      <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{title}</h3>
      <p className="text-sm font-medium text-[var(--text-secondary)] mt-2 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
