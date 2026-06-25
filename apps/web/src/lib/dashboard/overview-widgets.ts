import { Announcement } from '@/lib/api/announcements';
import { Holiday } from '@/lib/api/holidays';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function looksLikeUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_PATTERN.test(value.trim());
}

export function formatAnnouncementPreview(content: string, maxLength = 120): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No message preview available.';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}…`;
}

export function formatAudienceLabel(audience: string): string {
  if (!audience || audience === 'all') return 'All staff';
  return audience
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function announcementDisplayTitle(announcement: Announcement): string {
  const title = announcement.title?.trim();
  if (!title || looksLikeUuid(title)) return 'Company announcement';
  return title;
}

export function holidayDisplayName(holiday: Holiday): string {
  const name = holiday.name?.trim();
  if (!name || looksLikeUuid(name)) return 'Company holiday';
  return name;
}

export function pickAnnouncementItems(items: Announcement[], limit: number): Announcement[] {
  return items.slice(0, Math.max(1, limit));
}

export function pickHolidayItems(items: Holiday[], limit: number): Holiday[] {
  return items.slice(0, Math.max(1, limit));
}
