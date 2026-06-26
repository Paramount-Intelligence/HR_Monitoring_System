'use client';

import { BarChart3 } from 'lucide-react';
import { TeamPerformanceReportsView } from '@/components/reports/TeamPerformanceReportsView';

interface HRReportsPageProps {
  role?: 'hr' | 'admin';
}

export default function HRReportsPage({ role = 'hr' }: HRReportsPageProps) {
  const isAdmin = role === 'admin';
  return (
    <TeamPerformanceReportsView
      title={isAdmin ? 'Admin Reports' : 'HR Reports'}
      subtitle={
        isAdmin
          ? 'Organization-wide performance and activity metrics for all active users'
          : 'Organizational performance and activity metrics for all active employees'
      }
      icon={BarChart3}
      tableTitle={isAdmin ? 'Organization Performance' : 'Organization Performance'}
      shell={(content) => (
        <div className="space-y-10 pb-20 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)] p-4 md:p-8">
          {content}
        </div>
      )}
    />
  );
}
