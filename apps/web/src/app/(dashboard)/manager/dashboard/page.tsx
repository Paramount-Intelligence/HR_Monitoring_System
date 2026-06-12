'use client';

import { useCallback, useEffect, useState } from 'react';
import { dashboardApi } from '@/lib/api/dashboard';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeletons';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { ManagerPageShell } from '@/components/manager/ManagerPageShell';
import { ManagerPageHeader } from '@/components/manager/ManagerPageHeader';
import {
  ManagerDashboardTabs,
} from '@/components/manager/dashboard/ManagerDashboardTabs';
import { ManagerOverviewTab } from '@/components/manager/dashboard/ManagerOverviewTab';
import { ManagerTeamTab } from '@/components/manager/dashboard/ManagerTeamTab';
import { ManagerApprovalsTab } from '@/components/manager/dashboard/ManagerApprovalsTab';
import { ManagerProjectsTasksTab } from '@/components/manager/dashboard/ManagerProjectsTasksTab';
import { ManagerEodReportsTab } from '@/components/manager/dashboard/ManagerEodReportsTab';
import {
  ManagerDashboardTabId,
  ManagerOverviewData,
  ManagerTeamAnalyticsData,
  ManagerApprovalsAnalyticsData,
  ManagerEodAnalyticsData,
  ManagerProjectsTasksData,
} from '@/lib/manager-dashboard/types';

const initialTabState = () => ({ data: null, loading: false, error: null as string | null });

export default function ManagerDashboardPage() {
  const [activeTab, setActiveTab] = useState<ManagerDashboardTabId>('overview');
  const [overviewState, setOverviewState] = useState(initialTabState() as {
    data: ManagerOverviewData | null;
    loading: boolean;
    error: string | null;
  });
  const [teamState, setTeamState] = useState(initialTabState() as {
    data: ManagerTeamAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [approvalsState, setApprovalsState] = useState(initialTabState() as {
    data: ManagerApprovalsAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [projectsState, setProjectsState] = useState(initialTabState() as {
    data: ManagerProjectsTasksData | null;
    loading: boolean;
    error: string | null;
  });
  const [eodState, setEodState] = useState(initialTabState() as {
    data: ManagerEodAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [isBootLoading, setIsBootLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setOverviewState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getManagerOverview();
      setOverviewState({ data, loading: false, error: null });
    } catch (e) {
      setOverviewState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadTeam = useCallback(async () => {
    setTeamState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getManagerTeamAnalytics();
      setTeamState({ data, loading: false, error: null });
    } catch (e) {
      setTeamState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    setApprovalsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getManagerApprovalsAnalytics();
      setApprovalsState({ data, loading: false, error: null });
    } catch (e) {
      setApprovalsState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setProjectsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getManagerProjectsTasksAnalytics();
      setProjectsState({ data, loading: false, error: null });
    } catch (e) {
      setProjectsState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadEod = useCallback(async () => {
    setEodState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getManagerEodAnalytics();
      setEodState({ data, loading: false, error: null });
    } catch (e) {
      setEodState({ data: null, loading: false, error: getErrorMessage(e) });
    }
  }, []);

  const loadTabData = useCallback(
    (tab: ManagerDashboardTabId, force = false) => {
      if (tab === 'overview' && (force || !overviewState.data)) loadOverview();
      if (tab === 'team' && (force || !teamState.data)) loadTeam();
      if (tab === 'approvals' && (force || !approvalsState.data)) loadApprovals();
      if (tab === 'projects' && (force || !projectsState.data)) loadProjects();
      if (tab === 'eod' && (force || !eodState.data)) loadEod();
    },
    [loadOverview, loadTeam, loadApprovals, loadProjects, loadEod, overviewState.data, teamState.data, approvalsState.data, projectsState.data, eodState.data]
  );

  const handleRefreshAll = useCallback(async () => {
    await loadOverview();
    loadTabData(activeTab, true);
  }, [loadOverview, loadTabData, activeTab]);

  useEffect(() => {
    loadOverview().finally(() => setIsBootLoading(false));
  }, [loadOverview]);

  useEffect(() => {
    if (!isBootLoading) loadTabData(activeTab);
  }, [activeTab, isBootLoading, loadTabData]);

  if (isBootLoading) {
    return (
      <ManagerPageShell>
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </ManagerPageShell>
    );
  }

  return (
    <ManagerPageShell>
      <ManagerPageHeader
        title="Manager Command Center"
        subtitle="Team operations, approvals, workload, and delivery health"
        actions={
          <Button variant="outline" size="sm" onClick={handleRefreshAll} className="rounded-xl text-xs font-bold">
            <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="flex items-center gap-2 text-[var(--accent-primary)]">
        <Sparkles className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Manager Operations Workspace</span>
      </div>

      <ManagerDashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="pt-2">
        {activeTab === 'overview' && (
          <ManagerOverviewTab
            data={overviewState.data}
            loading={overviewState.loading}
            error={overviewState.error}
            onRetry={loadOverview}
          />
        )}
        {activeTab === 'team' && (
          <ManagerTeamTab data={teamState.data} loading={teamState.loading} error={teamState.error} onRetry={loadTeam} />
        )}
        {activeTab === 'approvals' && (
          <ManagerApprovalsTab
            data={approvalsState.data}
            loading={approvalsState.loading}
            error={approvalsState.error}
            onRetry={loadApprovals}
          />
        )}
        {activeTab === 'projects' && (
          <ManagerProjectsTasksTab
            data={projectsState.data}
            loading={projectsState.loading}
            error={projectsState.error}
            onRetry={loadProjects}
          />
        )}
        {activeTab === 'eod' && (
          <ManagerEodReportsTab data={eodState.data} loading={eodState.loading} error={eodState.error} onRetry={loadEod} />
        )}
      </div>
    </ManagerPageShell>
  );
}
