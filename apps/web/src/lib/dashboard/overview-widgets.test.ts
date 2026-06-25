import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  announcementDisplayTitle,
  formatAnnouncementPreview,
  formatAudienceLabel,
  holidayDisplayName,
  looksLikeUuid,
  pickAnnouncementItems,
  pickHolidayItems,
} from './overview-widgets.ts';
import type { Announcement } from '@/lib/api/announcements';
import type { Holiday } from '@/lib/api/holidays';

const sampleAnnouncement = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: '3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc',
  title: 'Office reopening',
  content: 'Please review the updated hybrid schedule for next week.',
  audience: 'all',
  is_active: true,
  created_at: '2026-06-01T10:00:00Z',
  updated_at: '2026-06-01T10:00:00Z',
  ...overrides,
});

const sampleHoliday = (overrides: Partial<Holiday> = {}): Holiday => ({
  id: 'ae3f8259-201f-434c-aa27-14ad6cbab20f',
  name: 'Independence Day',
  holiday_date: '2026-08-14',
  is_active: true,
  ...overrides,
});

describe('dashboard overview widget helpers', () => {
  it('detects uuid-like strings', () => {
    assert.equal(looksLikeUuid('3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc'), true);
    assert.equal(looksLikeUuid('Office reopening'), false);
  });

  it('formats announcement preview without exposing ids', () => {
    const preview = formatAnnouncementPreview(sampleAnnouncement().content);
    assert.match(preview, /hybrid schedule/);
    assert.doesNotMatch(preview, /3b0b242c/);
  });

  it('uses safe announcement title when title looks like uuid', () => {
    const title = announcementDisplayTitle(
      sampleAnnouncement({ title: '3b0b242c-04f3-4c03-8fdd-1d8b8d226ffc' })
    );
    assert.equal(title, 'Company announcement');
    assert.doesNotMatch(title, /3b0b242c/);
  });

  it('uses safe holiday name when name looks like uuid', () => {
    const name = holidayDisplayName(
      sampleHoliday({ name: 'ae3f8259-201f-434c-aa27-14ad6cbab20f' })
    );
    assert.equal(name, 'Company holiday');
  });

  it('formats audience labels for display', () => {
    assert.equal(formatAudienceLabel('all'), 'All staff');
    assert.equal(formatAudienceLabel('team_lead'), 'Team Lead');
  });

  it('limits announcement and holiday lists for cards', () => {
    const announcements = Array.from({ length: 8 }, (_, i) =>
      sampleAnnouncement({ title: `Announcement ${i + 1}` })
    );
    const holidays = Array.from({ length: 6 }, (_, i) =>
      sampleHoliday({ name: `Holiday ${i + 1}` })
    );
    assert.equal(pickAnnouncementItems(announcements, 5).length, 5);
    assert.equal(pickHolidayItems(holidays, 3).length, 3);
  });
});

describe('dashboard widget display safety', () => {
  it('announcement card title does not display uuid', () => {
    const renderedTitle = announcementDisplayTitle(sampleAnnouncement());
    assert.doesNotMatch(renderedTitle, /3b0b242c/);
  });

  it('holiday card name does not display uuid', () => {
    const renderedName = holidayDisplayName(sampleHoliday());
    assert.doesNotMatch(renderedName, /ae3f8259/);
  });
});
