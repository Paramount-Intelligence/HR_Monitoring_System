import type { Announcement } from '@/lib/api/announcements';
import { announcementDisplayTitle } from '@/lib/dashboard/overview-widgets';

const TICKER_SEPARATOR = '     •     ';
const REFETCH_INTERVAL_MS = 60_000;
const MIN_REFETCH_DELAY_MS = 2_000;

export function sortAnnouncementsForBar(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    const aStart = a.start_date ? Date.parse(a.start_date) : 0;
    const bStart = b.start_date ? Date.parse(b.start_date) : 0;
    if (aStart !== bStart) return bStart - aStart;
    return Date.parse(b.created_at) - Date.parse(a.created_at);
  });
}

export function getAnnouncementBarBody(content: string | null | undefined): string {
  return (content ?? '').replace(/\s+/g, ' ').trim();
}

export function getAnnouncementHeadlineParts(announcement: Announcement): { title: string; body: string } {
  const title = announcementDisplayTitle(announcement);
  const body = getAnnouncementBarBody(announcement.content);
  return { title, body };
}

/** Full headline — title and body together, never truncated. */
export function formatAnnouncementHeadline(announcement: Announcement): string {
  const { title, body } = getAnnouncementHeadlineParts(announcement);
  if (!body) return title;
  if (body === title) return title;
  return `${title}: ${body}`;
}

export function buildTickerSegment(announcement: Announcement): string {
  return `📢 ${formatAnnouncementHeadline(announcement)}`;
}

export function buildTickerSegments(announcements: Announcement[]): string[] {
  return sortAnnouncementsForBar(announcements).map(buildTickerSegment);
}

export function buildTickerTrackText(announcements: Announcement[]): string {
  const segments = buildTickerSegments(announcements);
  if (segments.length === 0) return '';
  return segments.join(TICKER_SEPARATOR);
}

/** ~12s per announcement when showing one at a time in the viewport. */
export function tickerAnimationDurationSeconds(
  segmentCount: number,
  secondsPerSegment = 12,
): number {
  const count = Math.max(segmentCount, 1);
  return Math.min(180, Math.max(12, count * secondsPerSegment));
}

export function getTickerRefetchIntervalMs(): number {
  return REFETCH_INTERVAL_MS;
}

export function computeTickerRefetchDelayMs(
  announcements: Announcement[],
  serverTime: string | null | undefined,
  nowMs: number = Date.now(),
): number {
  const serverNow = serverTime ? Date.parse(serverTime) : nowMs;
  const referenceNow = Number.isFinite(serverNow) ? serverNow : nowMs;

  const scheduleTimes: number[] = [];
  for (const item of announcements) {
    if (item.end_date) {
      const endMs = Date.parse(item.end_date);
      if (Number.isFinite(endMs) && endMs > referenceNow) {
        scheduleTimes.push(endMs - referenceNow + 1_000);
      }
    }
    if (item.start_date) {
      const startMs = Date.parse(item.start_date);
      if (Number.isFinite(startMs) && startMs > referenceNow) {
        scheduleTimes.push(startMs - referenceNow + 1_000);
      }
    }
  }

  if (scheduleTimes.length === 0) {
    return REFETCH_INTERVAL_MS;
  }

  const soonest = Math.min(...scheduleTimes);
  return Math.min(REFETCH_INTERVAL_MS, Math.max(MIN_REFETCH_DELAY_MS, soonest));
}
