'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Announcement } from '@/lib/api/announcements';
import { announcementDisplayTitle, formatAudienceLabel } from '@/lib/dashboard/overview-widgets';
import { format, parseISO, isValid } from 'date-fns';

interface AnnouncementDetailDialogProps {
  announcement: Announcement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const parsed = parseISO(value);
  if (!isValid(parsed)) return null;
  return format(parsed, 'MMM d, yyyy h:mm a');
}

export function AnnouncementDetailDialog({
  announcement,
  open,
  onOpenChange,
}: AnnouncementDetailDialogProps) {
  if (!announcement) return null;

  const published = formatDate(announcement.start_date || announcement.created_at);
  const expires = formatDate(announcement.end_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg font-extrabold text-[var(--text-primary)] pr-6">
              {announcementDisplayTitle(announcement)}
            </DialogTitle>
            <Badge variant="outline" className="shrink-0 text-[10px] uppercase font-bold">
              {formatAudienceLabel(announcement.audience)}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            {published ? `Published ${published}` : 'Recently published'}
            {expires ? ` · Expires ${expires}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto custom-scrollbar">
          {announcement.content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
