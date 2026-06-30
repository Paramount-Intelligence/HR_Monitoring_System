'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Megaphone } from 'lucide-react';
import { announcementsApi, Announcement } from '@/lib/api/announcements';
import {
  buildTickerSegments,
  computeTickerRefetchDelayMs,
  getTickerRefetchIntervalMs,
  tickerAnimationDurationSeconds,
} from '@/lib/announcements/announcement-bar-utils';
import { useRealtimeEvent } from '@/hooks/useRealtime';
import { cn } from '@/lib/utils';

function shouldHideAnnouncementBar(pathname: string | null, tab: string | null): boolean {
  if (!pathname) return false;
  if (pathname === '/admin/announcements') return true;
  if (pathname.startsWith('/admin/organization') && tab === 'announcements') return true;
  return false;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

export function AnnouncementBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const prefersReducedMotion = usePrefersReducedMotion();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reducedMotionIndex, setReducedMotionIndex] = useState(0);

  const loadAnnouncements = useCallback(async () => {
    try {
      const data = await announcementsApi.getActiveAnnouncements({ limit: 20 });
      setAnnouncements(data.announcements);
      setServerTime(data.server_time);
    } catch {
      setAnnouncements([]);
      setServerTime(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    const onFocus = () => {
      void loadAnnouncements();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadAnnouncements]);

  useEffect(() => {
    if (loading) return;

    const delay = computeTickerRefetchDelayMs(announcements, serverTime);
    const timer = window.setTimeout(() => {
      void loadAnnouncements();
    }, delay);

    const interval = window.setInterval(() => {
      void loadAnnouncements();
    }, getTickerRefetchIntervalMs());

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [announcements, serverTime, loading, loadAnnouncements]);

  useRealtimeEvent(['announcement_created', 'announcement_updated', 'announcement_deleted'], () => {
    void loadAnnouncements();
  });

  const tickerSegments = useMemo(() => buildTickerSegments(announcements), [announcements]);
  const animationDuration = useMemo(
    () => tickerAnimationDurationSeconds(tickerSegments.length),
    [tickerSegments.length],
  );

  useEffect(() => {
    setReducedMotionIndex(0);
  }, [tickerSegments.length]);

  useEffect(() => {
    if (!prefersReducedMotion || tickerSegments.length <= 1) return;

    const timer = window.setInterval(() => {
      setReducedMotionIndex((current) => (current + 1) % tickerSegments.length);
    }, 12_000);

    return () => window.clearInterval(timer);
  }, [prefersReducedMotion, tickerSegments.length]);

  if (shouldHideAnnouncementBar(pathname, tab)) {
    return null;
  }

  const hasAnnouncements = tickerSegments.length > 0;
  const loopSegments = hasAnnouncements ? [...tickerSegments, ...tickerSegments] : [];

  return (
    <div
      className={cn(
        'announcement-ticker shrink-0 border-b border-yellow-600 bg-yellow-500 text-white',
      )}
      role="region"
      aria-label={hasAnnouncements ? 'Live company announcements' : 'Announcements status'}
      aria-live="polite"
    >
      <div className="mx-auto flex h-12 max-w-full items-center gap-3 px-3 sm:h-14 sm:px-5 lg:px-6">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-600 text-white sm:h-9 sm:w-9"
          aria-hidden
        >
          <Megaphone className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
        </div>

        {loading ? (
          <p className="text-sm font-medium text-white sm:text-base">Loading announcements…</p>
        ) : hasAnnouncements ? (
          prefersReducedMotion ? (
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-white sm:text-base">
              {tickerSegments[reducedMotionIndex]}
            </p>
          ) : (
            <div className="announcement-ticker__viewport min-w-0 flex-1 overflow-hidden">
              <div
                className="announcement-ticker__track"
                style={{ animationDuration: `${animationDuration}s` }}
              >
                {loopSegments.map((segment, index) => (
                  <span
                    key={`${segment}-${index}`}
                    className="announcement-ticker__segment announcement-ticker__segment--single"
                  >
                    {segment}
                  </span>
                ))}
              </div>
            </div>
          )
        ) : (
          <p className="text-sm font-medium text-white/90 sm:text-base">No new announcement</p>
        )}
      </div>
    </div>
  );
}
