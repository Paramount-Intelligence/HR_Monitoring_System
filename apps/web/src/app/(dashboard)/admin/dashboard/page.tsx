'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { dashboardApi } from '@/lib/api/dashboard';
import { meetingsApi } from '@/lib/api/meetings';
import { supportApi } from '@/lib/api/support';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeletons';
import { RefreshCcw, Sparkles } from 'lucide-react';
import { AdminDashboardTabs, AdminDashboardTabId } from '@/components/admin/dashboard/AdminDashboardTabs';
import { AdminOverviewTab } from '@/components/admin/dashboard/AdminOverviewTab';
import { AdminUserManagementTab } from '@/components/admin/dashboard/AdminUserManagementTab';
import { AdminCommunicationTab } from '@/components/admin/dashboard/AdminCommunicationTab';
import { AdminProjectTasksTab } from '@/components/admin/dashboard/AdminProjectTasksTab';
import { AdminTabError } from '@/components/admin/dashboard/AdminTabError';
import { Meeting } from '@/lib/api/meetings';
import {
  CommunicationAnalyticsData,
  ProjectsTasksAnalyticsData,
  UsersAnalyticsData,
} from '@/lib/admin-dashboard/types';
import { useRealtimeEvent, useRealtimeReconnect, useRealtimeStatus } from '@/hooks/useRealtime';
import { parseAdminDashboardTab } from '@/lib/navigation/admin-profile-nav';

const MEETING_POLL_CONNECTED_MS = 90000;
const MEETING_POLL_FALLBACK_MS = 45000;

const initialTabState = () => ({ data: null, loading: false, error: null as string | null });

