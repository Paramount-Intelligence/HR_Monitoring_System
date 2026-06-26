import { format, startOfMonth } from 'date-fns';
import { Download, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReportFilterState, ReportPeriod } from '@/lib/reports/report-filters';

interface ReportFiltersProps {
  filters: ReportFilterState;
  onChange: (next: ReportFilterState) => void;
  onPeriodChange: (period: ReportPeriod) => void;
  onExport: () => void;
  isExporting?: boolean;
  isLoading?: boolean;
  canExport?: boolean;
}

export function ReportFilters({
  filters,
  onChange,
  onPeriodChange,
  onExport,
  isExporting,
  isLoading,
  canExport = true,
}: ReportFiltersProps) {
  return (
    <div className="flex flex-col xl:flex-row items-stretch xl:items-center gap-3 w-full xl:w-auto">
      <Select value={filters.period} onValueChange={(value) => onPeriodChange(value as ReportPeriod)}>
        <SelectTrigger className="w-full xl:w-[160px] h-12 rounded-2xl bg-[var(--bg-surface)] border-[var(--border-default)] font-bold text-xs uppercase tracking-widest text-[var(--text-primary)] shadow-sm">
          <SelectValue placeholder="Period" />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[var(--shadow-card)]">
          <SelectItem value="daily" className="text-xs font-bold">Daily</SelectItem>
          <SelectItem value="weekly" className="text-xs font-bold">Weekly</SelectItem>
          <SelectItem value="monthly" className="text-xs font-bold">Monthly</SelectItem>
          <SelectItem value="custom" className="text-xs font-bold">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      {filters.period === 'daily' && (
        <Input
          type="date"
          value={filters.anchorDate}
          onChange={(e) => onChange({ ...filters, anchorDate: e.target.value })}
          className="h-12 rounded-2xl w-full xl:w-[180px] font-bold text-xs"
        />
      )}
      {filters.period === 'weekly' && (
        <Input
          type="date"
          value={filters.anchorDate}
          onChange={(e) => onChange({ ...filters, anchorDate: e.target.value })}
          className="h-12 rounded-2xl w-full xl:w-[180px] font-bold text-xs"
          title="Week of"
        />
      )}
      {filters.period === 'monthly' && (
        <Input
          type="month"
          value={filters.anchorDate.slice(0, 7)}
          onChange={(e) => onChange({ ...filters, anchorDate: `${e.target.value}-01` })}
          className="h-12 rounded-2xl w-full xl:w-[180px] font-bold text-xs"
        />
      )}
      {filters.period === 'custom' && (
        <div className="flex gap-2">
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="h-12 rounded-2xl w-full xl:w-[160px] font-bold text-xs"
          />
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="h-12 rounded-2xl w-full xl:w-[160px] font-bold text-xs"
          />
        </div>
      )}

      <div className="relative w-full xl:w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search team member by name, email, role, or department"
          className="h-12 rounded-2xl pl-10 font-semibold text-sm"
        />
      </div>

      <Button
        variant="outline"
        className="h-12 rounded-xl border-[var(--border-default)] font-bold text-xs px-4 bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] transition-all disabled:opacity-50"
        onClick={onExport}
        disabled={isExporting || isLoading || !canExport}
        title={!canExport ? 'No data to export for the current filters.' : undefined}
      >
        {isExporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5 text-[var(--accent-primary)]" />}
        Export Data
      </Button>
    </div>
  );
}

export function applyPeriodChange(current: ReportFilterState, period: ReportPeriod): ReportFilterState {
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    ...current,
    period,
    anchorDate: period === 'monthly' ? format(startOfMonth(new Date()), 'yyyy-MM-dd') : today,
    startDate: today,
    endDate: today,
    page: 1,
  };
}
