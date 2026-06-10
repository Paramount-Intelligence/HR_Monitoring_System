'use client';

import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

interface AdminTabErrorProps {
  tabName: string;
  message?: string;
  onRetry?: () => void;
}

export function AdminTabError({ tabName, message, onRetry }: AdminTabErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
      <p className="text-sm font-semibold text-[var(--text-secondary)]">
        Could not load {tabName} analytics.
      </p>
      {message && (
        <p className="text-xs text-[var(--text-muted)] max-w-md text-center px-4">{message}</p>
      )}
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="rounded-xl">
          <RefreshCcw className="mr-2 h-4 w-4" /> Retry
        </Button>
      )}
    </div>
  );
}