function isValidOverviewResponse(value: unknown): value is { kpis: Record<string, unknown> } {
  return Boolean(value && typeof value === 'object' && 'kpis' in value && (value as { kpis?: unknown }).kpis);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AdminDashboardTabId>(() =>
    parseAdminDashboardTab(searchParams.get('tab')),
  );
  const [overviewData, setOverviewData] = useState<any>(null);
  const [usersState, setUsersState] = useState(initialTabState() as {
    data: UsersAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [commState, setCommState] = useState(initialTabState() as {
    data: CommunicationAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [projectsState, setProjectsState] = useState(initialTabState() as {
    data: ProjectsTasksAnalyticsData | null;
    loading: boolean;
    error: string | null;
  });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  useEffect(() => {
    const tabFromUrl = parseAdminDashboardTab(searchParams.get('tab'));
    setActiveTab(tabFromUrl);
  }, [searchParams]);

  const handleTabChange = useCallback(
    (tab: AdminDashboardTabId) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const loadMeetings = useCallback(async () => {
    try {
      setMeetingsLoading(true);
      const [all, upcoming, today] = await Promise.all([
        meetingsApi.getMeetings('all'),
        meetingsApi.getUpcomingMeetings(),
        meetingsApi.getTodayMeetings('all'),
      ]);
      const merged = new Map<string, Meeting>();
      [...(all || []), ...(upcoming || []), ...(today || [])].forEach((m) => merged.set(m.id, m));
      setMeetings(Array.from(merged.values()));
    } catch {
      setMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, []);

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    const [analyticsRes, ticketsRes] = await Promise.allSettled([
      dashboardApi.getAdminAnalytics(),
      supportApi.getTickets(),
    ]);

    if (analyticsRes.status === 'fulfilled' && isValidOverviewResponse(analyticsRes.value)) {
      setOverviewData(analyticsRes.value);
    } else {
      const msg =
        analyticsRes.status === 'rejected'
          ? getErrorMessage(analyticsRes.reason)
          : 'Invalid analytics response';
      setOverviewData(null);
      setOverviewError(msg);
      if (process.env.NODE_ENV === 'development') {
        console.error('[AdminDashboard] overview-analytics', msg);
      }
    }

    if (ticketsRes.status === 'fulfilled') {
      setTickets(ticketsRes.value || []);
    } else if (process.env.NODE_ENV === 'development') {
      console.error('[AdminDashboard] tickets', getErrorMessage(ticketsRes.reason));
    }

    setOverviewLoading(false);
  }, []);

  const loadUsersTab = useCallback(async () => {
    setUsersState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getUsersAnalytics();
      setUsersState({ data, loading: false, error: null });
    } catch (e) {
      const msg = getErrorMessage(e);
      if (process.env.NODE_ENV === 'development') console.error('[AdminDashboard] users-analytics', msg);
      setUsersState({ data: null, loading: false, error: msg });
    }
  }, []);

  const loadCommTab = useCallback(async () => {
    setCommState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getCommunicationAnalytics();
      setCommState({ data, loading: false, error: null });
      loadMeetings();
    } catch (e) {
      const msg = getErrorMessage(e);
      if (process.env.NODE_ENV === 'development') console.error('[AdminDashboard] communication-analytics', msg);
      setCommState({ data: null, loading: false, error: msg });
    }
  }, [loadMeetings]);

  const loadProjectsTab = useCallback(async () => {
    setProjectsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await dashboardApi.getProjectsTasksAnalytics();
      setProjectsState({ data, loading: false, error: null });
    } catch (e) {
      const msg = getErrorMessage(e);
      if (process.env.NODE_ENV === 'development') console.error('[AdminDashboard] projects-tasks-analytics', msg);
      setProjectsState({ data: null, loading: false, error: msg });
    }
  }, []);

  const loadTabData = useCallback(
    (tab: AdminDashboardTabId, force = false) => {
      if (tab === 'users') {
        if (force || !usersState.data) loadUsersTab();
      } else if (tab === 'communication') {
        if (force || !commState.data) loadCommTab();
      } else if (tab === 'projects') {
        if (force || !projectsState.data) loadProjectsTab();
      }
    },
    [usersState.data, commState.data, projectsState.data, loadUsersTab, loadCommTab, loadProjectsTab]
  );

  const loadData = useCallback(async () => {
    setIsBootLoading(true);
    await Promise.allSettled([loadOverview(), loadMeetings()]);
    setIsBootLoading(false);
  }, [loadOverview, loadMeetings]);

  const handleRefreshAll = useCallback(async () => {
    await loadOverview();
    await loadMeetings();
    loadTabData(activeTab, true);
  }, [loadOverview, loadMeetings, loadTabData, activeTab]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const { isConnected } = useRealtimeStatus();

  useRealtimeEvent(
    [
      'dashboard_refresh_hint',
      'meeting_created',
      'meeting_updated',
      'meeting_deleted',
      'announcement_created',
      'task_assigned',
      'task_updated',
      'task_completed',
    ],
    (ev) => {
      const scope = ev.payload?.scope as string | undefined;
      if (ev.type === 'dashboard_refresh_hint') {
        if (scope === 'communication' && activeTab === 'communication') {
          loadCommTab();
          loadMeetings();
        } else if (scope === 'tasks' && activeTab === 'projects') {
          loadProjectsTab();
        } else if (!scope) {
          void loadOverview();
        }
        return;
      }
      if (ev.type.startsWith('meeting_') || ev.type.startsWith('announcement_')) {
        loadMeetings();
        if (activeTab === 'communication') loadCommTab();
      }
      if (ev.type.startsWith('task_') && activeTab === 'projects') {
        loadProjectsTab();
      }
    },
    [activeTab]
  );

  useRealtimeReconnect(() => {
    handleRefreshAll();
  });

  useEffect(() => {
    if (activeTab !== 'overview') {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  useEffect(() => {
    if (activeTab !== 'communication') return;
    const pollMs = isConnected ? MEETING_POLL_CONNECTED_MS : MEETING_POLL_FALLBACK_MS;
    const interval = setInterval(loadMeetings, pollMs);
    return () => clearInterval(interval);
  }, [activeTab, loadMeetings, isConnected]);

  if (isBootLoading) {
    return (
      <div className="space-y-6 pb-20 max-w-[1600px] mx-auto">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-16 max-w-[1600px] mx-auto animate-in fade-in duration-700 text-[var(--text-primary)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[var(--accent-primary)]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">PIMS Enterprise Command Center</span>
          </div>
          <h1 className="app-page-title">Admin Governance Dashboard</h1>
          <p className="app-page-subtitle uppercase tracking-wide opacity-70">
            Real-time Systems Health & Workspace Roster Governance
          </p>
        </div>
        <Button
          onClick={() => void handleRefreshAll()}
          variant="outline"
          size="sm"
          className="rounded-lg border-[var(--border-default)] bg-[var(--bg-elevated)]"
        >
          <RefreshCcw className="mr-2 h-3.5 w-3.5" /> Refresh Sync
        </Button>
      </div>

      <AdminDashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

      <div className="pt-2">
        {activeTab === 'overview' && (
          overviewLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-2xl" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-2xl" />
            </div>
          ) : overviewError || !overviewData ? (
            <AdminTabError
              tabName="dashboard overview"
              message={
                overviewError ||
                'Unable to load dashboard overview. Please refresh or contact support.'
              }
              onRetry={() => void loadOverview()}
            />
          ) : (
            <AdminOverviewTab
              data={overviewData}
              tickets={tickets}
              meetings={meetings}
              onRefresh={handleRefreshAll}
            />
          )
        )}
        {activeTab === 'users' && (
          <AdminUserManagementTab
            data={usersState.data}
            loading={usersState.loading}
            error={usersState.error}
            onRetry={() => loadUsersTab()}
          />
        )}
        {activeTab === 'communication' && (
          <AdminCommunicationTab
            data={commState.data}
            meetings={meetings}
            meetingsLoading={meetingsLoading}
            onRefreshMeetings={loadMeetings}
            loading={commState.loading}
            error={commState.error}
            onRetry={() => loadCommTab()}
          />
        )}
        {activeTab === 'projects' && (
          <AdminProjectTasksTab
            data={projectsState.data}
            loading={projectsState.loading}
            error={projectsState.error}
            onRetry={() => loadProjectsTab()}
          />
        )}
      </div>
    </div>
  );
}
