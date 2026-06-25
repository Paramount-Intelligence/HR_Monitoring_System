'use client';

import { EODReport } from '@/lib/api/eod';
import { EmployeeMetricCard } from '@/components/employee/EmployeeMetricCard';
import { EmployeeMetricGrid } from '@/components/employee/EmployeeMetricGrid';
import { ShieldCheck, TrendingUp, CheckSquare, Clock } from 'lucide-react';
import { displayEodStatus } from '@/lib/eod/eod-form';

interface EodMetricCardsProps {
  eod: EODReport;
}

export function EodMetricCards({ eod }: EodMetricCardsProps) {
  const productivityScore = Number.isFinite(Number(eod.productivity_score))
    ? Math.round(Number(eod.productivity_score))
    : 0;

  return (
    <EmployeeMetricGrid>
      <EmployeeMetricCard title="EOD Status" value={displayEodStatus(eod.status)} icon={ShieldCheck} />
      <EmployeeMetricCard title="Productivity" value={`${productivityScore}/100`} icon={TrendingUp} />
      <EmployeeMetricCard title="Completed Tasks" value={eod.completed_tasks ?? 0} icon={CheckSquare} />
      <EmployeeMetricCard title="Logged Hours" value={`${eod.total_hours ?? 0}h`} icon={Clock} />
    </EmployeeMetricGrid>
  );
}
