import { Clock, AlertTriangle, Users, MapPin } from 'lucide-react';
import { KPICard } from '@/components/dashboard/KPICard';
import type { TeamPerformanceSummary } from '@/lib/api/reports';
import { periodLabel, type ReportPeriod } from '@/lib/reports/report-filters';

interface ReportSummaryCardsProps {
  summary: TeamPerformanceSummary | null | undefined;
  period: ReportPeriod;
  isLoading?: boolean;
  loadError?: boolean;
}

function displayValue(value: number | undefined, showPlaceholder: boolean): string {
  if (showPlaceholder) return '—';
  return String(value ?? 0);
}

export function ReportSummaryCards({ summary, period, isLoading, loadError }: ReportSummaryCardsProps) {
  const showPlaceholder = Boolean(isLoading || loadError);
  const hours = showPlaceholder ? '—' : (summary?.team_hours ?? 0).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KPICard
        title="Team Hours"
        value={hours}
        description={loadError ? 'Unable to load' : `${periodLabel(period)} total`}
        icon={Clock}
        variant="indigo"
      />
      <KPICard
        title="Total Exceptions"
        value={displayValue(summary?.total_exceptions, showPlaceholder)}
        description={loadError ? 'Unable to load' : 'Late + early + absences'}
        icon={AlertTriangle}
        variant={!showPlaceholder && (summary?.total_exceptions ?? 0) > 5 ? 'warning' : 'default'}
      />
      <KPICard
        title="Team Absences"
        value={displayValue(summary?.team_absences, showPlaceholder)}
        description={loadError ? 'Unable to load' : 'Absent days'}
        icon={Users}
        variant={!showPlaceholder && (summary?.team_absences ?? 0) > 0 ? 'danger' : 'default'}
      />
      <KPICard title="Late" value={displayValue(summary?.late_count, showPlaceholder)} description={loadError ? 'Unable to load' : 'Late days'} icon={AlertTriangle} variant="default" />
      <KPICard title="Early" value={displayValue(summary?.early_count, showPlaceholder)} description={loadError ? 'Unable to load' : 'Early checkouts'} icon={Clock} variant="default" />
      <KPICard title="WFH" value={displayValue(summary?.wfh_count, showPlaceholder)} description={loadError ? 'Unable to load' : 'WFH days'} icon={MapPin} variant="default" />
    </div>
  );
}
