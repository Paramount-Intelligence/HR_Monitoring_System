'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CallModalOverlayProps {
  children: ReactNode;
  className?: string;
  fullScreen?: boolean;
  onBackdropClick?: () => void;
}

/** Dim/blur backdrop with centered call content — locks attention on the call UI. */
export function CallModalOverlay({
  children,
  className,
  fullScreen = false,
  onBackdropClick,
}: CallModalOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[200] flex animate-in fade-in duration-200',
        fullScreen ? 'flex-col' : 'items-center justify-center p-4 sm:p-6',
        'bg-slate-950/85 backdrop-blur-xl'
      )}
      role="dialog"
      aria-modal="true"
      onClick={onBackdropClick}
    >
      <div
        className={cn(
          'relative w-full',
          fullScreen ? 'flex flex-1 flex-col min-h-0' : 'max-w-lg',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
