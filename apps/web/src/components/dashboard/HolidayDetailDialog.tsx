'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Holiday } from '@/lib/api/holidays';
import { holidayDisplayName } from '@/lib/dashboard/overview-widgets';
import { format, parseISO, isValid } from 'date-fns';

interface HolidayDetailDialogProps {
  holiday: Holiday | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatHolidayDate(value: string): string {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return 'Date unavailable';
  return format(parsed, 'EEEE, MMMM d, yyyy');
}

export function HolidayDetailDialog({ holiday, open, onOpenChange }: HolidayDetailDialogProps) {
  if (!holiday) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg font-extrabold text-[var(--text-primary)] pr-6">
              {holidayDisplayName(holiday)}
            </DialogTitle>
            <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-bold">
              Holiday
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            {formatHolidayDate(holiday.holiday_date)}
          </DialogDescription>
        </DialogHeader>
        {holiday.description ? (
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{holiday.description}</p>
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">No additional details provided.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
