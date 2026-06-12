'use client';

import { cn } from '@/lib/utils';
import type { CallConnectionStatus } from '@/hooks/useCallManager';
import { getCallStatusLabel, getCallStatusTone } from './call-ui-utils';

interface CallStatusBadgeProps {
  status: CallConnectionStatus;
  durationSec: number;
  iceConnectionState?: string;
  className?: string;
}

export function CallStatusBadge({
  status,
  durationSec,
  iceConnectionState,
  className,
}: CallStatusBadgeProps) {
  const tone = getCallStatusTone(status, iceConnectionState);
  const label = getCallStatusLabel(status, durationSec, iceConnectionState);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold tracking-wide',
        tone === 'connected' && 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100',
        tone === 'warning' && 'border-amber-400/50 bg-amber-500/15 text-amber-100',
        tone === 'danger' && 'border-red-400/50 bg-red-500/15 text-red-100',
        tone === 'neutral' && 'border-slate-400/40 bg-slate-500/15 text-slate-200',
        className
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          tone === 'connected' && 'bg-emerald-400 animate-pulse',
          tone === 'warning' && 'bg-amber-400 animate-pulse',
          tone === 'danger' && 'bg-red-400',
          tone === 'neutral' && 'bg-slate-300 animate-pulse'
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}
