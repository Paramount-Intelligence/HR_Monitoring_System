export type ReportDatePreset = 'week' | 'last_week' | 'month';

export interface ReportDateRange {
  preset: ReportDatePreset;
  start_date: string;
  end_date: string;
  label: string;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function getReportDateRange(preset: ReportDatePreset): ReportDateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (preset === 'week') {
    const start = startOfWeek(today);
    return {
      preset,
      start_date: toIsoDate(start),
      end_date: toIsoDate(today),
      label: 'This week',
    };
  }

  if (preset === 'last_week') {
    const thisWeekStart = startOfWeek(today);
    const start = new Date(thisWeekStart);
    start.setDate(start.getDate() - 7);
    const end = new Date(thisWeekStart);
    end.setDate(end.getDate() - 1);
    return {
      preset,
      start_date: toIsoDate(start),
      end_date: toIsoDate(end),
      label: 'Last week',
    };
  }

  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    preset,
    start_date: toIsoDate(start),
    end_date: toIsoDate(today),
    label: 'This month',
  };
}

export const REPORT_DATE_PRESETS: { key: ReportDatePreset; label: string }[] = [
  { key: 'week', label: 'This week' },
  { key: 'last_week', label: 'Last week' },
  { key: 'month', label: 'This month' },
];
