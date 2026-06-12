'use client';

import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface CallControlButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  label: string;
  children: ReactNode;
  variant?: 'default' | 'danger';
}

export function CallControlButton({
  onClick,
  disabled,
  active,
  label,
  children,
  variant = 'default',
}: CallControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full border-2 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'danger'
          ? 'border-red-500 bg-red-600 text-white shadow-lg shadow-red-900/50 hover:bg-red-500 hover:scale-105 active:scale-95'
          : active
            ? 'border-red-400/70 bg-red-500/30 text-white hover:bg-red-500/40'
            : 'border-white/25 bg-white/10 text-white hover:bg-white/20 hover:border-white/40 active:scale-95'
      )}
    >
      {children}
    </button>
  );
}
