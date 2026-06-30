import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { EODReport } from '@/lib/api/eod';

/** My EOD must display backend-resolved report_date and shift window, not browser calendar date. */
function eodDisplayUsesBackendContext(eod: EODReport): {
  reportDate: string;
  windowStart: string | undefined;
  windowEnd: string | undefined;
} {
  return {
    reportDate: eod.report_date ?? eod.date,
    windowStart: eod.shift_window_start ?? eod.window_start,
    windowEnd: eod.shift_window_end ?? eod.window_end,
  };
}

describe('EOD business date display contract', () => {
  it('uses backend report_date and shift window fields from API payload', () => {
    const eod: EODReport = {
      id: 'eod-1',
      user_id: 'user-1',
      user_name: 'Test User',
      date: '2026-06-30',
      report_date: '2026-06-30',
      shift_window_start: '2026-06-30T17:00:00+05:00',
      shift_window_end: '2026-07-01T02:00:00+05:00',
      login_time: '2026-06-30T17:10:00+05:00',
      logout_time: null,
      work_mode: 'office',
      total_hours: 8,
      logged_hours: 7.5,
      tasks_worked_on: 2,
      completed_tasks: 1,
      pending_tasks: 1,
      blocked_tasks: 0,
      duties_performed: 3,
      status: 'Generated',
      productivity_score: 80,
      created_at: '2026-07-01T02:03:00+05:00',
      updated_at: '2026-07-01T02:03:00+05:00',
    };

    const display = eodDisplayUsesBackendContext(eod);
    assert.equal(display.reportDate, '2026-06-30');
    assert.match(display.windowStart ?? '', /2026-06-30T17:00:00/);
    assert.match(display.windowEnd ?? '', /2026-07-01T02:00:00/);
  });

  it('does not derive report date from created_at timestamp', () => {
    const eod: EODReport = {
      id: 'eod-2',
      user_id: 'user-1',
      user_name: 'Test User',
      date: '2026-06-30',
      report_date: '2026-06-30',
      login_time: null,
      logout_time: null,
      work_mode: 'office',
      total_hours: 0,
      logged_hours: 0,
      tasks_worked_on: 0,
      completed_tasks: 0,
      pending_tasks: 0,
      blocked_tasks: 0,
      duties_performed: 0,
      status: 'Generated',
      productivity_score: 0,
      created_at: '2026-07-01T02:03:00+05:00',
      updated_at: '2026-07-01T02:03:00+05:00',
    };

    const display = eodDisplayUsesBackendContext(eod);
    assert.notEqual(display.reportDate, '2026-07-01');
    assert.equal(display.reportDate, '2026-06-30');
  });
});
