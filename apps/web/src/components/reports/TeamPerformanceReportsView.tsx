'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Users, type LucideIcon } from 'lucide-react';
import { reportsApi, TeamPerformanceReport } from '@/lib/api/reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/api/client';
import {
  buildTeamPerformanceParams,
  defaultReportFilters,
  type ReportFilterState,
  type ReportPeriod,
} from '@/lib/reports/report-filters';
import { ReportFilters, applyPeriodChange } from '@/components/reports/ReportFilters';
import { ReportSummaryCards } from '@/components/reports/ReportSummaryCards';
import { TeamPerformanceTable } from '@/components/reports/TeamPerformanceTable';

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export interface TeamPerformanceReportsViewProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tableTitle?: string;
  tableDescription?: string;
  headerActions?: ReactNode;
  shell?: (content: ReactNode) => ReactNode;
}

export function TeamPerformanceReportsView({
  title,
  subtitle,
  icon: Icon,
  tableTitle = 'Team Performance',
  tableDescription,
  headerActions,
  shell,
}: TeamPerformanceReportsViewProps) {
  const [filters, setFilters] = useState<ReportFilterState>(defaultReportFilters);
  const [report, setReport] = useState<TeamPerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search, 300);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const updateFilters = useCallback((next: ReportFilterState | ((current: ReportFilterState) => ReportFilterState)) => {
    setFilters((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (
        resolved.period !== current.period ||
        resolved.anchorDate !== current.anchorDate ||
        resolved.startDate !== current.startDate ||
        resolved.endDate !== current.endDate ||
        resolved.search !== current.search ||
        resolved.role !== current.role
      ) {
        return { ...resolved, page: 1 };
      }
      return resolved;
    });
  }, []);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await reportsApi.getTeamPerformance(
        buildTeamPerformanceParams(queryFilters) as Parameters<typeof reportsApi.getTeamPerformance>[0],
      );
      setReport(data);
    } catch (error) {
      toast.error(getErrorMessage(error));
      setReport(null);
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await reportsApi.exportTeamPerformance(
        buildTeamPerformanceParams(queryFilters) as Parameters<typeof reportsApi.exportTeamPerformance>[0],
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `team-performance-${report?.start_date || 'export'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsExporting(false);
    }
  };

  const totalCount = report?.total_count ?? 0;
  const page = report?.page ?? filters.page;
  const pageSize = report?.page_size ?? filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const canExport = !isLoading && !loadError && (report?.rows.length ?? 0) > 0;

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 text-[var(--accent-primary)] mb-1.5">
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Reports</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">{title}</h1>
          <p className="text-sm font-semibold text-[var(--text-muted)]">{subtitle}</p>
        </div>
        <ReportFilters
          filters={filters}
          onChange={updateFilters}
          onPeriodChange={(period) => updateFilters((current) => applyPeriodChange(current, period))}
          onExport={() => void handleExport()}
          isExporting={isExporting}
          isLoading={isLoading}
          canExport={canExport}
        />
        {headerActions}
      </div>

      <ReportSummaryCards
        summary={loadError ? null : report?.summary}
        period={filters.period}
        isLoading={isLoading}
        loadError={loadError}
      />

      <Card className="rounded-[2.5rem] shadow-[var(--shadow-soft)] border-none bg-[var(--bg-surface)] overflow-hidden text-[var(--text-primary)]">
        <CardHeader className="px-10 pt-10 pb-6 border-b border-[var(--border-subtle)]">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-3">
            <Users className="h-6 w-6 text-[var(--accent-primary)]" />
            {tableTitle}
          </CardTitle>
          <CardDescription className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-tight mt-1">
            {tableDescription ||
              (report
                ? `${format(new Date(report.start_date), 'dd MMM yyyy')} – ${format(new Date(report.end_date), 'dd MMM yyyy')}`
                : 'Performance data from live source records')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TeamPerformanceTable
            report={report}
            rows={report?.rows ?? []}
            isLoading={isLoading}
            loadError={loadError}
          />
          {!isLoading && !loadError && totalCount > pageSize && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-10 py-5 border-t border-[var(--border-subtle)]">
              <p className="text-xs font-semibold text-[var(--text-muted)]">
                Showing {rangeStart}–{rangeEnd} of {totalCount} team members
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page <= 1}
                  onClick={() => updateFilters({ ...filters, page: page - 1 })}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-xs font-bold text-[var(--text-muted)] px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  disabled={page >= totalPages}
                  onClick={() => updateFilters({ ...filters, page: page + 1 })}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return shell ? shell(content) : content;
}
