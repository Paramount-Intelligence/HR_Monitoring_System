'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { DashboardOverviewUpdatesSection } from '@/components/dashboard/DashboardOverviewUpdatesSection';
import { CompactActionCenter } from '@/components/dashboard/CompactActionCenter';
import { DashboardKpiGrid } from '@/components/dashboard/DashboardKpiGrid';
import { dashboardApi } from '@/lib/api/dashboard';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api/client';
import { organizationTabHref } from '@/lib/navigation/organization-nav';
import { Skeleton } from '@/components/ui/skeletons';

export default function HRDashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await dashboardApi.getAdminSummary();
        setSummary(data);
      } catch (e) {
        toast.error(getErrorMessage(e));
      } finally {
        setIsLoading(false);
      }
    }
    loadSummary();
  }, []);

  return (
    <div className="space-y-4 pb-16 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--accent-primary)]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]">People Operations</span>
        </div>
        <h1 className="app-page-title">HR Dashboard</h1>
        <p className="app-page-subtitle">Global team overview and people operations</p>
      </div>

      <CompactActionCenter role="hr" />

      {isLoading ? (
        <div className="grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <DashboardKpiGrid
          role="hr"
          hrContext={{
            totalEmployees: summary?.total_employees || 0,
            presentToday: summary?.active_today || 0,
            onLeaveToday: summary?.on_leave_today || 0,
            wfhToday: summary?.wfh_today || 0,
            openTickets: summary?.open_tickets || 0,
            upcomingHolidays: summary?.upcoming_holidays || 0,
          }}
        />
      )}

      <DashboardOverviewUpdatesSection
        limit={5}
        announcementsViewAllHref={organizationTabHref('announcements')}
        holidaysViewAllHref={organizationTabHref('holidays')}
      />
    </div>
  );
}
