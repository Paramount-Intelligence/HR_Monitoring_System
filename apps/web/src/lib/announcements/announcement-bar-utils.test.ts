import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Announcement } from '@/lib/api/announcements';
import {
  buildTickerSegment,
  buildTickerTrackText,
  computeTickerRefetchDelayMs,
  formatAnnouncementHeadline,
  getAnnouncementBarBody,
  getAnnouncementHeadlineParts,
  sortAnnouncementsForBar,
  tickerAnimationDurationSeconds,
} from './announcement-bar-utils.ts';

const sample = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: 'ann-1',
  title: 'System maintenance',
  content: 'Portal maintenance tonight from 10 PM to 11 PM. Please save your work.',
  audience: 'all',
  is_active: true,
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

describe('announcement ticker utils', () => {
  it('sorts newest announcements first', () => {
    const sorted = sortAnnouncementsForBar([
      sample({ id: 'old', created_at: '2026-06-01T10:00:00Z' }),
      sample({ id: 'new', created_at: '2026-06-09T10:00:00Z' }),
    ]);
    assert.equal(sorted[0]?.id, 'new');
  });

  it('returns full title and body for headline display', () => {
    const parts = getAnnouncementHeadlineParts(sample());
    assert.equal(parts.title, 'System maintenance');
    assert.equal(parts.body, 'Portal maintenance tonight from 10 PM to 11 PM. Please save your work.');
    assert.equal(
      formatAnnouncementHeadline(sample()),
      'System maintenance: Portal maintenance tonight from 10 PM to 11 PM. Please save your work.',
    );
  });

  it('does not expose uuid-like titles', () => {
    const parts = getAnnouncementHeadlineParts(
      sample({ title: '3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc', content: 'Policy update published.' }),
    );
    assert.equal(parts.title, 'Company announcement');
    assert.equal(parts.body.includes('3b0b242c'), false);
  });

  it('normalizes announcement body whitespace', () => {
    assert.equal(getAnnouncementBarBody('  Line one.   Line two.  '), 'Line one. Line two.');
  });

  it('builds ticker segment with title and body', () => {
    const segment = buildTickerSegment(sample());
    assert.match(segment, /^📢 System maintenance:/);
    assert.match(segment, /Please save your work\./);
  });

  it('joins multiple announcements for scrolling track', () => {
    const track = buildTickerTrackText([
      sample({ id: 'a', title: 'Holiday Notice', content: 'Office closed Friday.' }),
      sample({ id: 'b', title: 'Maintenance', content: 'Save your work tonight.' }),
    ]);
    assert.match(track, /Holiday Notice: Office closed Friday\./);
    assert.match(track, /Maintenance: Save your work tonight\./);
    assert.match(track, /•/);
  });

  it('returns empty track text when no announcements', () => {
    assert.equal(buildTickerTrackText([]), '');
  });

  it('computes refetch delay before soonest expiry', () => {
    const serverTime = '2026-06-01T14:00:00.000Z';
    const delay = computeTickerRefetchDelayMs(
      [sample({ end_date: '2026-06-01T14:05:00.000Z' })],
      serverTime,
      Date.parse(serverTime),
    );
    assert.equal(delay, 60_000);
    assert.ok(delay >= 2_000);
  });

  it('uses fallback interval when no scheduled expiry', () => {
    assert.equal(computeTickerRefetchDelayMs([sample()], '2026-06-01T14:00:00.000Z'), 60_000);
  });

  it('derives animation duration from segment count', () => {
    const one = tickerAnimationDurationSeconds(1);
    const three = tickerAnimationDurationSeconds(3);
    assert.ok(three > one);
    assert.equal(one, 12);
  });
});

describe('announcement ticker display contract', () => {
  it('headline includes both title and body without arbitrary truncation', () => {
    const headline = formatAnnouncementHeadline(
      sample({
        title: 'Company Update',
        content: 'New attendance policy is effective from Monday. Please review your shift timings.',
      }),
    );
    assert.match(headline, /Company Update:/);
    assert.match(headline, /New attendance policy is effective from Monday/);
    assert.equal(headline.includes('…'), false);
  });

  it('ticker track does not include view-all or carousel markers', () => {
    const track = buildTickerTrackText([sample(), sample({ id: 'ann-2', title: 'Second' })]);
    assert.equal(track.includes('View all'), false);
    assert.equal(track.includes('9 / 10'), false);
  });
});
