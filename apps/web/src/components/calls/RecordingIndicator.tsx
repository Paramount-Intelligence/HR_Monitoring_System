'use client';

import type { RecordingStatus } from '@/hooks/useCallRecording';
import { shouldShowRecordingBadge, shouldShowRecordingConsent } from './call-ui-utils';

interface RecordingIndicatorProps {
  status: RecordingStatus;
  isRecordingActive: boolean;
  variant?: 'badge' | 'banner';
}

export function RecordingIndicator({
  status,
  isRecordingActive,
  variant = 'badge',
}: RecordingIndicatorProps) {
  const showBadge = shouldShowRecordingBadge(status, isRecordingActive);
  const showConsent = shouldShowRecordingConsent(status, isRecordingActive);

  if (!showBadge && !showConsent) return null;

  if (variant === 'banner' && showConsent) {
    return (
      <p className="text-center text-xs font-medium text-slate-300/90">
        This call is being recorded for internal review.
      </p>
    );
  }

  if (!showBadge) return null;

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-red-400/60 bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100">
      <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
      Recording
    </span>
  );
}
