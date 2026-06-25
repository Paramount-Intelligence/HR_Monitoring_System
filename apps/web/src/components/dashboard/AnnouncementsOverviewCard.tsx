'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnnouncementDetailDialog } from './AnnouncementDetailDialog';
import {
  announcementDisplayTitle,
  formatAnnouncementPreview,
  formatAudienceLabel,
  pickAnnouncementItems,
} from '@/lib/dashboard/overview-widgets';
import { format, parseISO, isValid } from 'date-fns';

interface AnnouncementsOverviewCardProps {
  limit?: number;
  viewAllHref?: string;
  className?: string;
}

function formatAnnouncementDate(value: string): string {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return 'Recently';
  return format(parsed, 'MMM d, yyyy');
}

export function AnnouncementsOverviewCard({
  limit = 5,
  viewAllHref,
  className,
}: AnnouncementsOverviewCardProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Announcement | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementsApi.getVisibleAnnouncements({ limit });
      setItems(pickAnnouncementItems(data, limit));
    } catch {
      setError('Unable to load announcements.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = (announcement: Announcement) => {
    setSelected(announcement);
    setDialogOpen(true);
  };

  return (
    <>
      <div
        className={`rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[var(--shadow-soft)] overflow-hidden ${className ?? ''}`}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-subtle)]">
          <div>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-[var(--accent-primary)]" />
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">Announcements</h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">Latest company updates</p>
          </div>
          {viewAllHref ? (
            <Link
              href={viewAllHref}
              className="text-[10px] font-bold text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[var(--text-muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 text-center space-y-3">
              <p className="text-xs text-[var(--text-muted)]">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="rounded-lg text-xs">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] text-center py-8">No announcements yet</p>
          ) : (
            <ul className="space-y-2">
              {items.map((announcement) => (
                <li key={announcement.id}>
                  <button
                    type="button"
                    onClick={() => openDetail(announcement)}
                    className="w-full text-left rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3 hover:bg-[var(--bg-subtle)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-[var(--text-primary)] line-clamp-1">
                        {announcementDisplayTitle(announcement)}
                      </p>
                      <Badge variant="outline" className="shrink-0 text-[9px] uppercase font-bold">
                        {formatAudienceLabel(announcement.audience)}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1">
                      {formatAnnouncementPreview(announcement.content)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">
                      {formatAnnouncementDate(announcement.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AnnouncementDetailDialog
        announcement={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
