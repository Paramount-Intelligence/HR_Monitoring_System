'use client';

import { cn } from '@/lib/utils';

interface EmployeeMetricGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function EmployeeMetricGrid({ children, className, columns = 4 }: EmployeeMetricGridProps) {
  const cols =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

  return <div className={cn('grid gap-2.5', cols, className)}>{children}</div>;
}
