'use client';

import { ShieldCheck } from 'lucide-react';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { TeamPerformanceReportsView } from '@/components/reports/TeamPerformanceReportsView';

export default function ManagerReportsPage() {
  return (
    <TeamPerformanceReportsView
      title="Team Reports"
      subtitle="Aggregated performance and activity metrics for your direct reports"
      icon={ShieldCheck}
      tableDescription="Performance data for each direct report"
      shell={(content) => <ManagerPageShell>{content}</ManagerPageShell>}
    />
  );
}
