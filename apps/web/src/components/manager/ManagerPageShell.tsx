'use client';

import { cn } from '@/lib/utils';

export function ManagerPageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
