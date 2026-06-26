import { endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'custom';

export interface ReportFilterState {
  period: ReportPeriod;
  anchorDate: string;
  startDate: string;
  endDate: string;
  search: string;
  role: string;
  page: number;
  pageSize: number;
}

export function defaultReportFilters(): ReportFilterState {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  return {
    period: 'weekly',
    anchorDate: weekStart,
    startDate: weekStart,
    endDate: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    search: '',
    role: '',
    page: 1,
    pageSize: 50,
  };
}

export function buildTeamPerformanceParams(filters: ReportFilterState): Record<string, string | number> {
  const params: Record<string, string | number> = {
    period: filters.period,
    page: filters.page,
    page_size: filters.pageSize,
  };
  if (filters.period === 'daily' || filters.period === 'weekly' || filters.period === 'monthly') {
    params.date = filters.anchorDate;
  }
  if (filters.period === 'custom') {
    params.start_date = filters.startDate;
    params.end_date = filters.endDate;
  }
  if (filters.search.trim()) params.search = filters.search.trim();
  if (filters.role) params.role = filters.role;
  return params;
}

export function formatEodStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    not_submitted: 'Not submitted',
    submitted: 'Submitted',
    approved: 'Approved',
    rejected: 'Rejected',
    needs_revision: 'Needs revision',
    none: 'None',
    draft: 'Draft',
  };
  if (labels[status]) return labels[status];
  if (status.includes('/')) return status.replace(' submitted', ' EOD days');
  return status.replace(/_/g, ' ');
}

export function periodLabel(period: ReportPeriod): string {
  switch (period) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom Range';
    default:
      return period;
  }
}
