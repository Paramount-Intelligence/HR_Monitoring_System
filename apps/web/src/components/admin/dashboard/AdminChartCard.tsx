'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  action?: React.ReactNode;
}

export function AdminChartCard({
  title,
  description,
  children,
  className,
  contentClassName,
  action,
}: AdminChartCardProps) {
  return (
    <Card className={cn('border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)]', className)}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-black text-[var(--text-primary)]">{title}</CardTitle>
          {description && (
            <CardDescription className="text-[10px] font-bold uppercase tracking-wide mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('min-h-[200px]', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
