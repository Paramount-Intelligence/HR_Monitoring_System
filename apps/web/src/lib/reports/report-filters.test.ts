import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTeamPerformanceParams,
  defaultReportFilters,
  formatEodStatusLabel,
  periodLabel,
} from '@/lib/reports/report-filters';

describe('report filters', () => {
  it('builds daily API params', () => {
    const params = buildTeamPerformanceParams({
      ...defaultReportFilters(),
      period: 'daily',
      anchorDate: '2026-06-26',
      search: '',
      role: '',
    });
    assert.equal(params.period, 'daily');
    assert.equal(params.date, '2026-06-26');
    assert.equal(params.start_date, undefined);
  });

  it('builds custom range params', () => {
    const params = buildTeamPerformanceParams({
      ...defaultReportFilters(),
      period: 'custom',
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      search: 'alice',
      role: '',
    });
    assert.equal(params.period, 'custom');
    assert.equal(params.start_date, '2026-06-01');
    assert.equal(params.end_date, '2026-06-15');
    assert.equal(params.search, 'alice');
  });

  it('formats eod status labels without ids', () => {
    assert.equal(formatEodStatusLabel('submitted'), 'Submitted');
    assert.equal(formatEodStatusLabel('3/5 submitted'), '3/5 EOD days');
  });

  it('labels report periods', () => {
    assert.equal(periodLabel('daily'), 'Daily');
    assert.equal(periodLabel('custom'), 'Custom Range');
  });

  it('includes pagination params', () => {
    const params = buildTeamPerformanceParams({
      ...defaultReportFilters(),
      period: 'weekly',
      page: 2,
      pageSize: 50,
      search: '',
      role: '',
    });
    assert.equal(params.page, 2);
    assert.equal(params.page_size, 50);
  });
});
