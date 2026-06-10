'use client';

import { cn } from '@/lib/utils';

interface EmployeePageShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard page wrapper for all Employee portal routes */
export function EmployeePageShell({ children, className }: EmployeePageShellProps) {
  return (
    <div
      className={cn(
        'space-y-5 pb-16 max-w-[1600px] mx-auto animate-in fade-in duration-500 text-[var(--text-primary)]',
        className
      )}
    >
      {children}
    </div>
  );
}
